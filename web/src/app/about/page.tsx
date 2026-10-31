import { BadgeCheck, Eye, HeartHandshake, Route } from "lucide-react";
import { InfoPage } from "@/components/content/info-page";

const values = [
  { icon: Eye, title: "Clarity", copy: "Prices, stages, requirements, and next steps should never be a mystery." },
  { icon: Route, title: "Progress", copy: "Every order has a visible route from payment to completed documents." },
  { icon: HeartHandshake, title: "Care", copy: "Compliance should feel professionally handled, not cold or confusing." },
  { icon: BadgeCheck, title: "Accountability", copy: "A recorded history gives clients and the operations team one shared truth." }
];

export default function AboutPage() {
  return <InfoPage eyebrow="About Brixer" title="Compliance should feel calm, not chaotic." intro="Brixer is the digital client experience for The Brand Fixer's business registration and compliance services."><div className="grid gap-5 sm:grid-cols-2">{values.map((value) => <article key={value.title} className="rounded-2xl border border-line p-6"><span className="grid size-11 place-items-center rounded-xl bg-alt-mint text-primary"><value.icon className="size-5" /></span><h2 className="mt-5 text-lg font-extrabold text-primary">{value.title}</h2><p className="mt-2 text-sm leading-7 text-muted">{value.copy}</p></article>)}</div><div className="mt-12 rounded-[1.8rem] bg-primary p-7 text-white sm:p-10"><p className="text-xs font-extrabold uppercase tracking-widest text-alt-sage">Our promise</p><h2 className="display-title mt-4 text-4xl font-bold">A five-star concierge feel, backed by visible operations.</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-white/65">The platform organises payments, applications, status updates, documents, reminders, and support while qualified people complete the underlying filings.</p></div></InfoPage>;
}
