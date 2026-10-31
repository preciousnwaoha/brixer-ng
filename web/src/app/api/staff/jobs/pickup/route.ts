import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { jobId } = await request.json();
  if (env.demoMode) return NextResponse.json({ pickedUp: jobId, demo: true });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { error } = await supabase.rpc("pickup_job", { p_order_reference: jobId });
  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  return NextResponse.json({ pickedUp: jobId });
}
