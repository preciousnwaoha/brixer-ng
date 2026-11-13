"use client";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, CreditCard, LockKeyhole } from "lucide-react";
import { useRef, useState } from "react";
import type { ServiceDefinition } from "@/types";
import { formatNaira } from "@/lib/utils";
import { normalizePhone, type CartQuote, type PaymentPlan } from "@/lib/commerce";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { useCart } from "@/components/cart/cart-provider";
import type { CheckoutContact } from "@/lib/checkout-customer";
export function CheckoutForm({ service, customer = {}, buyerId }: { service?: ServiceDefinition; customer?: CheckoutContact; buyerId?: string }) {
  const cart = useCart();
  const items = service ? [{ serviceCode: service.code, quantity: 1 }] : cart.items;
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlan>("full");
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);
  const key = useRef<{ body: string; key: string } | null>(null);
  const { data: quote, error, isFetching, refetch } = useQuery<CartQuote>({ queryKey: ["checkout-quote", items, paymentPlan], enabled: !!items.length && (cart.ready || !!service), queryFn: async () => {
    const response = await fetch("/api/cart/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items, paymentPlan }) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error); return data;
  } });
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setServerError(""); setBusy(true);
    try {
      if (!quote) throw new Error("Please wait for your service prices.");
      const form = Object.fromEntries(new FormData(event.currentTarget));
      const values = { ...form, phone: normalizePhone(String(form.phone)), items, paymentPlan, whatsappConsent: form.whatsappConsent === "on", expectedTotalKobo: quote.totalKobo, expectedDueNowKobo: quote.dueNowKobo };
      const body = JSON.stringify({ ...values, buyerScope: buyerId ?? "guest" });
      if (!key.current || key.current.body !== body) {
        try { const saved = JSON.parse(sessionStorage.getItem("brixer-payment-intent") ?? "null"); if (saved?.body === body && typeof saved.key === "string") key.current = saved; } catch { /* Create a new checkout key. */ }
        if (!key.current || key.current.body !== body) key.current = { body, key: crypto.randomUUID() };
        try { sessionStorage.setItem("brixer-payment-intent", JSON.stringify(key.current)); } catch { /* The current page retains its key. */ }
      }
      const response = await fetch("/api/checkout/initialize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, idempotencyKey: key.current.key }) });
      const result = await response.json();
      if (!response.ok) { if (response.status === 409) await refetch(); throw new Error(result.error ?? "Unable to start payment"); }
      if (!result.authorizationUrl) throw new Error("Unable to open secure payment.");
      try { sessionStorage.setItem("brixer-checkout", JSON.stringify({ reference: result.reference, items })); } catch { /* Receipt remains available. */ }
      window.location.assign(result.authorizationUrl);
    } catch (error) { setServerError(error instanceof Error ? error.message : "Unable to start payment"); } finally { setBusy(false); }
  }
  if (!cart.ready && !service) return <p role="status">Loading your cart…</p>;
  if (!items.length) return <div><p>Your cart is empty.</p><Button href="/#services" className="mt-5">Browse services</Button></div>;
  return <form onSubmit={submit} className="grid gap-6">
    <h2 className="font-extrabold text-primary">Contact details</h2>
    <div className="grid gap-5 sm:grid-cols-2"><TextField name="fullName" defaultValue={customer.fullName ?? ""} label="Full name" required minLength={3} maxLength={100} autoComplete="name" placeholder="Chidi Johnson" /><TextField name="email" defaultValue={customer.email ?? ""} label="Contact Email" type="email" required autoComplete="email" placeholder="you@example.com" /></div>
    <div className="grid gap-5 sm:grid-cols-2"><TextField name="phone" defaultValue={customer.phone ?? ""} label="Phone / WhatsApp number" required autoComplete="tel" placeholder="+234 801 234 5678" /><TextField name="referralCode" label="Referral code (optional)" maxLength={32} placeholder="BRX-ADA" /></div>
    <fieldset><legend className="text-sm font-extrabold text-primary">Choose how to pay</legend><div className="mt-3 grid gap-3 sm:grid-cols-2">{(["full", "installment"] as const).map((plan) => <button key={plan} type="button" disabled={plan === "installment" && !quote?.hasInstallments} onClick={() => setPaymentPlan(plan)} aria-pressed={paymentPlan === plan} className={`rounded-2xl border p-5 text-left disabled:opacity-45 ${paymentPlan === plan ? "border-primary bg-alt-mint ring-2 ring-primary/10" : "border-line"}`}><span className="flex items-center justify-between"><CreditCard className="size-5 text-primary" />{paymentPlan === plan && <Check className="size-4" />}</span><strong className="mt-4 block text-sm text-primary">{plan === "full" ? "Full payment" : "Half payment"}</strong><span className="mt-1 block text-xs leading-5 text-muted">{plan === "full" ? "Pay for every item in full." : "Pay 50% for eligible items, plus the full price of other items."}</span></button>)}</div></fieldset>
    <p className="text-xs leading-5 text-muted">Services below ₦10,000 and services marked full-payment-only must be paid in full. Settle each item’s balance before downloading its completed documents.</p>
    {quote && <div className="divide-y divide-line rounded-2xl border border-line px-4">{quote.lines.map((line) => <div key={line.service.code} className="py-4 text-sm"><div className="flex justify-between gap-3"><strong>{line.service.shortName} × {line.quantity}</strong><span>{formatNaira(line.totalKobo)}</span></div><p className="mt-1 text-xs text-muted">{formatNaira(line.service.priceKobo)} each · {paymentPlan === "installment" && line.eligible ? "50% upfront" : "Full payment"}</p><p className="mt-2 flex flex-wrap justify-between gap-2 text-xs"><span>Due now: {formatNaira(line.dueNowKobo)}</span><span>Balance: {formatNaira(line.balanceKobo)}</span></p></div>)}</div>}
    <label className="flex items-start gap-3 rounded-2xl bg-alt-mint p-4 text-xs leading-5 text-muted"><input name="whatsappConsent" type="checkbox" defaultChecked className="mt-1 size-4 accent-primary" /><span>I will receive my order updates on this WhatsApp number.</span></label>
    {(serverError || error) && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{serverError || error?.message}</p>}
    {isFetching && <p role="status" className="text-sm text-muted">Updating prices…</p>}
    <div className="rounded-2xl bg-primary p-5 text-white"><div className="flex items-center justify-between"><span>Due now</span><strong className="text-2xl">{quote ? formatNaira(quote.dueNowKobo) : "—"}</strong></div>{!!quote?.balanceKobo && <p className="mt-2 text-xs text-white/75">Remaining balance: {formatNaira(quote.balanceKobo)}</p>}<Button type="submit" disabled={busy || isFetching || !!error || !quote} className="mt-5 w-full bg-white text-secondary hover:bg-alt-cream">{busy ? "Preparing payment…" : "Continue to secure payment"}<ArrowRight className="size-4" /></Button><p className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-white/65"><LockKeyhole className="size-3" />Payment is completed securely with Paystack.</p></div>
  </form>;
}
