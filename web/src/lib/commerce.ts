import { paymentAmount } from "@/lib/payments";
import { z } from "zod";
import type { ServiceDefinition } from "@/types";

export const cartItemsSchema = z.array(z.object({ serviceCode: z.string().min(1).max(32), quantity: z.number().int().min(1).max(20) })).min(1).max(30);
export type CartItem = z.infer<typeof cartItemsSchema>[number];
export type PaymentPlan = "full" | "installment";
export interface QuoteLine { service: ServiceDefinition; quantity: number; eligible: boolean; totalKobo: number; dueNowKobo: number; balanceKobo: number }
export interface CartQuote { lines: QuoteLine[]; totalKobo: number; dueNowKobo: number; balanceKobo: number; hasInstallments: boolean }

export function installmentEligible(service: Pick<ServiceDefinition, "priceKobo" | "installmentEligible">) {
  return service.installmentEligible && service.priceKobo >= 1_000_000;
}

export function quoteCart(items: CartItem[], catalogue: ServiceDefinition[], plan: PaymentPlan): CartQuote {
  cartItemsSchema.parse(items);
  const quantities = new Map<string, number>();
  for (const item of items) quantities.set(item.serviceCode, (quantities.get(item.serviceCode) ?? 0) + item.quantity);
  let count = 0;
  const lines = [...quantities].map(([code, quantity]) => {
    if (quantity > 20 || (count += quantity) > 50) throw new Error("Please order at most 20 of one service and 50 items per checkout.");
    const service = catalogue.find((entry) => entry.code === code && entry.available);
    if (!service) throw new Error("A selected service is no longer available. Please review your cart.");
    if (!Number.isSafeInteger(service.priceKobo) || service.priceKobo <= 0) throw new Error("Invalid service price.");
    const eligible = installmentEligible(service);
    const totalKobo = service.priceKobo * quantity;
    const dueNowKobo = (plan === "installment" && eligible ? paymentAmount(service.priceKobo, "deposit") : service.priceKobo) * quantity;
    return { service, quantity, eligible, totalKobo, dueNowKobo, balanceKobo: totalKobo - dueNowKobo };
  });
  return { lines, totalKobo: lines.reduce((sum, line) => sum + line.totalKobo, 0), dueNowKobo: lines.reduce((sum, line) => sum + line.dueNowKobo, 0), balanceKobo: lines.reduce((sum, line) => sum + line.balanceKobo, 0), hasInstallments: lines.some((line) => line.eligible) };
}

export function normalizePhone(value: string) {
  let phone = value.trim().replace(/[\s().-]/g, "");
  if (/^0[789]\d{9}$/.test(phone)) phone = `+234${phone.slice(1)}`;
  if (/^234[789]\d{9}$/.test(phone)) phone = `+${phone}`;
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error("Enter a valid phone number, including the country code for numbers outside Nigeria.");
  return phone;
}

export const phoneSchema = z.string().transform((value, context) => {
  try { return normalizePhone(value); } catch (error) { context.addIssue({ code: "custom", message: (error as Error).message }); return z.NEVER; }
});

export function safeNext(value: string | null | undefined, fallback = "/dashboard") {
  return value && /^\/(?!\/)/.test(value) && !/[\\\r\n]/.test(value) ? value : fallback;
}

export function canDownloadOutput(order: { total_kobo: number | string; paid_kobo: number | string; payment_state: string; stage: string }, released: boolean) {
  return released && order.stage === "completed" && order.payment_state === "paid" && Number(order.paid_kobo) >= Number(order.total_kobo);
}
