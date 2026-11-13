import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { dispatchOrderEvents } from "@/lib/events";
import { requireUser, errorResponse } from "@/lib/access";

const schema = z.object({ orderReference: z.string().min(1), stage: z.enum(["filing", "submitted", "processing", "completed"]), note: z.string().max(500).optional() });

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const { supabase } = await requireUser(["admin", "staff"]);
    if (env.demoMode) return NextResponse.json({ error: "Preview jobs are read-only." }, { status: 503 });
    const { data: order, error: orderError } = await supabase.from("orders").select("id").eq("reference", input.orderReference).single();
    if (orderError || !order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    const { error } = await supabase.rpc("advance_order_stage", { p_order_id: order.id, p_stage: input.stage, p_note: input.note ?? null });
    if (error) return NextResponse.json({ error: error.message }, { status: 409 });
    const deliveries = await dispatchOrderEvents(order.id);
    return NextResponse.json({ updated: true, notifications: { sent: deliveries.filter((delivery) => delivery.status === "sent").length, unsuccessful: deliveries.filter((delivery) => delivery.status === "failed").length } });
  } catch (error) { return errorResponse(error); }
}
