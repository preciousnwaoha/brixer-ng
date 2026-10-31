import type { PaymentKind } from "@/types";

export function paymentAmount(totalKobo: number, kind: PaymentKind) {
  if (kind === "deposit" || kind === "balance") return Math.round(totalKobo / 2);
  return totalKobo;
}

export function canAdvanceFromFiling(paymentPlan: "full" | "installment", paidKobo: number, totalKobo: number) {
  return paymentPlan === "full" || paidKobo >= totalKobo;
}
