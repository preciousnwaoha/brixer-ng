import { env } from "@/lib/env";
import { processOutbox } from "@/lib/outbox";
import { createAdminClient } from "@/lib/supabase/admin";

export async function fulfillPayment(data: { reference: string; amount: number; currency: string; status: string; providerId?: string | number; payload?: unknown }) {
  if (data.status !== "success" || data.currency !== "NGN") throw new Error("Payment was not successful in NGN.");
  if (!env.supabaseUrl || !env.supabaseServiceKey) {
    if (!env.demoMode) throw new Error("Order storage is not configured.");
    return { reference: data.reference, demo: true };
  }

  const admin = createAdminClient();
  const { data: result, error } = await admin.rpc("fulfill_payment", {
    p_reference: data.reference,
    p_amount_kobo: data.amount,
    p_provider_id: data.providerId ? String(data.providerId) : null,
    p_payload: data.payload ?? {}
  });
  if (error) throw error;
  const order = Array.isArray(result) ? result[0] : result;
  if (!order) throw new Error("Payment reference was not found.");

  // Delivery failure must not turn a verified payment into an apparent failure.
  try {
    const { data: payment } = await admin.from("payments").select("id").eq("reference", data.reference).single();
    if (payment) {
      const { data: notice } = await admin.from("notifications").select("id").eq("event_key", `payment:${payment.id}`).maybeSingle();
      if (notice) await processOutbox([notice.id]);
    }
  } catch { console.error("Payment confirmed; notification delivery needs administrator retry."); }

  return order;
}
