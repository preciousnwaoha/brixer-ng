import { ArrowRight, BadgeDollarSign, Link2, Share2, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";

const rows = [
  ["LTD registration", "₦5,000", "₦15,000"],
  ["Business name", "₦3,000", "₦12,000"],
  ["NGO Standard", "₦7,500", "₦15,000"],
  ["NGO Executive", "₦10,000", "₦20,000"],
  ["Trademark", "₦3,750", "₦11,250"]
];

const steps = [
  { icon: Link2, title: "Get your link", copy: "Every client dashboard includes a unique referral link." },
  { icon: Share2, title: "Share it anywhere", copy: "Send it on WhatsApp, Instagram, LinkedIn, or directly to a friend." },
  { icon: WalletCards, title: "Earn and withdraw", copy: "Verified referrals build your wallet until the payout threshold is reached." }
];

export function ReferralSection() {
  return (
    <section className="bg-alt-mint py-20 sm:py-28" id="referrals">
      <div className="shell">
        <div className="grid gap-6 lg:grid-cols-2"><SectionHeading eyebrow="Earn while you share" title="Refer businesses. Get paid cash." /><p className="max-w-xl self-end text-base leading-7 text-muted lg:pb-2">Share a unique link and earn a transparent reward when a referred customer pays for an eligible service.</p></div>
        <div className="mt-12 grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
          <div className="overflow-hidden rounded-[1.7rem] border border-line bg-white shadow-[0_18px_60px_rgba(27,67,50,.08)]">
            <div className="flex items-center gap-3 border-b border-line p-6"><BadgeDollarSign className="size-6 text-secondary" /><h3 className="font-extrabold text-primary">Referral earnings by service</h3></div>
            <div className="p-3 sm:p-5">
              <div className="grid grid-cols-[1.3fr_.7fr_.8fr] gap-2 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-muted"><span>Service</span><span>You earn</span><span>Min. payout</span></div>
              {rows.map((row) => <div key={row[0]} className="grid grid-cols-[1.3fr_.7fr_.8fr] gap-2 border-t border-line px-3 py-4 text-xs sm:text-sm"><span className="font-bold text-primary">{row[0]}</span><span className="text-muted">{row[1]}</span><span className="font-extrabold text-secondary">{row[2]}</span></div>)}
            </div>
          </div>
          <div className="rounded-[1.7rem] bg-primary p-7 text-white sm:p-9">
            <h3 className="display-title text-3xl font-bold">How it works</h3>
            <div className="mt-7 grid gap-6">{steps.map((step, index) => <div key={step.title} className="flex gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 text-alt-sage"><step.icon className="size-5" /></span><div><p className="text-xs font-black uppercase tracking-widest text-alt-sage">Step {index + 1}</p><h4 className="mt-1 font-extrabold">{step.title}</h4><p className="mt-1 text-sm leading-6 text-white/60">{step.copy}</p></div></div>)}</div>
            <Button href="/referrals" className="mt-8">See all rewards <ArrowRight className="size-4" /></Button>
          </div>
        </div>
      </div>
    </section>
  );
}
