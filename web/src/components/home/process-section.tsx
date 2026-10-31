import { BadgeCheck, ClipboardList, CreditCard, FileDown, SearchCheck } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";

const steps = [
  { icon: SearchCheck, title: "Pick your service", copy: "See exactly what is included, how much it costs, and how long it should take." },
  { icon: CreditCard, title: "Pay securely", copy: "Pay in full or choose a fixed 50% deposit for eligible services." },
  { icon: ClipboardList, title: "Complete your details", copy: "Claim your order and follow a focused checklist made for your selected service." },
  { icon: BadgeCheck, title: "We process it", copy: "A specialist handles the filing while every stage remains visible in your dashboard." },
  { icon: FileDown, title: "Receive documents", copy: "Get notified and download the completed documents from your private vault." }
];

export function ProcessSection() {
  return (
    <section className="py-20 sm:py-28" id="how-it-works">
      <div className="shell">
        <SectionHeading eyebrow="The process" title="From first click to finished documents." copy="One guided workflow replaces scattered chats, vague updates, and repeated follow-ups." align="center" />
        <div className="relative mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="absolute left-[10%] right-[10%] top-7 hidden h-px bg-primary/15 lg:block" />
          {steps.map((step, index) => <div key={step.title} className="relative rounded-2xl border border-line bg-white p-5 text-left sm:text-center lg:border-0 lg:p-3"><span className={`relative z-10 grid size-14 place-items-center rounded-2xl text-white shadow-lg sm:mx-auto ${index === 2 ? "bg-secondary" : "bg-primary"}`}><step.icon className="size-5" /><span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-white text-[9px] font-black text-primary ring-1 ring-line">{index + 1}</span></span><h3 className="mt-5 text-sm font-extrabold text-primary">{step.title}</h3><p className="mt-2 text-xs leading-5 text-muted">{step.copy}</p></div>)}
        </div>
      </div>
    </section>
  );
}
