import { recordOtpWhatsAppStatus } from "@/lib/phone-otp";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
export async function GET(request: Request) {
  const url = new URL(request.url);
  if (process.env.WHATSAPP_VERIFY_TOKEN && url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === process.env.WHATSAPP_VERIFY_TOKEN) return new Response(url.searchParams.get("hub.challenge") ?? "");
  return Response.json({ error: "Verification failed." }, { status: 403 });
}
export async function POST(request: Request) {
  const raw = await request.text(); const signature = request.headers.get("x-hub-signature-256") ?? ""; const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !/^sha256=[a-f0-9]{64}$/i.test(signature)) return Response.json({ error: "Invalid signature." }, { status: 401 });
  const expected = `sha256=${crypto.createHmac("sha256", secret).update(raw).digest("hex")}`;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return Response.json({ error: "Invalid signature." }, { status: 401 });
  try {
    const payload = JSON.parse(raw) as { entry?: { changes?: { value?: { statuses?: { id: string; status: string; errors?: { message: string }[] }[] } }[] }[] };
    const admin = createAdminClient();
    for (const entry of payload.entry ?? []) for (const change of entry.changes ?? []) for (const status of change.value?.statuses ?? []) {
      if (!["sent", "delivered", "read", "failed"].includes(status.status)) continue;
      const { error } = await admin.rpc("record_whatsapp_status", { p_provider_id: status.id, p_status: status.status, p_error: status.errors?.map((e) => e.message).join("; ") ?? null }); if (error) throw error;
      await recordOtpWhatsAppStatus(status.id, status.status);
    }
    return Response.json({ received: true });
  } catch { return Response.json({ error: "Unable to record delivery status." }, { status: 500 }); }
}
