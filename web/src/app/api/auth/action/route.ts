import { phoneOtpAvailable, clearVerifiedOtps } from "@/lib/phone-otp";
import crypto from "node:crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { normalizePhone, safeNext } from "@/lib/commerce";
import { authPath, loginPortal, portalDestination, passwordSetupPath } from "@/lib/auth-routing";
import { requirePortalUser, errorResponse, AccessError } from "@/lib/access";
const schema = z.object({ action: z.enum(["inspect", "link", "password", "recover", "phone", "verify", "set-password", "signout"]), identifier: z.string().max(200).optional(), password: z.string().max(128).optional(), token: z.string().regex(/^\d{6,10}$/).optional(), next: z.string().optional(), portal: z.enum(["client", "team", "staff"]).default("client") });
export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    if (!env.supabaseUrl || !env.supabaseAnonKey || !env.supabaseServiceKey) throw new AccessError("Login is temporarily unavailable. Please try again later.", 503);
    const admin = createAdminClient();
    const supabase = await createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const identifier = input.identifier?.trim().toLowerCase() ?? "";
    const target = crypto.createHash("sha256").update(`${input.action}:${identifier || currentUser?.id || "guest"}`).digest("hex");
    const { data: allowed, error: rateError } = await admin.rpc("auth_attempt", { p_key: target, p_limit: input.action === "inspect" ? 30 : 10 });
    if (rateError) throw new AccessError("Login is temporarily unavailable.", 503);
    if (!allowed) throw new AccessError("Too many attempts. Please wait 15 minutes and try again.", 429);
    const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const { data: addressAllowed, error: addressError } = await admin.rpc("auth_attempt", { p_key: crypto.createHash("sha256").update(`address:${address}`).digest("hex"), p_limit: 100 });
    if (addressError || !addressAllowed) throw new AccessError("Too many login attempts. Please try again later.", 429);
    const portal = loginPortal(input.portal);
    const next = safeNext(input.next, portalDestination(portal));
    const redirectTo = `${env.siteUrl}${authPath("/auth/callback", portal, next)}`;
    const complete = authPath("/auth/complete", portal, next);
    if (input.action === "inspect") {
      const email = z.email().parse(identifier);
      const { data, error } = await admin.rpc("auth_methods", { p_email: email }); if (error) throw error;
      return Response.json({ hasPassword: !!data?.hasPassword });
    }
    if (input.action === "signout") { const { error } = await supabase.auth.signOut(); if (error) throw error; return Response.json({ ok: true }); }
    if (input.action === "link" || input.action === "recover") {
      const email = z.email().parse(identifier);
      const { error } = input.action === "recover" ? await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${env.siteUrl}${authPath("/auth/callback", portal, passwordSetupPath(portal, next))}` }) : await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo, shouldCreateUser: portal === "client" } });
      if (error) throw error;
      return Response.json({ message: "Check your email for a secure link. It can only be used once." });
    }
    if (input.action === "password") {
      const { error } = await supabase.auth.signInWithPassword({ email: z.email().parse(identifier), password: input.password ?? "" }); if (error) throw new Error("Unable to sign in. Check your email and password.");
      await requirePortalUser(portal);
      return Response.json({ redirect: complete });
    }
    if (input.action === "phone") {
      if (!phoneOtpAvailable()) throw new AccessError("Phone login is temporarily unavailable. Use your email or Google.", 503);
      const phone = normalizePhone(identifier);
      const { error } = await supabase.auth.signInWithOtp({ phone, options: { shouldCreateUser: portal === "client" } });
      if (error) throw new Error("Unable to send a login code. Check your number or try email.");
      return Response.json({ otpSent: true, phone });
    }
    if (input.action === "set-password") {
      const { user } = await requirePortalUser(portal);
      if (!user.email_confirmed_at) throw new AccessError("Verify your email first.", 401);
      const password = z.string().min(8).max(128).parse(input.password);
      const { error } = await supabase.auth.updateUser({ password }); if (error) throw error;
      return Response.json({ redirect: complete });
    }
    const phone = normalizePhone(identifier);
    const { data, error } = await supabase.auth.verifyOtp({ phone, token: input.token ?? "", type: "sms" });
    if (error || !data.user) throw new Error("This code is invalid or expired. Request another code.");
    await requirePortalUser(portal);
    try { await clearVerifiedOtps(phone); } catch { console.error("Verified phone login; delivery cleanup will retry on the next request."); }
    if (data.user.phone_confirmed_at) await admin.from("profiles").update({ phone, phone_verified_at: data.user.phone_confirmed_at }).eq("id", data.user.id);
    return Response.json({ redirect: complete });
  } catch (error) { return errorResponse(error instanceof z.ZodError ? new Error("Please check the details you entered.") : error); }
}
