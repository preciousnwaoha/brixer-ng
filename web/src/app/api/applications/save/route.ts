import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ orderId: z.uuid(), answers: z.record(z.string(), z.unknown()), submit: z.boolean().default(false) });

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    if (env.demoMode) return NextResponse.json({ saved: true, demo: true });
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { error } = await supabase.from("applications").upsert({ order_id: input.orderId, answers: input.answers, status: input.submit ? "submitted" : "draft", submitted_at: input.submit ? new Date().toISOString() : null });
    if (error) throw error;
    return NextResponse.json({ saved: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save application" }, { status: 400 }); }
}
