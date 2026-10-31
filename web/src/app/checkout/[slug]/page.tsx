import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { CheckoutForm } from "@/components/billing/checkout-form";
import { Logo } from "@/components/ui/logo";
import { getService } from "@/config/services";
import { formatNaira } from "@/lib/utils";

export default async function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const service = getService((await params).slug);
  if (!service || !service.available) notFound();
  return (
    <main className="min-h-screen bg-alt-mint/60">
      <header className="border-b border-line bg-white"><div className="shell flex h-20 items-center justify-between"><Logo /><Link href={`/services/${service.slug}`} className="inline-flex items-center gap-2 text-sm font-bold text-primary"><ArrowLeft className="size-4" />Back to service</Link></div></header>
      <div className="shell grid gap-8 py-10 lg:grid-cols-[1fr_390px] lg:py-16">
        <section className="rounded-[1.8rem] border border-line bg-white p-6 sm:p-9"><p className="text-xs font-extrabold uppercase tracking-[.18em] text-secondary">Secure checkout</p><h1 className="display-title mt-3 text-4xl font-bold text-primary">Start your order.</h1><p className="mt-3 text-sm leading-6 text-muted">Pay as a guest. We will send a secure link to claim the order and complete your application afterward.</p><div className="mt-8"><CheckoutForm service={service} /></div></section>
        <aside className="h-fit rounded-[1.8rem] border border-line bg-white p-6 lg:sticky lg:top-8"><p className="text-xs font-extrabold uppercase tracking-wider text-muted">Your service</p><h2 className="mt-3 text-xl font-extrabold text-primary">{service.name}</h2><p className="mt-2 text-sm leading-6 text-muted">{service.description}</p><div className="my-5 h-px bg-line" /><div className="flex justify-between text-sm"><span className="text-muted">Service fee</span><strong className="text-primary">{formatNaira(service.priceKobo)}</strong></div><ul className="mt-6 grid gap-3">{service.included.slice(0, 4).map((item) => <li key={item} className="flex gap-2 text-xs leading-5 text-muted"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-alt-sage" />{item}</li>)}</ul></aside>
      </div>
    </main>
  );
}
