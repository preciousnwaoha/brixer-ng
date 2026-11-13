"use client";

import Link from "next/link";
import { Menu, X, ShoppingCart } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import { useState } from "react";
import { siteConfig } from "@/config/site";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export function Header() {
  const [open, setOpen] = useState(false);
  const cart = useCart();
  const count = cart.items.reduce((n, item) => n + item.quantity, 0);
  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-white/90 backdrop-blur-xl">
      <div className="shell flex h-[76px] items-center justify-between">
        <Logo />
        <nav className="hidden items-center gap-8 lg:flex" aria-label="Primary navigation">
          {siteConfig.nav.map((item) => <Link key={item.href} className="text-sm font-semibold text-ink/80 transition hover:text-primary" href={item.href}>{item.label}</Link>)}
        </nav>
        <div className="ml-auto mr-3 flex items-center gap-2 lg:ml-0 lg:mr-0">
          <Link href="/cart" aria-label={`Cart, ${count} items`} className="relative grid size-11 place-items-center rounded-xl border border-line"><ShoppingCart className="size-5" />{count > 0 && <span className="absolute -right-2 -top-2 rounded-full bg-secondary px-1.5 text-xs font-bold text-white">{count}</span>}</Link>
          <Button href="/dashboard" className="px-3">Dashboard</Button>
        </div>
        <button className="grid size-11 place-items-center rounded-xl border border-line lg:hidden" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label="Toggle navigation">
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-line bg-white px-4 pb-5 pt-3 lg:hidden">
          <nav className="mx-auto grid max-w-xl gap-1" aria-label="Mobile navigation">
            {siteConfig.nav.map((item) => <Link key={item.href} onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 text-base font-semibold hover:bg-alt-mint" href={item.href}>{item.label}</Link>)}
          </nav>
        </div>
      )}
    </header>
  );
}
