"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Banknote, BellRing, BriefcaseBusiness, Building2, FileClock, Home, Landmark, Settings, UsersRound, WalletCards } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { OrdersTable } from "@/components/admin/orders-table";
import { adminOrders } from "@/lib/demo-data";
import { DashboardShell, type DashboardNavItem } from "./dashboard-shell";
import { StatCard } from "./stat-card";

const nav: DashboardNavItem[] = [
  { label: "Overview", href: "/admin", icon: Home },
  { label: "Orders", href: "#orders", icon: BriefcaseBusiness },
  { label: "Clients", href: "#clients", icon: UsersRound },
  { label: "Team", href: "#team", icon: UsersRound },
  { label: "Operations", href: "#", icon: Settings, section: true },
  { label: "Bank requests", href: "#banking", icon: Landmark },
  { label: "Documents", href: "#documents", icon: FileClock },
  { label: "Notifications", href: "#notifications", icon: BellRing },
  { label: "Finance", href: "#", icon: Banknote, section: true },
  { label: "Referral payouts", href: "#payouts", icon: WalletCards },
  { label: "Revenue", href: "#revenue", icon: Banknote },
  { label: "Settings", href: "#settings", icon: Settings }
];

async function getAdminData() { const response = await fetch("/api/dashboard/admin"); return response.ok ? response.json() : { orders: adminOrders }; }

export function AdminDashboard() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteResult, setInviteResult] = useState("");
  const { data = { orders: adminOrders } } = useQuery({ queryKey: ["dashboard", "admin"], queryFn: getAdminData });
  const invite = useMutation({ mutationFn: async (form: FormData) => { const response = await fetch("/api/admin/staff/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) }); const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Unable to invite staff"); return result as { staffCode: string }; }, onSuccess: (result) => setInviteResult(`Invitation sent. Staff code: ${result.staffCode}`) });
  const payout = useMutation({ mutationFn: async (payoutId: string) => { const response = await fetch("/api/admin/payouts/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ payoutId, decision: "approved" }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Unable to approve payout"); return payoutId; } });
  return (
    <DashboardShell title="Operations overview" subtitle="Wednesday, October 14 · Live business view" userName="Princess Nwaoha" userMeta="Administrator" initials="PN" nav={nav} action={<Button onClick={() => setInviteOpen(true)} className="hidden sm:inline-flex">Invite staff</Button>}>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Revenue this month" value="₦4.82m" detail="18.4% above last month" /><StatCard label="Open orders" value="38" detail="12 need assignment" /><StatCard label="Completed" value="126" detail="This month" /><StatCard label="Pending payouts" value="₦214k" detail="9 requests to review" /></section>
      <section id="orders" className="mt-6 overflow-hidden rounded-2xl border border-line bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5 sm:p-6"><div><h2 className="font-extrabold text-primary">Order operations</h2><p className="mt-1 text-xs text-muted">Assignment, payment, and delivery status in one queue.</p></div><div className="flex gap-2"><button className="rounded-full bg-primary px-4 py-2 text-[10px] font-extrabold text-white">All orders</button><button className="rounded-full border border-line px-4 py-2 text-[10px] font-extrabold text-muted">Needs attention</button></div></div><OrdersTable rows={data.orders} /></section>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section id="payouts" className="rounded-2xl border border-line bg-white p-6"><div className="flex items-center justify-between"><h2 className="font-extrabold text-primary">Payout requests</h2><WalletCards className="size-5 text-secondary" /></div><div className="mt-5 grid gap-3">{[["demo-ada", "Ada O.", "Referral payout", "₦15,000"], ["demo-tolu", "Tolu F.", "Staff earnings", "₦74,000"], ["demo-musa", "Musa K.", "Referral payout", "₦20,000"]].map(([id, name, type, amount]) => <div key={id} className="flex items-center gap-3 rounded-xl bg-alt-mint p-3"><span className="grid size-9 place-items-center rounded-full bg-primary text-[10px] font-black text-white">{name.slice(0, 2)}</span><div className="flex-1"><p className="text-xs font-extrabold text-primary">{name}</p><p className="text-[10px] text-muted">{type}</p></div><strong className="text-xs text-secondary">{payout.data === id ? "Approved" : amount}</strong><button onClick={() => payout.mutate(id)} disabled={payout.isPending || payout.data === id} className="rounded-lg border border-primary/20 bg-white px-2 py-1 text-[9px] font-extrabold text-primary disabled:opacity-50">Approve</button></div>)}</div>{payout.error && <p className="mt-3 text-xs font-bold text-red-700">{payout.error.message}</p>}</section>
        <section id="team" className="rounded-2xl border border-line bg-white p-6"><div className="flex items-center justify-between"><h2 className="font-extrabold text-primary">Team capacity</h2><UsersRound className="size-5 text-secondary" /></div><p className="mt-5 text-4xl font-black text-primary">8<span className="ml-2 text-sm font-bold text-muted">active staff</span></p><div className="mt-5 h-2 overflow-hidden rounded-full bg-line"><div className="h-full w-[72%] rounded-full bg-alt-sage" /></div><div className="mt-3 flex justify-between text-[10px] font-bold text-muted"><span>23 active jobs</span><span>72% capacity</span></div><Button onClick={() => setInviteOpen(true)} variant="outline" className="mt-5 w-full">Invite team member</Button></section>
        <section id="banking" className="rounded-2xl bg-primary p-6 text-white"><div className="flex items-center justify-between"><h2 className="font-extrabold">Bank requests</h2><Building2 className="size-5 text-alt-sage" /></div><p className="mt-5 text-4xl font-black">17</p><p className="mt-1 text-xs text-white/55">Awaiting partner routing</p><div className="mt-5 grid grid-cols-2 gap-2 text-[10px] font-bold">{[["FCMB", "6"], ["Zenith", "5"], ["First Bank", "4"], ["Keystone", "2"]].map(([bank, count]) => <div key={bank} className="rounded-xl bg-white/10 p-3"><p className="text-white/55">{bank}</p><p className="mt-1 text-lg font-black text-white">{count}</p></div>)}</div></section>
      </div>
      {inviteOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-primary/55 p-4" onClick={() => setInviteOpen(false)}><section role="dialog" aria-modal="true" aria-labelledby="invite-title" className="w-full max-w-md rounded-[1.7rem] bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}><p className="text-xs font-extrabold uppercase tracking-wider text-secondary">Team access</p><h2 id="invite-title" className="mt-2 text-2xl font-black text-primary">Invite a staff member</h2><p className="mt-2 text-sm leading-6 text-muted">They will receive a secure Supabase sign-in invitation and a staff dashboard account.</p><form className="mt-6 grid gap-4" onSubmit={(event) => { event.preventDefault(); invite.mutate(new FormData(event.currentTarget)); }}><label className="grid gap-2 text-sm font-bold text-primary">Full name<input name="fullName" required minLength={3} className="h-12 rounded-xl border border-line px-4 font-normal" placeholder="Tolu Fashola" /></label><label className="grid gap-2 text-sm font-bold text-primary">Email address<input name="email" required type="email" className="h-12 rounded-xl border border-line px-4 font-normal" placeholder="tolu@example.com" /></label>{inviteResult && <p className="rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700">{inviteResult}</p>}{invite.error && <p className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{invite.error.message}</p>}<div className="mt-2 grid grid-cols-2 gap-3"><Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>Close</Button><Button type="submit" disabled={invite.isPending}>{invite.isPending ? "Sending…" : "Send invite"}</Button></div></form></section></div>}
    </DashboardShell>
  );
}
