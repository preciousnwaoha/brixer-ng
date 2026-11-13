import { after } from "next/server";
import { enqueuePhoneOtp, dispatchPhoneOtp } from "./phone-otp";
import { Webhook } from "standardwebhooks";
import { Resend } from "resend";
import { env } from "@/lib/env";
import { loginPortal, portalDestination, passwordSetupPath } from "@/lib/auth-routing";
import { safeNext } from "@/lib/commerce";
import { escapeHtml } from "@/lib/html";
export async function handleAuthHook(request: Request, channel: string) {
  const secret = channel === "email" ? process.env.SUPABASE_EMAIL_HOOK_SECRET : process.env.SUPABASE_SMS_HOOK_SECRET;
  if (!secret || !["email", "sms"].includes(channel)) return Response.json({ error: { http_code: 503, message: "Authentication delivery is not configured." } }, { status: 503 });
  let payload: { user: { id: string; email: string; phone: string; phone_change?: string }; email_data: { token_hash: string; email_action_type: string; redirect_to: string }; sms: { otp: string } };
  try { payload = new Webhook(secret.replace(/^v1,/, "")).verify(await request.text(), Object.fromEntries(request.headers)) as typeof payload; }
  catch { return Response.json({ error: { http_code: 401, message: "Invalid hook signature." } }, { status: 401 }); }
  try {
    if (channel === "email") {
      if (!env.resendKey) throw new Error("Email delivery is not configured.");
      const { email_data: mail, user } = payload;
      const redirect = new URL(mail.redirect_to || env.siteUrl, env.siteUrl);
      const sameOrigin = redirect.origin === new URL(env.siteUrl).origin;
      const portal = loginPortal(sameOrigin ? redirect.searchParams.get("portal") : null);
      const next = sameOrigin ? safeNext(redirect.searchParams.get("next"), portalDestination(portal)) : "/dashboard";
      const link = new URL("/auth/confirm", env.siteUrl);
      link.searchParams.set("token_hash", mail.token_hash); link.searchParams.set("type", mail.email_action_type); link.searchParams.set("portal", portal); link.searchParams.set("next", mail.email_action_type === "recovery" ? passwordSetupPath(portal, next) : next);
      const subject = mail.email_action_type === "recovery" ? "Reset your Brixer password" : "Your secure Brixer sign-in link";
      const { error } = await new Resend(env.resendKey).emails.send({ from: process.env.RESEND_FROM_EMAIL ?? "The Brand Fixer <notifications@mail.brixer.ng>", to: user.email, subject, html: `<h1>${subject}</h1><p>Use this one-time link to continue to Brixer.</p><p><a href="${escapeHtml(link.toString())}">Continue securely</a></p><p>If you did not request this, ignore this email.</p>` }, { idempotencyKey: `auth-${request.headers.get("webhook-id")}`, signal: AbortSignal.timeout(3000) });
      if (error) throw new Error(error.message);
    } else {
      const id = request.headers.get("webhook-id") ?? "";
      const issuedAt = Number(request.headers.get("webhook-timestamp")) * 1000;
      await enqueuePhoneOtp(id, payload.user.phone_change || payload.user.phone, payload.sms.otp, issuedAt);
      after(async () => { try { await dispatchPhoneOtp(id); } catch { console.error("Phone OTP delivery needs a resend."); } });
    }
    return Response.json({});
  } catch (error) { return Response.json({ error: { http_code: 503, message: error instanceof Error ? error.message : "Authentication delivery failed." } }, { status: 503 }); }
}
