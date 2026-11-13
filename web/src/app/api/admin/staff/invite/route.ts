import { authPath } from "@/lib/auth-routing";
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ email: z.email(), fullName: z.string().min(3).max(100) });

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (env.demoMode) return NextResponse.json({ error: "Preview invitations are disabled." }, { status: 503 });

    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.inviteUserByEmail(input.email, { data: { full_name: input.fullName }, redirectTo: `${env.siteUrl}${authPath("/auth/callback", "team", "/staff")}` });
    if (error || !data.user) throw error ?? new Error("Invitation could not be created.");
    const staffCode = `STF-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const { error: profileError } = await admin.from("profiles").update({ role: "staff", staff_code: staffCode, full_name: input.fullName }).eq("id", data.user.id);
    if (profileError) throw profileError;
    return NextResponse.json({ invited: true, staffCode });
  } catch (error) {
    const message = error instanceof z.ZodError ? "Enter a valid name and email." : error instanceof Error ? error.message : "Unable to invite staff.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
