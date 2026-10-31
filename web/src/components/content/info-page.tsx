import type { ReactNode } from "react";
import { PublicShell } from "@/components/layout/public-shell";

export function InfoPage({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: ReactNode }) {
  return (
    <PublicShell>
      <section className="noise border-b border-line bg-alt-mint py-16 sm:py-24"><div className="shell max-w-4xl"><p className="text-xs font-extrabold uppercase tracking-[.2em] text-secondary">{eyebrow}</p><h1 className="display-title mt-4 text-balance text-5xl font-black leading-[1.05] text-primary sm:text-6xl">{title}</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-muted">{intro}</p></div></section>
      <section className="py-16 sm:py-24"><div className="shell max-w-4xl">{children}</div></section>
    </PublicShell>
  );
}

export function ContentSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="mb-12"><h2 className="display-title text-3xl font-bold text-primary">{title}</h2><div className="mt-4 space-y-4 text-sm leading-7 text-muted">{children}</div></section>;
}
