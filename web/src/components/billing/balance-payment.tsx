"use client";

import { useMutation } from "@tanstack/react-query";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { formatNaira } from "@/lib/utils";

export function BalancePayment({ orderId, reference, totalKobo, paidKobo, collectEmail = false }: { orderId: string; reference: string; totalKobo: number; paidKobo: number; collectEmail?: boolean }) {
  const [email, setEmail] = useState("");
  const outstandingKobo = Math.max(0, totalKobo - paidKobo);
  const payment = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/orders/balance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, ...(collectEmail ? { email } : {}) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to start balance payment");
      if (!result.authorizationUrl) throw new Error("Unable to open secure payment. Please try again.");
      return result as { reference: string; authorizationUrl: string };
    },
    onSuccess: (result) => window.location.assign(result.authorizationUrl)
  });

  return (
    <form onSubmit={(event) => { event.preventDefault(); payment.mutate(); }} className="grid gap-6">
      <div className="rounded-2xl bg-alt-mint p-5">
        <div className="flex items-center justify-between text-sm"><span className="text-muted">Order total</span><strong className="text-primary">{formatNaira(totalKobo)}</strong></div>
        <div className="mt-3 flex items-center justify-between text-sm"><span className="text-muted">Already paid</span><strong className="text-emerald-700">− {formatNaira(paidKobo)}</strong></div>
        <div className="my-4 h-px bg-primary/10" />
        <div className="flex items-center justify-between"><span className="font-extrabold text-primary">Balance due</span><strong className="text-2xl text-secondary">{formatNaira(outstandingKobo)}</strong></div>
      </div>
      {collectEmail && <TextField label="Email address" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />}
      {payment.error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{payment.error.message}</p>}
      <Button type="submit" disabled={payment.isPending || outstandingKobo === 0} className="w-full">{payment.isPending ? "Preparing payment…" : `Pay ${formatNaira(outstandingKobo)} securely`}<ArrowRight className="size-4" /></Button>
      <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted"><LockKeyhole className="size-3" />Paystack securely processes this payment for {reference}.</p>
    </form>
  );
}
