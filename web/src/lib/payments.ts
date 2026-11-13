import type { PaymentKind } from "@/types";

export function paymentAmount(totalKobo: number, kind: PaymentKind) {
  if (kind === "deposit") return Math.ceil(totalKobo / 2);
  if (kind === "balance") return totalKobo - Math.ceil(totalKobo / 2);
  return totalKobo;
}
