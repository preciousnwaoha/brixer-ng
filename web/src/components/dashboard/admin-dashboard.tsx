"use client";
import { OrderAttentionBadge } from "./client-orders";
import { activeIssue } from "@/lib/order-status";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Home, Package, Banknote, Settings, BellRing } from "lucide-react";
import { DashboardShell } from "./dashboard-shell";
import { StatCard } from "./stat-card";
import { TeamControls } from "@/components/admin/team-controls";
import { DeliveryHistory } from "@/components/admin/delivery-history";
import { NotificationDelivery } from "@/components/admin/notification-delivery";
import { PaymentsLedger } from "@/components/admin/payments-ledger";
import { Button } from "@/components/ui/button";
import type { DashboardData } from "@/types/operations";
const nav = [{ label: "Overview", href: "/admin", icon: Home }, { label: "Service queue", href: "#orders", icon: Package }, { label: "Payments", href: "#payments", icon: Banknote }, { label: "Notifications", href: "#notifications", icon: BellRing }, { label: "Services and options", href: "/admin/settings", icon: Settings }];
export function AdminDashboard() {
  const [filter, setFilter] = useState("pending"); const [search, setSearch] = useState("");
  const { data, error, isPending } = useQuery<DashboardData>({ queryKey: ["dashboard", "admin"], refetchInterval: 30000, queryFn: async () => { const response = await fetch("/api/dashboard/admin"); const data = await response.json(); if (!response.ok) throw new Error(data.error); return data; } });
  const orders = data?.orders ?? []; const paidOrders = orders.filter((o) => ["paid", "deposit_paid"].includes(o.payment_state)); const name = data?.profile.full_name || "Administrator";
  const visible = orders.filter((o) => (filter === "all" || (filter === "review" ? activeIssue(o)?.status === "submitted" : filter === "pending" ? o.stage !== "completed" && o.payment_state !== "pending" : o.stage === "completed")) && `${o.reference} ${o.customer_name} ${o.service_snapshot?.name ?? o.service_code}`.toLowerCase().includes(search.toLowerCase()));
  return <DashboardShell title="Operations overview" subtitle="Service items, payments, and delivery." userName={name} userMeta="Administrator" initials={name.slice(0, 2).toUpperCase()} nav={nav} action={<Button href="/admin/settings" className="hidden sm:inline-flex">Manage services</Button>}>
    {isPending && <p role="status">Loading operations…</p>}{error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error.message}</p>}
    {data && <><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Paid service items" value={String(paidOrders.length)} detail="Including deposits" /><StatCard label="Pending jobs" value={String(paidOrders.filter((o) => o.stage !== "completed").length)} detail="Work and client details" /><StatCard label="Completed" value={String(paidOrders.filter((o) => o.stage === "completed").length)} detail="Documents uploaded" /><StatCard label="Delivery requests" value={String(orders.flatMap((o) => o.fulfillment_requests).filter((f) => !["fulfilled", "cancelled"].includes(f.status)).length)} detail="Awaiting quote, payment, or fulfillment" /></section>
    <section id="orders" className="mt-8 rounded-2xl border border-line bg-white p-5"><h2 className="text-xl font-extrabold text-primary">Service queue</h2><div className="mt-4 flex flex-wrap gap-3"><select aria-label="Filter service queue" value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-xl border border-line p-3"><option value="pending">Pending service items</option><option value="review">Issues awaiting review</option><option value="completed">Completed items</option><option value="all">All items and payment attempts</option></select><input aria-label="Search service items" placeholder="Search customer, reference, or service" value={search} onChange={(e) => setSearch(e.target.value)} className="min-w-48 flex-1 rounded-xl border border-line p-3" /></div><div className="mt-5 divide-y divide-line">{visible.map((order) => <article key={order.id} className="flex flex-wrap items-center gap-4 py-5"><div className="min-w-48 flex-1"><p className="font-bold text-primary">{order.service_snapshot?.name ?? order.service_code}</p><p className="mt-1 text-sm text-muted">{order.customer_name} · {order.reference}</p><p className="mt-2 text-xs capitalize">{order.stage.replaceAll("_", " ")} · {order.payment_state.replaceAll("_", " ")} · {order.assigned_staff_id ? "Assigned" : "Unassigned"}</p></div><OrderAttentionBadge order={order} /><Button href={`/admin/orders/${order.id}`}>Handle service item</Button></article>)}{!visible.length && <p className="py-5 text-sm text-muted">No matching service items.</p>}</div></section>
    <section id="payments" className="mt-8 rounded-2xl border border-line bg-white p-5"><h2 className="mb-5 text-xl font-extrabold text-primary">All payments</h2><PaymentsLedger /></section>
    <TeamControls /><NotificationDelivery /><DeliveryHistory /></>}
  </DashboardShell>;
}
