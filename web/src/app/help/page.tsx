import { Mail, MapPin, MessageCircle } from "lucide-react";
import { InfoPage } from "@/components/content/info-page";
import { FaqSection } from "@/components/home/faq-section";
import { siteConfig } from "@/config/site";

export default function HelpPage() {
  return <><InfoPage eyebrow="Help centre" title="Good support starts with a clear answer." intro="Get help choosing a service, understanding an order, or finding a document."><div className="grid gap-5 sm:grid-cols-3">{[{ icon: Mail, label: "Email", value: siteConfig.email, href: `mailto:${siteConfig.email}` }, { icon: MessageCircle, label: "Phone", value: siteConfig.phone, href: `tel:${siteConfig.phone.replace(/\s/g, "")}` }, { icon: MapPin, label: "Office", value: siteConfig.location, href: "/about" }].map((item) => <a key={item.label} href={item.href} className="rounded-2xl border border-line p-6 transition hover:border-alt-sage"><item.icon className="size-5 text-secondary" /><p className="mt-5 text-xs font-extrabold uppercase tracking-wider text-muted">{item.label}</p><p className="mt-2 text-sm font-extrabold text-primary">{item.value}</p></a>)}</div></InfoPage><FaqSection /></>;
}
