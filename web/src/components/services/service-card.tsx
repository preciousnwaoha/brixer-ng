import Link from "next/link";
import { ArrowUpRight, Clock3 } from "lucide-react";
import type { ServiceDefinition } from "@/types";
import { formatNaira } from "@/lib/utils";
import { ServiceIcon } from "@/components/ui/service-icon";

export function ServiceCard({ service }: { service: ServiceDefinition }) {
  return (
    <Link href={`/services/${service.slug}`} className="group flex min-h-[330px] flex-col rounded-[1.6rem] border border-line bg-white p-6 shadow-[0_12px_35px_rgba(27,67,50,.045)] transition duration-300 hover:-translate-y-1 hover:border-alt-sage hover:shadow-[0_22px_60px_rgba(27,67,50,.13)]">
      <div className="flex items-start justify-between">
        <ServiceIcon name={service.icon} />
        {!service.available && <span className="rounded-full bg-alt-cream px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-secondary">Coming soon</span>}
      </div>
      <p className="mt-6 text-[10px] font-extrabold uppercase tracking-[.17em] text-secondary">{service.categoryLabel}</p>
      <h3 className="mt-2 text-xl font-extrabold tracking-tight text-primary">{service.shortName}</h3>
      <p className="mt-3 flex-1 text-sm leading-6 text-muted">{service.description}</p>
      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="text-lg font-black text-primary">{formatNaira(service.priceKobo)}</p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f7f8f7] px-3 py-1.5 text-[10px] font-bold text-muted"><Clock3 className="size-3" />{service.timeline}</span>
      </div>
      <span className="mt-4 inline-flex items-center gap-2 text-sm font-extrabold text-secondary">View service <ArrowUpRight className="size-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></span>
    </Link>
  );
}
