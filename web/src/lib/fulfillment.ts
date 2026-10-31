import crypto from "node:crypto";
import { env } from "@/lib/env";
import { sendClaimEmail } from "@/lib/notifications";
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

  if (order.needs_claim && !order.claim_sent_at) {
    const { token, digest } = claimToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await admin.from("order_claims").upsert({ order_id: order.order_id, token_digest: digest, expires_at: expiresAt, used_at: null }, { onConflict: "order_id" });
    const claimUrl = `${env.siteUrl}/claim?order=${encodeURIComponent(order.order_id)}&token=${encodeURIComponent(token)}`;
    await sendClaimEmail({ to: order.customer_email, name: order.customer_name, reference: order.order_reference, claimUrl });
    await admin.from("orders").update({ claim_sent_at: new Date().toISOString() }).eq("id", order.order_id);
  }

  return order;
}

export function claimToken() {
  const token = crypto.randomBytes(32).toString("base64url");
  return { token, digest: crypto.createHash("sha256").update(token).digest("hex") };
}

export function digestClaimToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
