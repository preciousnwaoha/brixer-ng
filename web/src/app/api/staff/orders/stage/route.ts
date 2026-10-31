import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ orderReference: z.string().min(1), stage: z.enum(["filing", "submitted", "processing", "completed"]), note: z.string().max(500).optional() });

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    if (env.demoMode) return NextResponse.json({ updated: true, demo: true });
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: order, error: orderError } = await supabase.from("orders").select("id").eq("reference", input.orderReference).single();
    if (orderError || !order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    const { error } = await supabase.rpc("advance_order_stage", { p_order_id: order.id, p_stage: input.stage, p_note: input.note ?? null });
    if (error) return NextResponse.json({ error: error.message }, { status: 409 });
    return NextResponse.json({ updated: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update stage." }, { status: 400 });
  }
}
