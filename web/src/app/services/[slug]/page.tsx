import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, Check, Clock3, CreditCard, ShieldCheck } from "lucide-react";
import { PublicShell } from "@/components/layout/public-shell";
import { Button } from "@/components/ui/button";
import { ServiceIcon } from "@/components/ui/service-icon";
import { getService, services } from "@/config/services";
import { formatNaira } from "@/lib/utils";

export function generateStaticParams() {
  return services.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const service = getService((await params).slug);
  if (!service) return {};
  return { title: service.name, description: service.description };
}

export default async function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const service = getService((await params).slug);
  if (!service) notFound();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    description: service.description,
    provider: { "@type": "Organization", name: "Brixer", url: "https://brixer.ng" },
    offers: { "@type": "Offer", priceCurrency: "NGN", price: service.priceKobo / 100 }
  };

  return (
    <PublicShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="noise bg-[linear-gradient(135deg,#f0f7f4_0%,#fff_60%,#f5ede8_100%)] py-16 sm:py-24">
        <div className="shell grid items-start gap-12 lg:grid-cols-[1.15fr_.85fr]">
          <div>
            <div className="flex items-center gap-4"><ServiceIcon name={service.icon} /><span className="text-xs font-extrabold uppercase tracking-[.18em] text-secondary">{service.categoryLabel}</span></div>
            <h1 className="display-title mt-7 max-w-4xl text-balance text-5xl font-black leading-[1.02] text-primary sm:text-6xl">{service.name}</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">{service.longDescription}</p>
            <div className="mt-8 flex flex-wrap gap-6 text-sm"><span className="inline-flex items-center gap-2 font-bold text-primary"><Clock3 className="size-4 text-alt-sage" />Estimated: {service.timeline}</span><span className="inline-flex items-center gap-2 font-bold text-primary"><ShieldCheck className="size-4 text-alt-sage" />Securely tracked</span></div>
          </div>
          <aside className="rounded-[1.8rem] border border-line bg-white p-7 shadow-[0_30px_80px_rgba(27,67,50,.12)] sm:p-9">
            <p className="text-xs font-extrabold uppercase tracking-wider text-muted">Service fee</p><p className="mt-2 text-4xl font-black tracking-tight text-primary">{formatNaira(service.priceKobo)}</p>
            {service.installmentEligible && <div className="mt-5 flex gap-3 rounded-2xl bg-alt-cream p-4"><CreditCard className="mt-0.5 size-5 shrink-0 text-secondary" /><p className="text-sm leading-6 text-secondary"><strong>Flexible start:</strong> pay in full or pay 50% now and the remaining 50% at filing.</p></div>}
            <Button href={service.available ? `/checkout/${service.slug}` : undefined} disabled={!service.available} className="mt-6 w-full">{service.available ? "Start this service" : "Coming soon"}<ArrowRight className="size-4" /></Button>
            <p className="mt-4 text-center text-xs text-muted">No account is required before payment.</p>
          </aside>
        </div>
      </section>
      <section className="py-16 sm:py-24"><div className="shell grid gap-12 lg:grid-cols-2"><div><p className="text-xs font-extrabold uppercase tracking-[.2em] text-secondary">What is included</p><h2 className="display-title mt-4 text-4xl font-bold text-primary">A clear scope, before you pay.</h2></div><ul className="grid gap-3">{service.included.map((item) => <li key={item} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 text-sm font-bold text-primary"><span className="grid size-7 place-items-center rounded-full bg-alt-mint text-primary"><Check className="size-4" /></span>{item}</li>)}</ul></div></section>
    </PublicShell>
  );
}
