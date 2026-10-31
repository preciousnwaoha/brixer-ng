import { siteConfig } from "@/config/site";

export function Ticker() {
  if (!siteConfig.features.activityTicker) return null;
  const items = [...siteConfig.ticker, ...siteConfig.ticker];
  return (
    <div className="overflow-hidden bg-primary py-2.5 text-white" aria-label="Brixer activity">
      <div className="ticker-track flex w-max items-center gap-10 whitespace-nowrap pr-10">
        <span className="ml-5 rounded-full bg-alt-sage/15 px-3 py-1 text-[10px] font-black uppercase tracking-[.18em] text-alt-sage">Live</span>
        {items.map((item, index) => <span key={`${item}-${index}`} className="inline-flex items-center gap-3 text-xs font-semibold sm:text-sm"><span className="size-1.5 rounded-full bg-alt-sage" />{item}</span>)}
      </div>
    </div>
  );
}
