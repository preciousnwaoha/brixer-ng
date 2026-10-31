import crypto from "node:crypto";

function secretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("Secure payment is currently unavailable. Please try again later.");
  return key;
}

export function paymentCallbackUrl(request: Request) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  return new URL("/payment/success", origin).toString();
}

export interface PaystackInitializeInput {
  email: string;
  amount: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
}

export async function initializePaystack(input: PaystackInitializeInput) {
  const key = secretKey();
  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email: input.email, amount: String(input.amount), currency: "NGN", reference: input.reference, callback_url: input.callbackUrl, metadata: input.metadata }),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000)
  });
  const result = await response.json();
  if (!response.ok || !result.status) throw new Error(result.message ?? "Paystack initialization failed.");
  const data = result.data as { authorization_url: string; access_code: string; reference: string };
  const checkoutUrl = new URL(data.authorization_url);
  if (checkoutUrl.protocol !== "https:" || checkoutUrl.hostname !== "checkout.paystack.com" || data.reference !== input.reference) throw new Error("Unable to open secure checkout. Please try again.");
  return data;
}

export interface PaystackTransaction {
  id: number;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  domain: "test" | "live";
  metadata: { integration?: string; expectedKobo?: number; orderReference?: string; paymentKind?: string; orderId?: string };
}

export async function verifyPaystack(reference: string) {
  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${secretKey()}` }, cache: "no-store", signal: AbortSignal.timeout(20_000) });
  const result = await response.json();
  if (!response.ok || !result.status) throw new Error(result.message ?? "Payment verification failed.");
  return result.data as PaystackTransaction;
}

export function validPaystackSignature(rawBody: string, signature: string | null) {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key || !signature || !/^[a-f0-9]{128}$/i.test(signature)) return false;
  const hash = crypto.createHmac("sha512", key).update(rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(signature, "hex"));
}
