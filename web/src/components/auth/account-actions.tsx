"use client";
import { portalDestination, type LoginPortal } from "@/lib/auth-routing";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
export function AccountActions({ mode, initialValue = "", portal = "client", next }: { mode: "recover" | "set-password"; initialValue?: string; portal?: LoginPortal; next?: string }) {
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false); const [value, setValue] = useState(initialValue);
  async function submit(form: FormData) {
    setBusy(true); setMessage("");
    try { const response = await fetch("/api/auth/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: mode, identifier: value, password: form.get("password"), portal, next: next ?? portalDestination(portal) }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); if (result.redirect) window.location.assign(result.redirect); else setMessage(result.message); } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  }
  return <form action={submit} className="mt-7 grid gap-5">{mode === "set-password" ? <TextField label="Set password" name="password" type="password" minLength={8} maxLength={128} autoComplete="new-password" required /> : <TextField label="Email" type="email" value={value} onChange={(event) => setValue(event.target.value)} required />}{message && <p role="status" className="rounded-xl bg-alt-mint p-4 text-sm">{message}</p>}<Button type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "recover" ? "Send recovery link" : "Save password"}</Button></form>;
}
