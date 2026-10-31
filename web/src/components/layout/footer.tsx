import Link from "next/link";
import { ArrowUpRight, Instagram, Linkedin } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { siteConfig } from "@/config/site";

const columns = [
  { title: "Services", links: [["Business Name", "/services/business-name"], ["LTD Registration", "/services/limited-company"], ["NGO / IT", "/services/ngo-standard"], ["Trademark", "/services/trademark"], ["Tax Clearance", "/services/tax-clearance"]] },
  { title: "Company", links: [["About Brixer", "/about"], ["How it works", "/#how-it-works"], ["Partner banks", "/#banking"], ["Referral programme", "/referrals"], ["Careers", "/careers"]] },
  { title: "Support", links: [["Help centre", "/help"], ["Track my order", "/login"], ["Refund policy", "/refund-policy"], ["Privacy policy", "/privacy"], ["Terms of use", "/terms"]] }
];

export function Footer() {
  return (
    <footer className="bg-[#121816] text-white/60">
      <div className="shell grid gap-12 py-16 lg:grid-cols-[1.4fr_2fr] lg:py-20">
        <div>
          <Logo inverse />
          <p className="mt-5 max-w-sm text-sm leading-7">{siteConfig.description} CAC registration, trademark, tax and banking support—handled in one calm, trackable place.</p>
          <a className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-white" href={`mailto:${siteConfig.email}`}>{siteConfig.email}<ArrowUpRight className="size-4" /></a>
        </div>
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="mb-5 text-xs font-extrabold uppercase tracking-[.18em] text-white">{column.title}</h3>
              <ul className="grid gap-3 text-sm">
                {column.links.map(([label, href]) => <li key={href}><Link className="transition hover:text-alt-sage" href={href}>{label}</Link></li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="shell flex flex-col gap-4 border-t border-white/10 py-7 text-xs sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Brixer. A product of {siteConfig.company}. All rights reserved.</p>
        <div className="flex items-center gap-5"><span>{siteConfig.location}</span><Instagram className="size-4" /><Linkedin className="size-4" /></div>
      </div>
    </footer>
  );
}
