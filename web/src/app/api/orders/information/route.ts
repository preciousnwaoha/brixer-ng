import { z } from "zod";
import { authorizedOrder } from "@/lib/order-access";
import { errorResponse, AccessError } from "@/lib/access";
import { dispatchOrderEvents } from "@/lib/events";
import { env } from "@/lib/env";
const schema = z.object({ orderId: z.uuid(), id: z.uuid().optional(), label: z.string().min(1).max(200).optional(), description: z.string().max(2000).optional(), inputType: z.enum(["text", "file"]).optional(), status: z.enum(["pending", "resolved"]).optional(), response: z.string().max(10000).optional() });
export async function POST(request: Request) {
  try {
    if (env.demoMode) throw new AccessError("Preview requests are not saved.", 503);
    const input = schema.parse(await request.json());
    const { supabase } = await authorizedOrder(input.orderId);
    if (!input.id && (!input.label || !input.inputType)) throw new Error("Specify the requested information and input type.");
    const { data, error } = await supabase.rpc("change_information_request", { p_id: input.id ?? null, p_order_id: input.orderId, p_label: input.label ?? null, p_description: input.description ?? null, p_type: input.inputType ?? null, p_status: input.status ?? null, p_response: input.response ?? null });
    if (error) throw error; await dispatchOrderEvents(input.orderId);
    return Response.json({ id: data, saved: true });
  } catch (error) { return errorResponse(error); }
}
