import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCatalogue } from "@/lib/catalogue";
import { cartItemsSchema, phoneSchema, quoteCart } from "@/lib/commerce";
import { env } from "@/lib/env";
import { initializePaystack, paymentCallbackUrl } from "@/lib/paystack";
import { createAdminClient } from "@/lib/supabase/admin";
import { setReceiptCookie } from "@/lib/receipt";
import { authenticatedBuyer } from "@/lib/checkout-customer";

const schema = z.object({
  items: cartItemsSchema.optional(), serviceCode: z.string().optional(),
  fullName: z.string().trim().min(3).max(100), email: z.email().max(200).transform((v) => v.toLowerCase()),
  phone: phoneSchema, referralCode: z.string().max(32).optional(), paymentPlan: z.enum(["full", "installment"]),
  whatsappConsent: z.boolean().default(false), idempotencyKey: z.uuid().optional(), expectedTotalKobo: z.number().int().optional(), expectedDueNowKobo: z.number().int().optional()
});
export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const items = input.items ?? (input.serviceCode ? [{ serviceCode: input.serviceCode, quantity: 1 }] : []);
    if (!process.env.PAYSTACK_SECRET_KEY || (!env.demoMode && (!env.supabaseUrl || !env.supabaseAnonKey || !env.supabaseServiceKey))) return NextResponse.json({ error: "Secure payment is currently unavailable. Please try again later." }, { status: 503 });
    if (env.demoMode && !process.env.PAYSTACK_SECRET_KEY.startsWith("sk_test_")) return NextResponse.json({ error: "Only test payments are available in this preview." }, { status: 503 });
    const quote = quoteCart(items, await getCatalogue(), input.paymentPlan);
    if ((input.expectedTotalKobo !== undefined && quote.totalKobo !== input.expectedTotalKobo) || (input.expectedDueNowKobo !== undefined && quote.dueNowKobo !== input.expectedDueNowKobo)) return NextResponse.json({ error: "Service prices changed. Review the updated amounts before paying.", quote }, { status: 409 });
    let reference = `BRX-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
    let checkoutId = crypto.randomUUID() as string;
    let amount = quote.dueNowKobo;
    let authorizationUrl: string | undefined;
    let orderReference = reference;
    const kind = quote.balanceKobo ? "deposit" : "full";
    if (!env.demoMode) {
      const buyer = await authenticatedBuyer();
      const { data, error } = await createAdminClient().rpc("create_checkout", {
        p_id: checkoutId, p_reference: reference, p_key: input.idempotencyKey ?? crypto.randomUUID(),
        p_digest: crypto.createHash("sha256").update(JSON.stringify({ ...input, idempotencyKey: undefined, serviceCode: undefined, items, buyerId: buyer?.user.id ?? null })).digest("hex"),
        p_buyer_id: buyer?.user.id ?? null,
        p_contact: input, p_plan: input.paymentPlan,
        p_items: quote.lines.map((line) => ({ serviceCode: line.service.code, quantity: line.quantity, priceKobo: line.service.priceKobo, dueNowKobo: line.dueNowKobo / line.quantity }))
      });
      if (error) throw error;
      if (!data) throw new Error("Unable to save checkout.");
      if (data.status === "reversed") return NextResponse.json({ error: "This payment was reversed. Contact our team before paying again." }, { status: 409 });
      if (data.status === "succeeded") return NextResponse.json({ error: "This checkout has already been paid. Open your dashboard." }, { status: 409 });
      reference = data.reference; orderReference = data.orderReference ?? reference; checkoutId = data.checkoutId; amount = Number(data.amount); authorizationUrl = data.authorizationUrl;
    }
    if (!authorizationUrl) {
      const paystack = await initializePaystack({ email: input.email, amount, reference, callbackUrl: paymentCallbackUrl(request), metadata: { integration: "brixer", expectedKobo: amount, checkoutId, orderReference, paymentKind: kind } });
      authorizationUrl = paystack.authorization_url;
      if (!env.demoMode) {
        const { error } = await createAdminClient().from("payments").update({ authorization_url: authorizationUrl }).eq("reference", reference);
        if (error) throw new Error("Payment was prepared but could not be saved. Please retry before paying.");
      }
    }
    const response = NextResponse.json({ reference, authorizationUrl });
    setReceiptCookie(response, { reference, checkoutId, lines: quote.lines.map((line) => ({ name: line.service.name, quantity: line.quantity, priceKobo: line.service.priceKobo, timeline: line.service.timeline, paidKobo: line.dueNowKobo, balanceKobo: line.balanceKobo })) });
    return response;
  } catch (error) { return NextResponse.json({ error: error instanceof z.ZodError ? "Please check your checkout details." : error instanceof Error ? error.message : "Unable to initialize checkout." }, { status: 400 }); }
}
