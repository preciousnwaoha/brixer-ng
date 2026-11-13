import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { initializePaystack, paymentCallbackUrl } from "@/lib/paystack";
import { clientOrders } from "@/lib/demo-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ orderId: z.string().min(1), email: z.email().optional() });

export async function POST(request: Request) {
  try {
    const { orderId, email } = schema.parse(await request.json());
    if (!process.env.PAYSTACK_SECRET_KEY) return NextResponse.json({ error: "Secure payment is currently unavailable. Please try again later." }, { status: 503 });
    let reference = `BRX-BAL-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    if (env.demoMode) {
      if (!process.env.PAYSTACK_SECRET_KEY.startsWith("sk_test_")) return NextResponse.json({ error: "Only test payments are available in this preview." }, { status: 503 });
      const order = clientOrders.find((item) => item.id === orderId);
      if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
      if (!email) return NextResponse.json({ error: "Enter your email address to continue." }, { status: 400 });
      const amount = order.totalKobo - order.paidKobo;
      if (amount <= 0) return NextResponse.json({ error: "This order has no outstanding balance." }, { status: 409 });
      const paystack = await initializePaystack({ email, amount, reference, callbackUrl: paymentCallbackUrl(request), metadata: { integration: "brixer", expectedKobo: amount, orderReference: order.reference, paymentKind: "balance", preview: true } });
      return NextResponse.json({ reference, authorizationUrl: paystack.authorization_url });
    }
    if (!z.uuid().safeParse(orderId).success) return NextResponse.json({ error: "Invalid order." }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: order, error } = await supabase.from("orders").select("id, reference, customer_email, total_kobo, paid_kobo, user_id, checkout_id").eq("id", orderId).single();
    const { data: allowed, error: accessError } = await supabase.rpc("can_access_customer_order", { p_order_id: orderId });
    if (error || accessError || !order || allowed !== true) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    const amount = Number(order.total_kobo) - Number(order.paid_kobo);
    if (amount <= 0) return NextResponse.json({ error: "This order has no outstanding balance." }, { status: 409 });

    const admin = createAdminClient();
    const { data: prepared, error: paymentError } = await admin.rpc("prepare_balance", { p_order_id: order.id, p_reference: reference });
    if (paymentError || !prepared) throw paymentError ?? new Error("Unable to prepare payment.");
    reference = prepared.reference;
    let authorizationUrl = prepared.authorizationUrl as string | undefined;
    if (!authorizationUrl) {
      const paystack = await initializePaystack({ email: order.customer_email, amount: Number(prepared.amount), reference, callbackUrl: paymentCallbackUrl(request), metadata: { integration: "brixer", expectedKobo: Number(prepared.amount), orderId: order.id, checkoutId: order.checkout_id, orderReference: order.reference, paymentKind: "balance" } });
      authorizationUrl = paystack.authorization_url;
      const { error: saveError } = await admin.from("payments").update({ authorization_url: authorizationUrl }).eq("reference", reference);
      if (saveError) throw saveError;
    }
    return NextResponse.json({ reference, authorizationUrl });
  } catch (error) {
    const message = error instanceof z.ZodError ? "Invalid payment request." : error instanceof Error ? error.message : "Unable to start balance payment.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
