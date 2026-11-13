import { ArrowRight } from "lucide-react";
import { getCatalogue } from "@/lib/catalogue";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { ServiceGrid } from "@/components/services/service-grid";

export async function ServicesSection() {
  let services;
  try {
    services = await getCatalogue();
  } catch {
    return (
      <section id="services" className="bg-alt-mint py-16">
        <div className="shell">
          <h2 className="text-3xl font-bold text-primary">Our services</h2>
          <p className="mt-4 text-sm">
            Service prices are temporarily unavailable. Please try again shortly
            or contact our team.
          </p>
        </div>
      </section>
    );
  }
  return (
    <section className="bg-alt-mint py-16 sm:py-16" id="services">
      <div className="shell">
        <div className="grid items-end gap-8 lg:grid-cols-2">
          <SectionHeading
            eyebrow="What we do"
            title="Every compliance service your business needs."
          />
          <div className="lg:pb-2">
            <p className="max-w-xl text-base leading-7 text-muted">
              From company registration to brand protection. Choose services,
              make payment, and track every step.
            </p>
          </div>
        </div>
        <div className="mt-8">
          <ServiceGrid services={services} />
        </div>
        <div className="mt-9 flex justify-center">
          <Button href="/services" variant="outline">
            Explore all services <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
