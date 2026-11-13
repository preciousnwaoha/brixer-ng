import { Resend } from "resend";
import { env } from "@/lib/env";
import { escapeHtml } from "@/lib/html";
import { createAdminClient } from "@/lib/supabase/admin";

interface Delivery {
  id: string;
  channel: "email" | "whatsapp";
  destination: string;
  template_key: string;
  payload: Record<string, string>;
  attempt_count: number;
  next_attempt_at: string;
}

const reservationMs = 5 * 60_000;
const deliveryTimeoutMs = 30_000;

async function sendEmail(delivery: Delivery) {
  if (!env.resendKey) throw new Error("Resend is not configured");
  const resend = new Resend(env.resendKey);
  const subject = delivery.payload.subject ?? "An update from Brixer";
  const body = delivery.payload.body ?? "There is a new update in your Brixer dashboard.";
  const { data, error } = await resend.emails.send({ from: process.env.RESEND_FROM_EMAIL ?? "The Brand Fixer <notifications@mail.brixer.ng>", to: delivery.destination, subject, html: `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;padding:32px;color:#17201c"><div style="display:inline-block;padding:10px 12px;border-radius:12px;background:#1B4332;color:white;font-weight:800">Bx</div><h1 style="margin-top:24px;color:#1B4332">${escapeHtml(subject)}</h1><p style="line-height:1.7">${escapeHtml(body)}</p><a href="${env.siteUrl}/dashboard" style="display:inline-block;margin-top:16px;padding:13px 20px;border-radius:12px;background:#6B3E26;color:white;text-decoration:none;font-weight:700">Open dashboard</a></div>` }, { signal: AbortSignal.timeout(deliveryTimeoutMs), idempotencyKey: `brixer-delivery-${delivery.id}` });
  if (error) throw new Error(error.message);
  return data?.id;
}

async function sendWhatsapp(delivery: Delivery) {
  if (!env.whatsappEnabled || !process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) throw new Error("WhatsApp delivery is disabled");
  const version = process.env.WHATSAPP_GRAPH_VERSION ?? "v23.0";
  const response = await fetch(`https://graph.facebook.com/${version}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    signal: AbortSignal.timeout(deliveryTimeoutMs),
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: delivery.destination.replace(/\D/g, ""), type: "template", template: { name: process.env.WHATSAPP_UPDATE_TEMPLATE ?? delivery.template_key, language: { code: "en" }, components: [{ type: "body", parameters: [delivery.payload.subject ?? "Service update", delivery.payload.body ?? "Visit your dashboard"].map((text) => ({ type: "text", text })) }] } })
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message ?? "WhatsApp delivery failed");
  return result.messages?.[0]?.id as string | undefined;
}

export async function processOutbox(notificationIds?: string[]) {
  const admin = createAdminClient();
  let query = admin.from("notification_deliveries").select("*").in("status", ["pending", "retrying"]).lte("next_attempt_at", new Date().toISOString());
  if (notificationIds) {
    if (!notificationIds.length) return [];
    query = query.in("notification_id", notificationIds);
  }
  const { data, error } = await query.order("created_at").limit(25);
  if (error) throw error;
  const results: { id: string; status: "sent" | "failed" }[] = [];
  for (const delivery of (data ?? []) as Delivery[]) {
    // Compare against the selected due time so only one worker can reserve this delivery.
    const reservedUntil = new Date(Date.now() + reservationMs).toISOString();
    const { data: reserved, error: reservationError } = await admin.from("notification_deliveries")
      .update({ next_attempt_at: reservedUntil })
      .eq("id", delivery.id)
      .in("status", ["pending", "retrying"])
      .eq("next_attempt_at", delivery.next_attempt_at)
      .select("id")
      .maybeSingle();
    if (reservationError) throw reservationError;
    if (!reserved) continue;

    const attempts = delivery.attempt_count + 1;
    let status: "sent" | "failed" = "sent";
    let update: Record<string, unknown>;
    try {
      const providerId = delivery.channel === "email" ? await sendEmail(delivery) : await sendWhatsapp(delivery);
      update = { status: "sent", sent_at: new Date().toISOString(), provider_id: providerId ?? null, provider_status: delivery.channel === "whatsapp" ? "sent" : null, attempt_count: attempts, last_error: null };
    } catch (error) {
      status = "failed";
      const retryAt = new Date(Date.now() + Math.min(60, 2 ** attempts) * 60_000).toISOString();
      update = { status: attempts >= 5 ? "failed" : "retrying", attempt_count: attempts, next_attempt_at: retryAt, last_error: error instanceof Error ? error.message : "Delivery failed" };
    }

    // A database failure after sending must not be treated as a provider failure.
    const { data: updated, error: updateError } = await admin.from("notification_deliveries")
      .update(update)
      .eq("id", delivery.id)
      .eq("next_attempt_at", reservedUntil)
      .in("status", ["pending", "retrying"])
      .select("id")
      .maybeSingle();
    if (updateError) throw updateError;
    if (!updated) throw new Error("Notification reservation is no longer held.");
    results.push({ id: delivery.id, status });
  }
  return results;
}
