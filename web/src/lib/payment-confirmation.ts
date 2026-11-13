import { env } from "@/lib/env";
import { fulfillPayment } from "@/lib/fulfillment";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPaystack } from "@/lib/paystack";

export interface PaymentConfirmation {
  state: "confirmed" | "pending" | "failed";
  orderReference: string;
  isBalance: boolean;
  claimAvailable: boolean;
  isFulfillment?: boolean;
}

export async function confirmPayment(reference: string): Promise<PaymentConfirmation> {
  const result: PaymentConfirmation = { state: "pending", orderReference: reference, isBalance: false, claimAvailable: false };
  if (!/^BRX-[A-Z0-9-]{3,100}$/.test(reference)) return { ...result, state: "failed" };
  const payment = await verifyPaystack(reference);
  if (payment.reference !== reference || payment.currency !== "NGN" || !Number.isSafeInteger(payment.amount) || payment.amount <= 0) return { ...result, state: "failed" };
  const metadata = payment.metadata;
  if (!metadata || metadata.integration !== "brixer" || metadata.expectedKobo !== payment.amount) return { ...result, state: "failed" };
  result.orderReference = metadata.orderReference ?? reference;
  result.isBalance = metadata.paymentKind === "balance";
  result.isFulfillment = metadata.paymentKind === "fulfillment";
  if (["failed", "reversed", "cancelled"].includes(payment.status)) {
    if (!env.demoMode && env.supabaseUrl && env.supabaseServiceKey) {
      const { error } = await createAdminClient().from("payments").update({ status: payment.status === "reversed" ? "reversed" : "failed", provider_payload: payment }).eq("reference", reference).in("status", ["initialized", "pending"]);
      if (error) console.error("Unable to record unsuccessful payment status.");
    }
    return { ...result, state: "failed" };
  }
  if (payment.status !== "success") return result;
  if (env.demoMode && payment.domain !== "test") return { ...result, state: "failed" };
  await fulfillPayment({ reference, amount: payment.amount, currency: payment.currency, status: payment.status, providerId: payment.id, payload: payment });
  return { ...result, state: "confirmed", claimAvailable: false };
}
