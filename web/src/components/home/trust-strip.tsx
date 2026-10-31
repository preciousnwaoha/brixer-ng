import { BadgeCheck, Landmark } from "lucide-react";
import { siteConfig } from "@/config/site";

export function TrustStrip() {
  return (
    <section className="border-y border-white/10 bg-primary py-6 text-white/80" aria-label="Partners and trust signals">
      <div className="shell flex snap-x items-center gap-8 overflow-x-auto hide-scrollbar lg:justify-between">
        {siteConfig.banks.map((bank) => <div key={bank} className="flex shrink-0 snap-start items-center gap-2.5 text-sm font-bold"><Landmark className="size-4 text-alt-sage" />{bank} partner</div>)}
        <div className="flex shrink-0 items-center gap-2.5 text-sm font-bold"><BadgeCheck className="size-4 text-alt-sage" />CAC compliant</div>
      </div>
    </section>
  );
}
