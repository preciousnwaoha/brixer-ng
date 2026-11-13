"use client";
import { useQuery } from "@tanstack/react-query";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "./cart-provider";
import { Button } from "@/components/ui/button";
import { formatNaira } from "@/lib/utils";
import type { CartQuote } from "@/lib/commerce";
export function CartScreen() {
  const cart = useCart();
  const { data, error, isFetching } = useQuery<CartQuote>({ queryKey: ["cart-quote", cart.items], enabled: cart.ready && cart.items.length > 0, queryFn: async () => {
    const response = await fetch("/api/cart/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: cart.items }) });
    const body = await response.json(); if (!response.ok) throw new Error(body.error); return body;
  } });
  if (!cart.ready) return <p role="status">Loading your cart…</p>;
  if (!cart.items.length) return <div className="rounded-2xl border border-line bg-white p-8"><h2 className="text-xl font-bold text-primary">Your cart is empty.</h2><Button href="/#services" className="mt-5">Browse services</Button></div>;
  return <section className="rounded-2xl border border-line bg-white p-5 sm:p-8">
    {error && <div role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-red-700">{error.message}<div className="mt-3 flex flex-wrap gap-3">{cart.items.map((i) => <button key={i.serviceCode} onClick={() => cart.change(i.serviceCode, -i.quantity)} className="underline">Remove {i.serviceCode}</button>)}</div></div>}
    {isFetching && <p role="status" className="text-sm text-muted">Updating prices…</p>}
    <ul className="divide-y divide-line">{data?.lines.map((line) => <li key={line.service.code} className="flex flex-wrap items-center gap-4 py-6"><div className="min-w-40 flex-1"><h2 className="font-extrabold text-primary">{line.service.name}</h2><p className="mt-1 text-sm text-muted">{formatNaira(line.service.priceKobo)} per item · {line.service.timeline}</p></div><div className="flex items-center gap-3"><button aria-label={`Remove one ${line.service.shortName}`} onClick={() => cart.change(line.service.code, -1)} className="grid size-9 place-items-center rounded-lg border border-line"><Minus className="size-4" /></button><span>{line.quantity}</span><button aria-label={`Add one ${line.service.shortName}`} disabled={line.quantity >= 20} onClick={() => cart.change(line.service.code, 1)} className="grid size-9 place-items-center rounded-lg border border-line disabled:opacity-40"><Plus className="size-4" /></button></div><strong>{formatNaira(line.totalKobo)}</strong><button aria-label={`Remove ${line.service.shortName} from cart`} onClick={() => cart.change(line.service.code, -line.quantity)}><Trash2 className="size-4 text-muted" /></button></li>)}</ul>
    {data && <div className="mt-4 flex items-center justify-between border-t border-line pt-6 text-xl font-extrabold text-primary"><span>Total</span><span>{formatNaira(data.totalKobo)}</span></div>}
    <p className="mt-5 text-sm leading-6 text-muted">You’ll complete each service’s details and document uploads in your dashboard after payment. Our team will call you to guide you.</p>
    <Button href={data && !error && !isFetching ? "/checkout" : undefined} disabled={!data || !!error || isFetching} className="mt-6 w-full">Start the service(s)</Button>
  </section>;
}
