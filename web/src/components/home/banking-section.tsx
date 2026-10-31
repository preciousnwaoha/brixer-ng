import { ArrowRight, FileLock2, Gift, Landmark, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { siteConfig } from "@/config/site";

const benefits = [
  { icon: Landmark, title: "Four partner banks, one workflow", copy: "Compare the configured options and see what each bank needs before you choose." },
  { icon: Gift, title: "Included with CAC registration", copy: "Every CAC order can include a corporate account opening request at no additional service fee." },
  { icon: Zap, title: "Standalone opening for ₦5,000", copy: "Already registered? Start a bank account request as its own service." },
  { icon: FileLock2, title: "Private document delivery", copy: "Welcome packs and account documents are delivered securely through your dashboard." }
];

export function BankingSection() {
  return (
    <section className="noise bg-primary py-20 sm:py-28" id="banking">
      <div className="shell grid items-center gap-12 lg:grid-cols-[.9fr_1.1fr] lg:gap-20">
        <div>
          <SectionHeading inverse eyebrow="Banking partners" title="Your registration can open more than one door." copy="Request a corporate bank account in the same guided workflow as your CAC registration—without starting from scratch somewhere else." />
          <div className="mt-8 flex flex-wrap gap-2">{siteConfig.banks.map((bank, index) => <span key={bank} className={`rounded-xl border px-4 py-2 text-xs font-bold text-white ${index === 0 ? "border-secondary bg-secondary" : "border-white/15 bg-white/5"}`}>{bank}</span>)}</div>
          <Button href="/services/corporate-bank-account" className="mt-8">Open an account <ArrowRight className="size-4" /></Button>
        </div>
        <div className="rounded-[2rem] border border-white/15 bg-white/[.07] p-5 backdrop-blur sm:p-8">
          {benefits.map((item, index) => <div key={item.title} className={`flex gap-4 py-5 ${index < benefits.length - 1 ? "border-b border-white/10" : ""}`}><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 text-alt-sage"><item.icon className="size-5" /></span><div><h3 className="font-extrabold text-white">{item.title}</h3><p className="mt-1.5 text-sm leading-6 text-white/60">{item.copy}</p></div></div>)}
        </div>
      </div>
    </section>
  );
}
