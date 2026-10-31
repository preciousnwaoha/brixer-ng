"use client";

import Link from "next/link";
import { Bell, LogOut, Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

export interface DashboardNavItem { label: string; href: string; icon: React.ComponentType<{ className?: string }>; section?: boolean }

export function DashboardShell({ title, subtitle, userName, userMeta, initials, nav, children, action }: { title: string; subtitle: string; userName: string; userMeta: string; initials: string; nav: DashboardNavItem[]; children: ReactNode; action?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const sidebar = (
    <>
      <div className="flex h-20 items-center justify-between border-b border-white/10 px-6"><Logo inverse /><button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X className="size-5" /></button></div>
      <div className="flex items-center gap-3 border-b border-white/10 px-6 py-6"><span className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary text-sm font-black text-white">{initials}</span><div className="min-w-0"><p className="truncate text-sm font-extrabold text-white">{userName}</p><p className="truncate text-xs text-white/45">{userMeta}</p></div></div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {nav.map((item, index) => item.section ? <p key={`${item.label}-${index}`} className="px-3 pb-2 pt-5 text-[9px] font-black uppercase tracking-[.2em] text-white/30">{item.label}</p> : <Link key={`${item.label}-${index}`} onClick={() => setOpen(false)} href={item.href} className={cn("mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-white/60 transition hover:bg-white/10 hover:text-white", index === 0 && "bg-white/12 text-white")}><item.icon className="size-4" />{item.label}</Link>)}
      </nav>
      <Link href="/" className="m-3 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-white/55 hover:bg-white/10"><LogOut className="size-4" />Leave dashboard</Link>
    </>
  );
  return (
    <div className="min-h-screen bg-[#f5f7f6] lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden min-h-screen flex-col bg-primary lg:sticky lg:top-0 lg:flex lg:h-screen">{sidebar}</aside>
      {open && <div className="fixed inset-0 z-50 bg-black/35 lg:hidden" onClick={() => setOpen(false)}><aside className="flex h-full w-[280px] flex-col bg-primary" onClick={(event) => event.stopPropagation()}>{sidebar}</aside></div>}
      <main className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur"><div className="flex min-h-20 items-center gap-4 px-4 sm:px-7 lg:px-10"><button className="grid size-10 place-items-center rounded-xl border border-line lg:hidden" onClick={() => setOpen(true)} aria-label="Open dashboard menu"><Menu className="size-5" /></button><div className="min-w-0 flex-1"><h1 className="truncate text-lg font-extrabold text-primary sm:text-xl">{title}</h1><p className="truncate text-xs text-muted">{subtitle}</p></div><button className="relative grid size-10 place-items-center rounded-xl border border-line bg-white"><Bell className="size-4 text-primary" /><span className="absolute right-2 top-2 size-1.5 rounded-full bg-red-500" /></button>{action}</div></header>
        <div className="p-4 sm:p-7 lg:p-10">{children}</div>
      </main>
    </div>
  );
}
