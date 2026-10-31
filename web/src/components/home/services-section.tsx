import { ArrowRight } from "lucide-react";
import { services } from "@/config/services";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { ServiceGrid } from "@/components/services/service-grid";

export function ServicesSection() {
  return (
    <section className="bg-alt-mint py-20 sm:py-28" id="services">
      <div className="shell">
        <div className="grid items-end gap-8 lg:grid-cols-2">
          <SectionHeading eyebrow="What we do" title="Every compliance service your business needs." />
          <div className="lg:pb-2"><p className="max-w-xl text-base leading-7 text-muted">From company registration to brand protection—choose your service, pay securely, and know what is happening at every step.</p></div>
        </div>
        <div className="mt-12"><ServiceGrid services={services} limit={6} /></div>
        <div className="mt-9 flex justify-center"><Button href="/services" variant="outline">Explore all services <ArrowRight className="size-4" /></Button></div>
      </div>
    </section>
  );
}
