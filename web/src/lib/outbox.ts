import { Resend } from "resend";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

interface Delivery {
  id: string;
  channel: "email" | "whatsapp";
  destination: string;
  template_key: string;
  payload: Record<string, string>;
  attempt_count: number;
}

async function sendEmail(delivery: Delivery) {
  if (!env.resendKey) throw new Error("Resend is not configured");
  const resend = new Resend(env.resendKey);
  const subject = delivery.payload.subject ?? "An update from Brixer";
  const body = delivery.payload.body ?? "There is a new update in your Brixer dashboard.";
  const { data, error } = await resend.emails.send({ from: process.env.RESEND_FROM_EMAIL ?? "Brixer <hello@brixer.ng>", to: delivery.destination, subject, html: `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;padding:32px;color:#17201c"><div style="display:inline-block;padding:10px 12px;border-radius:12px;background:#1B4332;color:white;font-weight:800">Bx</div><h1 style="margin-top:24px;color:#1B4332">${subject}</h1><p style="line-height:1.7">${body}</p><a href="${env.siteUrl}/dashboard" style="display:inline-block;margin-top:16px;padding:13px 20px;border-radius:12px;background:#6B3E26;color:white;text-decoration:none;font-weight:700">Open dashboard</a></div>` });
  if (error) throw new Error(error.message);
  return data?.id;
}

async function sendWhatsapp(delivery: Delivery) {
  if (!env.whatsappEnabled || !process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) throw new Error("WhatsApp delivery is disabled");
  const version = process.env.WHATSAPP_GRAPH_VERSION ?? "v23.0";
  const response = await fetch(`https://graph.facebook.com/${version}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: delivery.destination.replace(/\D/g, ""), type: "template", template: { name: delivery.template_key, language: { code: "en" }, components: [{ type: "body", parameters: Object.values(delivery.payload).map((text) => ({ type: "text", text })) }] } })
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message ?? "WhatsApp delivery failed");
  return result.messages?.[0]?.id as string | undefined;
}

export async function processOutbox() {
  const admin = createAdminClient();
  const { data, error } = await admin.from("notification_deliveries").select("*").in("status", ["pending", "retrying"]).lte("next_attempt_at", new Date().toISOString()).order("created_at").limit(25);
  if (error) throw error;
  const results = [];
  for (const delivery of (data ?? []) as Delivery[]) {
    try {
      const providerId = delivery.channel === "email" ? await sendEmail(delivery) : await sendWhatsapp(delivery);
      await admin.from("notification_deliveries").update({ status: "sent", sent_at: new Date().toISOString(), provider_id: providerId ?? null, attempt_count: delivery.attempt_count + 1 }).eq("id", delivery.id);
      results.push({ id: delivery.id, status: "sent" });
    } catch (error) {
      const attempts = delivery.attempt_count + 1;
      const retryAt = new Date(Date.now() + Math.min(60, 2 ** attempts) * 60_000).toISOString();
      await admin.from("notification_deliveries").update({ status: attempts >= 5 ? "failed" : "retrying", attempt_count: attempts, next_attempt_at: retryAt, last_error: error instanceof Error ? error.message : "Delivery failed" }).eq("id", delivery.id);
      results.push({ id: delivery.id, status: "failed" });
    }
  }
  return results;
}
