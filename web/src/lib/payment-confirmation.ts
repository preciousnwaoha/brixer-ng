import { env } from "@/lib/env";
import { fulfillPayment } from "@/lib/fulfillment";
import { verifyPaystack } from "@/lib/paystack";

export interface PaymentConfirmation {
  state: "confirmed" | "pending" | "failed";
  orderReference: string;
  isBalance: boolean;
  claimAvailable: boolean;
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
  if (["failed", "reversed", "cancelled"].includes(payment.status)) return { ...result, state: "failed" };
  if (payment.status !== "success") return result;
  if (env.demoMode && payment.domain !== "test") return { ...result, state: "failed" };
  await fulfillPayment({ reference, amount: payment.amount, currency: payment.currency, status: payment.status, providerId: payment.id, payload: payment });
  return { ...result, state: "confirmed", claimAvailable: !result.isBalance && Boolean(env.supabaseUrl && env.supabaseServiceKey) };
}
