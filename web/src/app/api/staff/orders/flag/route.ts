import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ orderReference: z.string().min(1), reason: z.string().min(3).max(500) });

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    if (env.demoMode) return NextResponse.json({ flagged: true, demo: true });
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { error } = await supabase.rpc("flag_order_delay", { p_order_reference: input.orderReference, p_reason: input.reason });
    if (error) return NextResponse.json({ error: error.message }, { status: 409 });
    return NextResponse.json({ flagged: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to flag delay." }, { status: 400 });
  }
}
