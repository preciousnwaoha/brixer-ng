"use client";

import { useState } from "react";
import { CheckCircle2, MoveRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ClaimCard({ order, token }: { order: string; token: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  async function claim() {
    setState("busy");
    const response = await fetch("/api/orders/claim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order, token }) });
    const result = await response.json();
    if (response.ok) { setState("done"); setMessage("The order is now connected to your dashboard."); }
    else { setState("error"); setMessage(result.error ?? "Unable to claim this order."); }
  }
  if (state === "done") return <div className="text-center"><CheckCircle2 className="mx-auto size-14 text-emerald-600" /><h2 className="display-title mt-5 text-3xl font-bold text-primary">Order claimed.</h2><p className="mt-3 text-sm text-muted">{message}</p><Button href="/dashboard" className="mt-7 w-full">Open dashboard <MoveRight className="size-4" /></Button></div>;
  return <div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-secondary">Secure order claim</p><h1 className="display-title mt-3 text-4xl font-bold text-primary">Connect this order.</h1><p className="mt-4 text-sm leading-7 text-muted">For your protection, you must be logged in with the same verified email used at checkout.</p>{message && <p className="mt-5 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">{message}</p>}<Button onClick={claim} disabled={state === "busy"} className="mt-7 w-full">{state === "busy" ? "Verifying…" : "Claim this order"}</Button><Button href={`/login?next=${encodeURIComponent(`/claim?order=${order}&token=${token}`)}`} variant="ghost" className="mt-2 w-full">Use a different account</Button></div>;
}
