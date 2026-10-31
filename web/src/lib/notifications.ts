import crypto from "node:crypto";
import { Resend } from "resend";
import { env } from "@/lib/env";

export function claimToken() {
  const token = crypto.randomBytes(32).toString("base64url");
  const digest = crypto.createHash("sha256").update(token).digest("hex");
  return { token, digest };
}

export async function sendClaimEmail({ to, name, reference, claimUrl }: { to: string; name: string; reference: string; claimUrl: string }) {
  if (!env.resendKey) return { skipped: true };
  const resend = new Resend(env.resendKey);
  return resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "Brixer <hello@brixer.ng>",
    to,
    subject: `Claim your Brixer order ${reference}`,
    html: `<div style="font-family:Inter,Arial,sans-serif;color:#17201c;max-width:560px;margin:auto;padding:32px"><div style="display:inline-block;background:#1B4332;color:white;border-radius:12px;padding:10px 12px;font-weight:800">Bx</div><h1 style="color:#1B4332;margin-top:28px">Payment received.</h1><p>Hi ${name}, your order <strong>${reference}</strong> is ready to claim. Create or sign in to your Brixer account to complete the application and track every update.</p><a href="${claimUrl}" style="display:inline-block;margin-top:18px;background:#6B3E26;color:white;text-decoration:none;border-radius:12px;padding:14px 22px;font-weight:700">Claim my order</a><p style="margin-top:24px;color:#68736d;font-size:12px">This secure link expires in seven days.</p></div>`
  });
}
