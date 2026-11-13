import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { processOutbox } from "@/lib/outbox";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
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

    if (env.demoMode) return NextResponse.json({ processed: 0, sent: 0, unsuccessful: 0, demo: true });

    let notificationIds: string[] | undefined;
    if (request?.headers.get("content-type")?.includes("application/json")) {
      const input = z.object({ retryId: z.uuid().optional() }).parse(await request.json());
      if (input.retryId) {
        const admin = createAdminClient();
        const { data: current } = await admin.from("notification_deliveries").select("id,status,next_attempt_at,notification_id").eq("id", input.retryId).single();
        if (!current || !["failed", "retrying"].includes(current.status) || (current.status === "retrying" && Date.parse(current.next_attempt_at) > Date.now())) return NextResponse.json({ error: "This message is still reserved or waiting for its retry time. Please try again later." }, { status: 409 });
        const { data: delivery, error } = await admin.from("notification_deliveries").update({ status: "pending", next_attempt_at: new Date().toISOString(), attempt_count: 0, last_error: null }).eq("id", input.retryId).eq("status", current.status).eq("next_attempt_at", current.next_attempt_at).select("notification_id").single();
        if (error || !delivery) return NextResponse.json({ error: "This message is not available for retry." }, { status: 409 });
        notificationIds = [delivery.notification_id];
      }
    }
    const results = await (notificationIds ? processOutbox(notificationIds) : processOutbox());
    const sent = results.filter((result) => result.status === "sent").length;
    return NextResponse.json({ processed: results.length, sent, unsuccessful: results.length - sent });
  } catch {
    return NextResponse.json({ error: "Unable to finish notification delivery. Some messages may already have been sent." }, { status: 500 });
  }
}
