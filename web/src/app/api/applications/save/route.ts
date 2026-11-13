import { z } from "zod";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizedOrder } from "@/lib/order-access";
import { errorResponse, AccessError } from "@/lib/access";
import { validateAnswers } from "@/lib/application";
import type { ServiceDefinition } from "@/types";
import { dispatchOrderEvents } from "@/lib/events";
const schema = z.object({ orderId: z.uuid(), answers: z.record(z.string(), z.unknown()), submit: z.boolean().default(false) });
export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    if (env.demoMode) throw new AccessError("Preview applications are not saved. Configure a real account to submit.", 503);
    const { order, supabase, user } = await authorizedOrder(input.orderId, "client");
    if (!["paid", "deposit_paid"].includes(order.payment_state)) throw new AccessError("Payment has not been confirmed.", 409);
    const { data: documents, error: docsError } = await supabase.from("documents").select("id,field_id").eq("order_id", order.id).eq("kind", "application");
    if (docsError) throw docsError;
    if (!order.service_snapshot) throw new Error("This service’s requirements need administrator review.");
    const answers = validateAnswers(order.service_snapshot as ServiceDefinition, input.answers, input.submit, documents ?? []);
    const { error } = await createAdminClient().rpc("save_order_application", { p_order_id: order.id, p_actor_id: user.id, p_answers: answers, p_submit: input.submit });
    if (error) throw error;
    if (input.submit) await dispatchOrderEvents(order.id);
    return Response.json({ saved: true });
  } catch (error) { return errorResponse(error); }
}
