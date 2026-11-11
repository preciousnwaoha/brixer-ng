import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { processOutbox } from "@/lib/outbox";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  if (env.demoMode) return NextResponse.json({ processed: 0, sent: 0, unsuccessful: 0, demo: true });
  if (!env.supabaseUrl || !env.supabaseAnonKey || !env.supabaseServiceKey) {
    return NextResponse.json({ error: "Notification delivery is not configured." }, { status: 503 });
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profileError) return NextResponse.json({ error: "Unable to verify administrator access." }, { status: 503 });
    if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const results = await processOutbox();
    const sent = results.filter((result) => result.status === "sent").length;
    return NextResponse.json({ processed: results.length, sent, unsuccessful: results.length - sent });
  } catch {
    return NextResponse.json({ error: "Unable to finish notification delivery. Some messages may already have been sent." }, { status: 500 });
  }
}
