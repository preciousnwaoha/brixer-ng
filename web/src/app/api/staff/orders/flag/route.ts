import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { dispatchOrderEvents } from "@/lib/events";
import { requireUser, errorResponse } from "@/lib/access";

const schema = z.object({ orderReference: z.string().min(1), reason: z.string().min(3).max(500) });

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const { supabase } = await requireUser(["admin", "staff"]);
    if (env.demoMode) return NextResponse.json({ error: "Preview jobs are read-only." }, { status: 503 });
    const { error } = await supabase.rpc("flag_order_delay", { p_order_reference: input.orderReference, p_reason: input.reason });
    if (error) return NextResponse.json({ error: error.message }, { status: 409 });
    const { data: order } = await supabase.from("orders").select("id").eq("reference", input.orderReference).single();
    if (order) await dispatchOrderEvents(order.id);
    return NextResponse.json({ flagged: true });
  } catch (error) { return errorResponse(error); }
}
