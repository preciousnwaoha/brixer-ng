"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function emailAuth(formData: FormData) {
    setBusy(true); setMessage("");
    try {
      const supabase = createClient();
      const email = String(formData.get("email"));
      const password = String(formData.get("password"));
      const result = mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` } });
      if (result.error) throw result.error;
      if (mode === "signup") setMessage("Check your email to confirm your account.");
      else window.location.href = next;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally { setBusy(false); }
  }

  async function googleAuth() {
    setBusy(true); setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` } });
      if (error) throw error;
    } catch (error) { setMessage(error instanceof Error ? error.message : "Google sign-in failed."); setBusy(false); }
  }

  return (
    <div>
      <div className="grid grid-cols-2 rounded-xl bg-alt-mint p-1"><button className={`rounded-lg py-2.5 text-xs font-extrabold ${mode === "login" ? "bg-white text-primary shadow-sm" : "text-muted"}`} onClick={() => setMode("login")}>Log in</button><button className={`rounded-lg py-2.5 text-xs font-extrabold ${mode === "signup" ? "bg-white text-primary shadow-sm" : "text-muted"}`} onClick={() => setMode("signup")}>Create account</button></div>
      <Button type="button" variant="outline" className="mt-6 w-full" onClick={googleAuth} disabled={busy}><span className="text-base font-black text-[#4285F4]">G</span>Continue with Google</Button>
      <div className="my-6 flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-muted"><span className="h-px flex-1 bg-line" />or continue with email<span className="h-px flex-1 bg-line" /></div>
      <form action={emailAuth} className="grid gap-5"><TextField name="email" type="email" label="Email address" autoComplete="email" required placeholder="you@example.com" /><div className="relative"><TextField name="password" type={showPassword ? "text" : "password"} label="Password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required placeholder="At least 8 characters" /><button type="button" className="absolute right-3 top-[38px] grid size-9 place-items-center text-muted" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div>{message && <p role="status" className={`rounded-xl p-3 text-xs font-semibold ${message.startsWith("Check") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{message}</p>}<Button type="submit" disabled={busy} className="w-full">{busy ? "Please wait…" : mode === "login" ? "Log in securely" : "Create my account"}<ArrowRight className="size-4" /></Button></form>
      {process.env.NEXT_PUBLIC_DEMO_MODE !== "false" && <div className="mt-6 rounded-xl border border-dashed border-alt-sage bg-alt-mint p-4 text-center"><p className="text-xs font-bold text-primary">Preview mode</p><div className="mt-3 flex justify-center gap-3 text-xs font-extrabold"><a className="text-secondary underline" href="/dashboard">Client</a><a className="text-secondary underline" href="/staff">Staff</a><a className="text-secondary underline" href="/admin">Admin</a></div></div>}
    </div>
  );
}
