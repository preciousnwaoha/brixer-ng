import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { services } from "@/config/services";
import { env } from "@/lib/env";
import { paymentAmount } from "@/lib/payments";
import { initializePaystack, paymentCallbackUrl } from "@/lib/paystack";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  serviceCode: z.string().min(1),
  fullName: z.string().min(3).max(100),
  email: z.email().max(200),
  phone: z.string().min(10).max(24),
  referralCode: z.string().max(32).optional(),
  paymentPlan: z.enum(["full", "installment"]),
  whatsappConsent: z.boolean().default(false)
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const service = services.find((item) => item.code === input.serviceCode && item.available);
    if (!service) return NextResponse.json({ error: "This service is not available." }, { status: 400 });
    if (input.paymentPlan === "installment" && !service.installmentEligible) return NextResponse.json({ error: "Installments are not available for this service." }, { status: 400 });
    if (!process.env.PAYSTACK_SECRET_KEY || (!env.demoMode && (!env.supabaseUrl || !env.supabaseServiceKey))) return NextResponse.json({ error: "Secure payment is currently unavailable. Please try again later." }, { status: 503 });
    if (env.demoMode && !process.env.PAYSTACK_SECRET_KEY.startsWith("sk_test_")) return NextResponse.json({ error: "Only test payments are available in this preview." }, { status: 503 });

    const reference = `BRX-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const kind = input.paymentPlan === "installment" ? "deposit" : "full";
    const amount = paymentAmount(service.priceKobo, kind);
    let orderId = crypto.randomUUID();

    if (env.supabaseUrl && env.supabaseServiceKey) {
      const admin = createAdminClient();
      const { data: order, error: orderError } = await admin.from("orders").insert({
        id: orderId,
        reference,
        service_code: service.code,
        customer_name: input.fullName,
        customer_email: input.email.toLowerCase(),
        customer_phone: input.phone,
        total_kobo: service.priceKobo,
        paid_kobo: 0,
        payment_plan: input.paymentPlan,
        stage: "received",
        payment_state: "pending",
        referral_code_used: input.referralCode || null,
        whatsapp_consent: input.whatsappConsent
      }).select("id").single();
      if (orderError) throw orderError;
      orderId = order.id;
      const { error: paymentError } = await admin.from("payments").insert({ order_id: orderId, reference, kind, expected_kobo: amount, status: "initialized" });
      if (paymentError) throw paymentError;
    }

    const paystack = await initializePaystack({
      email: input.email,
      amount,
      reference,
      callbackUrl: paymentCallbackUrl(request),
      metadata: { integration: "brixer", expectedKobo: amount, orderId, orderReference: reference, serviceCode: service.code, paymentKind: kind }
    });

    return NextResponse.json({ reference, authorizationUrl: paystack.authorization_url });
  } catch (error) {
    const message = error instanceof z.ZodError ? "Please check your checkout details." : error instanceof Error ? error.message : "Unable to initialize checkout.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
