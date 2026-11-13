"use client";
import { useSearchParams } from "next/navigation";
import { GoogleG } from "@/components/ui/google-g";
import { authPath, loginPath, portalDestination, type LoginPortal } from "@/lib/auth-routing";
import { useEffect, useState } from "react";
import { z } from "zod";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/client";
import { normalizePhone, safeNext } from "@/lib/commerce";
async function action(body: object) { const response = await fetch("/api/auth/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); return result; }
export function LoginForm({ portal = "client" }: { portal?: LoginPortal }) {
  const params = useSearchParams(); const next = safeNext(params.get("next"), portalDestination(portal));
  const errorMessage = params.get("error") === "role" ? "This account does not have access to this area. Switch to an account with the required role." : params.get("error") === "configuration" ? "Login is temporarily unavailable. Please try again later." : params.has("error") ? "That sign-in link expired or could not be verified. Please try again." : "";
  const [passwordMode, setPasswordMode] = useState(false); const [identifier, setIdentifier] = useState(""); const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(errorMessage);
  const [otpPhone, setOtpPhone] = useState("");
  const emailValid = z.email().safeParse(identifier.trim()).success;
  let phoneValid = false; try { normalizePhone(identifier); phoneValid = true; } catch { /* Incomplete input. */ }
  useEffect(() => {
    setHasPassword(null); if (!passwordMode || !emailValid) return;
    let active = true; const timer = setTimeout(() => { action({ action: "inspect", identifier, portal }).then((result) => { if (active) setHasPassword(result.hasPassword); }).catch(() => { if (active) setHasPassword(null); }); }, 500);
    return () => { active = false; clearTimeout(timer); };
  }, [identifier, passwordMode, emailValid, portal]);
  async function submit(form: FormData) {
    setBusy(true); setMessage("");
    try {
      const result = await action({ portal, ...(otpPhone ? { action: "verify", identifier: otpPhone, token: form.get("token"), next } : { action: passwordMode ? hasPassword === false ? "link" : "password" : emailValid ? "link" : "phone", identifier, password: form.get("password"), next: passwordMode && hasPassword === false ? authPath("/auth/set-password", portal, next) : next }) });
      if (result.redirect) window.location.assign(result.redirect);
      else if (result.otpSent) { setOtpPhone(result.phone); setMessage("Enter the code sent to your WhatsApp or phone number."); }
      else setMessage(result.message);
    } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  }
  async function google() {
    setBusy(true); setMessage("");
    try { const destination = next; const { error } = await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}${authPath("/auth/callback", portal, destination)}` } }); if (error) throw error; } catch (error) { setMessage((error as Error).message); setBusy(false); }
  }
  return <div>
    <form action={submit} className="grid gap-5">
      {otpPhone ? <><TextField label="Login OTP" name="token" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" required /><button type="button" disabled={busy} onClick={async () => { setBusy(true); setMessage(""); try { await action({ action: "phone", identifier: otpPhone, portal, next }); setMessage("A new code is on its way to your phone."); } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); } }} className="text-sm text-secondary underline">Request another code</button></> : <TextField label={passwordMode ? "Email" : "Email / Phone (WhatsApp)"} type={passwordMode ? "email" : "text"} autoComplete={passwordMode ? "email" : "username"} value={identifier} onChange={(e) => setIdentifier(e.target.value)} required placeholder="you@example.com or 08012345678" />}
      {passwordMode && !otpPhone && <div><TextField label={hasPassword === false ? "Set password" : "Password"} name="password" type="password" minLength={8} required={hasPassword !== false} disabled={hasPassword === false} autoComplete="current-password" placeholder={hasPassword === false ? "We’ll email you a secure setup link" : "Enter your password"} />{hasPassword && <Link href={authPath(`/forgot-password?email=${encodeURIComponent(identifier)}`, portal, next)} className="mt-2 block text-right text-xs font-bold text-secondary">Forgot password?</Link>}</div>}
      {message && <p role="status" className="rounded-xl bg-alt-mint p-4 text-sm leading-6 text-primary">{message}</p>}
      <Button type="submit" disabled={busy || (passwordMode && emailValid && hasPassword === null) || (!otpPhone && !(passwordMode ? emailValid : emailValid || phoneValid))}>{busy ? "Please wait…" : otpPhone ? "Verify login OTP" : passwordMode ? hasPassword === false ? "Get password setup link" : "Log in securely" : emailValid ? "Get login link" : phoneValid ? "Get login OTP" : "Get login link / OTP"}<ArrowRight className="size-4" /></Button>
    </form>
    <div className="my-6 flex items-center gap-3 text-xs font-bold text-muted"><span className="h-px flex-1 bg-line" />OR<span className="h-px flex-1 bg-line" /></div>
    <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={google}><GoogleG />Continue with Google</Button>
    <button type="button" className="mt-4 min-h-11 w-full text-sm font-bold text-secondary" onClick={() => { setPasswordMode(!passwordMode); setOtpPhone(""); setMessage(""); }}>{passwordMode ? "Use only email / phone" : "Use email and password"}</button>
    {(params.get("error") === "role" || message.includes("required role")) && <Button type="button" variant="outline" className="mt-4 w-full" disabled={busy} onClick={async () => { setBusy(true); try { await action({ action: "signout" }); window.location.assign(loginPath(portal)); } catch (error) { setMessage((error as Error).message); setBusy(false); } }}>Switch account</Button>}
  </div>;
}
