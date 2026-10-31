import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ payoutId: z.string().min(1), decision: z.enum(["approved", "rejected"]) });

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    if (env.demoMode) return NextResponse.json({ reviewed: true, demo: true });
    if (!z.uuid().safeParse(input.payoutId).success) return NextResponse.json({ error: "Invalid payout." }, { status: 400 });
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const admin = createAdminClient();
    const { error } = await admin.from("payout_requests").update({ status: input.decision, reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq("id", input.payoutId).eq("status", "requested");
    if (error) throw error;
    return NextResponse.json({ reviewed: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to review payout." }, { status: 400 });
  }
}
