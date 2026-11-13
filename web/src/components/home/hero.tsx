import { ArrowRight, BadgeCheck, Landmark, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressTracker } from "@/components/orders/progress-tracker";
import { siteConfig } from "@/config/site";

export function Hero() {
  return (
    <section className="noise relative overflow-hidden bg-[radial-gradient(circle_at_88%_8%,rgba(82,183,136,.17),transparent_30%),linear-gradient(135deg,#f4faf7_0%,#fff_55%,#f8efea_100%)] py-16 sm:py-18 lg:py-20">
      <div className="absolute -left-24 top-20 size-72 rounded-full border border-primary/5" />
      <div className="shell grid items-center gap-16 lg:grid-cols-[.9fr_1.1fr]">
        <div className="relative z-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-alt-sage/50 bg-white/70 px-3.5 py-2 text-xs font-extrabold text-primary shadow-sm"><Sparkles className="size-3.5 text-alt-sage" />Business compliance, beautifully handled</span>
          <h1 className="display-title mt-7 text-balance text-[clamp(3.4rem,8vw,6.3rem)] font-black leading-[.88] text-primary">Register.<br /><span className="text-secondary">Protect.</span><br />Grow.</h1>
          <p className="mt-7 max-w-xl text-base leading-8 text-muted sm:text-lg">We handle CAC registration, trademark, tax compliance, and corporate banking, so you don't have a headache.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/#services" className="px-6">Browse services <ArrowRight className="size-4" /></Button>
            <Button href="/dashboard" variant="outline" className="px-6">See dashboard</Button>
          </div>
          <div className="mt-11 grid max-w-lg grid-cols-3 gap-5 border-t border-primary/10 pt-7">
            {siteConfig.stats.map((stat) => <div key={stat.label}><p className="text-2xl font-black tracking-tight text-primary sm:text-3xl">{stat.value}</p><p className="mt-1 text-[10px] font-bold uppercase leading-4 tracking-wide text-muted sm:text-xs">{stat.label}</p></div>)}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-2xl lg:ml-auto ">
          <div className="absolute -inset-5 rotate-2 rounded-[2.4rem] bg-primary/5" />
          <div className="relative rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-[0_35px_100px_rgba(27,67,50,.18)] backdrop-blur sm:p-8">
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-extrabold text-primary">Your active orders</p><p className="mt-1 text-xs text-muted">Everything, in one calm view.</p></div>
              <span className="rounded-full bg-alt-mint px-3 py-1.5 text-[11px] font-extrabold text-primary">2 in progress</span>
            </div>
            <div className="mt-6 rounded-2xl bg-alt-mint p-4 sm:p-5">
              <div className="mb-5 flex items-center justify-between"><span className="text-xs font-extrabold text-primary">BRX-0892 · LTD registration</span><span className="text-[10px] font-bold text-secondary">On track</span></div>
              <ProgressTracker stage="submitted" />
            </div>
            <div className="mt-4 grid gap-2.5">
              {[
                ["Business Name (BN)", "CAC · 3 hours", "₦35,000", "bg-alt-mint", BadgeCheck],
                ["Trademark registration", "IP · Filing support", "₦75,000", "bg-alt-cream", Sparkles],
                ["Tax clearance certificate", "Tax · FIRS", "₦100,000", "bg-amber-50", Landmark]
              ].map(([name, meta, price, color, Icon]) => (
                <div key={String(name)} className="flex items-center gap-3 rounded-2xl border border-line/70 bg-[#fbfcfb] p-3 sm:p-4">
                  <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${color}`}><Icon className="size-4 text-primary" /></span>
                  <div className="min-w-0 flex-1"><p className="truncate text-xs font-extrabold text-ink sm:text-sm">{String(name)}</p><p className="text-[11px] text-muted">{String(meta)}</p></div>
                  <p className="text-xs font-black text-primary sm:text-sm">{String(price)}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="float-card absolute -right-2 -top-6 rounded-2xl bg-secondary px-4 py-3 text-xs font-extrabold text-white shadow-xl sm:-right-5">Free bank account<br />with CAC registration</div>
          <div className="absolute -bottom-5 left-4 flex items-center gap-2 rounded-2xl border border-line bg-white px-4 py-3 text-xs font-bold text-primary shadow-xl sm:-left-7"><span className="grid size-6 place-items-center rounded-full bg-emerald-600 text-white">✓</span>BN registration complete</div>
        </div>
      </div>
    </section>
  );
}
