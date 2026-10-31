"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Building2, Download, FileText, HeartPulse, Home, Link2, Package, Settings, ShoppingCart, UsersRound, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressTracker } from "@/components/orders/progress-tracker";
import { DashboardShell, type DashboardNavItem } from "./dashboard-shell";
import { StatCard } from "./stat-card";
import { clientOrders } from "@/lib/demo-data";
import { formatNaira } from "@/lib/utils";

const nav: DashboardNavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "New order", href: "/services", icon: ShoppingCart },
  { label: "My orders", href: "#orders", icon: Package },
  { label: "Document vault", href: "#documents", icon: FileText },
  { label: "Compliance", href: "#", icon: HeartPulse, section: true },
  { label: "Business health", href: "#health", icon: HeartPulse },
  { label: "Earnings", href: "#", icon: WalletCards, section: true },
  { label: "Referral wallet", href: "#referrals", icon: WalletCards },
  { label: "My referral link", href: "#referrals", icon: Link2 },
  { label: "Account", href: "#", icon: Settings, section: true },
  { label: "Settings", href: "#settings", icon: Settings }
];

async function getData() {
  const response = await fetch("/api/dashboard/client");
  if (!response.ok) return { orders: clientOrders };
  return response.json();
}

const health = [
  ["CAC status", "Active · BN registered", "ok"], ["Bank account", "Active · Zenith", "ok"],
  ["Annual return", "Due in 47 days", "warn"], ["Tax filing", "Due Jun 30", "warn"],
  ["SCUML", "Not registered", "alert"], ["Trademark", "Filed · Pending", "ok"]
];

export function ClientDashboard() {
  const { data = { orders: clientOrders } } = useQuery({ queryKey: ["dashboard", "client"], queryFn: getData });
  const orders = data.orders as typeof clientOrders;
  return (
    <DashboardShell title="Good morning, Chidi" subtitle="Here is what is happening with your business." userName="Chidi Johnson" userMeta="Client account" initials="CJ" nav={nav} action={<Button href="/services" className="hidden sm:inline-flex">+ New order</Button>}>
      <section className="rounded-2xl border border-red-200 bg-red-50 p-5 sm:flex sm:gap-4" aria-label="Payment warning"><AlertTriangle className="size-6 shrink-0 text-red-600" /><div className="mt-3 flex-1 sm:mt-0"><h2 className="font-extrabold text-red-700">Balance payment required — BRX-0892</h2><p className="mt-1 text-sm leading-6 text-red-800/75">Your LTD registration is at Filing. Complete the outstanding <strong>₦30,000</strong> balance before work can continue.</p><Button href="/dashboard/orders/1/balance" className="mt-4 bg-red-600 shadow-none hover:bg-red-700">Pay ₦30,000 balance</Button></div></section>
      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Total orders" value="4" detail="2 currently active" /><StatCard label="Documents in vault" value="3" detail="Ready to download" /><StatCard label="Referral earnings" value="₦9k" detail="₦3k to payout" /><StatCard label="Compliance score" value="72%" detail="2 items need attention" /></section>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_.85fr]">
        <section id="orders" className="rounded-2xl border border-line bg-white p-5 sm:p-7"><div className="flex items-center justify-between"><h2 className="font-extrabold text-primary">Active orders</h2><button className="text-xs font-extrabold text-secondary">View all →</button></div><div className="mt-6 rounded-2xl bg-alt-mint p-5"><div className="mb-5"><p className="text-sm font-extrabold text-primary">LTD Registration</p><p className="mt-1 text-xs text-muted">BRX-0892 · Started Jun 5, 2026</p></div><ProgressTracker stage="filing" /></div><div className="mt-3 divide-y divide-line">{orders.slice(1).map((order) => <div key={order.id} className="flex items-center gap-3 py-4"><span className="grid size-10 place-items-center rounded-xl bg-alt-mint text-primary"><Building2 className="size-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold text-ink">{order.service}</p><p className="text-xs text-muted">{order.reference} · {order.startedAt}</p></div><span className={`rounded-full px-3 py-1 text-[10px] font-extrabold capitalize ${order.stage === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-violet-50 text-violet-700"}`}>{order.stage}</span></div>)}</div></section>
        <section id="health" className="rounded-2xl border border-line bg-white p-5 sm:p-7"><div className="flex items-center justify-between"><h2 className="font-extrabold text-primary">Business health</h2><span className="text-xs font-extrabold text-secondary">Full report →</span></div><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">{health.map(([name, detail, state]) => <div key={name} className={`rounded-xl border p-3 ${state === "ok" ? "border-emerald-100 bg-emerald-50/50" : state === "warn" ? "border-amber-100 bg-amber-50" : "border-red-100 bg-red-50"}`}><div className="flex gap-2"><span className={`mt-1.5 size-2 shrink-0 rounded-full ${state === "ok" ? "bg-emerald-500" : state === "warn" ? "bg-amber-500" : "bg-red-500"}`} /><div><p className="text-xs font-extrabold text-ink">{name}</p><p className="mt-0.5 text-[11px] text-muted">{detail}</p></div></div></div>)}</div></section>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section id="documents" className="rounded-2xl border border-line bg-white p-5 sm:p-7"><div className="flex items-center justify-between"><h2 className="font-extrabold text-primary">Document vault</h2><span className="text-xs font-extrabold text-secondary">3 documents</span></div><div className="mt-4 divide-y divide-line">{["CAC Certificate.pdf", "MEMART.pdf", "Zenith Welcome Pack.pdf"].map((name) => <div key={name} className="flex items-center gap-3 py-4"><FileText className="size-5 text-primary" /><span className="flex-1 text-sm font-bold text-ink">{name}</span><button aria-label={`Download ${name}`} className="grid size-9 place-items-center rounded-lg bg-alt-mint text-primary"><Download className="size-4" /></button></div>)}</div></section>
        <section id="referrals" className="overflow-hidden rounded-2xl bg-secondary p-6 text-white sm:p-7"><p className="text-xs font-bold text-white/60">Referral wallet balance</p><p className="mt-2 text-4xl font-black">₦9,000</p><p className="mt-2 text-xs text-white/65">3 referrals · ₦3,000 to unlock payout</p><div className="mt-6 rounded-xl bg-white/10 p-4"><div className="flex items-center gap-3"><UsersRound className="size-5" /><div className="flex-1"><p className="text-xs font-extrabold">Business name referrals</p><p className="text-[11px] text-white/60">3 verified referrals</p></div><strong className="text-sm">{formatNaira(900_000)}</strong></div></div><Button variant="light" className="mt-5 w-full text-secondary">Copy my referral link</Button></section>
      </div>
    </DashboardShell>
  );
}
