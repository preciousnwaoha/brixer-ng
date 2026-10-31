import type { Metadata } from "next";
import { PublicShell } from "@/components/layout/public-shell";
import { SectionHeading } from "@/components/ui/section-heading";
import { ServiceGrid } from "@/components/services/service-grid";
import { services } from "@/config/services";

export const metadata: Metadata = { title: "Business compliance services", description: "Explore CAC, trademark, tax, trade, identity and corporate banking support from Brixer." };

export default function ServicesPage() {
  return (
    <PublicShell>
      <section className="noise border-b border-line bg-alt-mint py-16 sm:py-24">
        <div className="shell"><SectionHeading eyebrow="Service catalogue" title="One platform. Every essential next step." copy="Transparent pricing, clear timelines, and a secure dashboard for every order." /></div>
      </section>
      <section className="py-16 sm:py-24"><div className="shell"><ServiceGrid services={services} /></div></section>
    </PublicShell>
  );
}
