import crypto from "node:crypto";
import { z } from "zod";
import { authorizedOrder } from "@/lib/order-access";
import { requireUser, errorResponse, AccessError } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchOrderEvents } from "@/lib/events";
import { initializePaystack, paymentCallbackUrl } from "@/lib/paystack";
import { env } from "@/lib/env";
const schema = z.object({ action: z.enum(["request", "quote", "pay", "fulfill"]), orderId: z.uuid(), id: z.uuid().optional(), hardCopyOptionId: z.uuid().optional(), deliveryOptionId: z.uuid().optional(), address: z.string().max(1000).default(""), notes: z.string().max(2000).default(""), amountKobo: z.number().int().positive().max(1000000000).optional(), quoteVersion: z.number().int().optional() });
export async function POST(request: Request) {
  try {
    if (env.demoMode) throw new AccessError("Preview fulfillment requests are not saved.", 503);
    const input = schema.parse(await request.json());
    const { supabase, order, profile } = await authorizedOrder(input.orderId, input.action === "request" || input.action === "pay" ? "client" : "operator");
    const admin = createAdminClient();
    if (input.action === "request") {
      if (!["paid", "deposit_paid"].includes(order.payment_state)) throw new Error("Initial service payment is required.");
      const ids = [input.hardCopyOptionId, input.deliveryOptionId].filter(Boolean);
      if (!ids.length) throw new Error("Choose a hard-copy or delivery option.");
      const { data: options, error } = await supabase.from("service_options").select("*").in("id", ids).eq("available", true); if (error) throw error;
      const hardCopy = options?.find((o) => o.id === input.hardCopyOptionId && o.kind === "hard_copy"); const delivery = options?.find((o) => o.id === input.deliveryOptionId && o.kind === "delivery");
      if ((input.hardCopyOptionId && !hardCopy) || (input.deliveryOptionId && !delivery)) throw new Error("An option is no longer available.");
      if (delivery && !input.address.trim()) throw new Error("Provide a delivery address.");
      const { data, error: insertError } = await admin.from("fulfillment_requests").insert({ order_id: order.id, hard_copy_option_id: hardCopy?.id, delivery_option_id: delivery?.id, options_snapshot: { hardCopy: hardCopy?.label, delivery: delivery?.label }, address: input.address, notes: input.notes }).select("id").single(); if (insertError) throw insertError;
      return Response.json({ saved: true, id: data.id });
    }
    if (!input.id) throw new Error("Select a fulfillment request.");
    const { data: fulfillment } = await supabase.from("fulfillment_requests").select("id").eq("id", input.id).eq("order_id", order.id).single(); if (!fulfillment) throw new AccessError("Request not found.", 404);
    if (input.action === "quote" || input.action === "fulfill") {
      if (profile.role !== "admin") throw new AccessError("Administrator access required.", 403);
      if (input.action === "quote" && !input.amountKobo) throw new Error("Enter the quote amount.");
      const { error } = await supabase.rpc("set_fulfillment_quote", { p_id: input.id, p_amount: input.amountKobo ?? null, p_note: input.notes, p_fulfilled: input.action === "fulfill" }); if (error) throw error;
      await dispatchOrderEvents(order.id); return Response.json({ saved: true });
    }
    await requireUser();
    if (!process.env.PAYSTACK_SECRET_KEY) throw new AccessError("Payment is not configured.", 503);
    const reference = `BRX-COPY-${crypto.randomBytes(12).toString("hex").toUpperCase()}`;
    const { data: prepared, error } = await admin.rpc("prepare_fulfillment_payment", { p_id: input.id, p_version: input.quoteVersion, p_reference: reference }); if (error) throw error;
    let authorizationUrl = prepared.authorizationUrl;
    if (!authorizationUrl) {
      const paystack = await initializePaystack({ email: prepared.email, amount: Number(prepared.amount), reference: prepared.reference, callbackUrl: paymentCallbackUrl(request), metadata: { integration: "brixer", expectedKobo: Number(prepared.amount), orderReference: prepared.orderReference, paymentKind: "fulfillment" } }); authorizationUrl = paystack.authorization_url;
      const { error: saved } = await admin.from("payments").update({ authorization_url: authorizationUrl }).eq("reference", prepared.reference); if (saved) throw saved;
    }
    return Response.json({ authorizationUrl, reference: prepared.reference });
  } catch (error) { return errorResponse(error); }
}
