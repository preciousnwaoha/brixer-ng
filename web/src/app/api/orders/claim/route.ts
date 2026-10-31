import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { digestClaimToken } from "@/lib/fulfillment";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ order: z.uuid(), token: z.string().min(20) });

export async function POST(request: Request) {
  if (env.demoMode) return NextResponse.json({ claimed: true, demo: true });
  try {
    const input = schema.parse(await request.json());
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return NextResponse.json({ error: "Log in before claiming this order." }, { status: 401 });
    const { error } = await supabase.rpc("claim_order", { p_order_id: input.order, p_token_digest: digestClaimToken(input.token), p_email: user.email.toLowerCase() });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ claimed: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid claim request." }, { status: 400 });
  }
}
