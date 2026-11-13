"use client";
import { useClientDashboard } from "./client-layout";
import { StatCard } from "./stat-card";
import { OrderCards } from "./client-orders";
import { Button } from "@/components/ui/button";
import { completedDocuments, needsClientAttention, orderBalance, paidOrders } from "@/lib/order-status";
import { formatNaira } from "@/lib/utils";
export function ClientDashboard() {
  const data = useClientDashboard();
  if (!data) return null;
  const orders = paidOrders(data.orders);
  return <>
    <section aria-label="Order statistics" className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      <StatCard label="Active orders" value={String(orders.filter((order) => order.stage !== "completed").length)} detail="Service items in progress" href="/dashboard/orders?filter=active" />
      <StatCard label="Pending Info" value={String(orders.filter(needsClientAttention).length)} detail="Items needing your response" href="/dashboard/orders?filter=attention" />
      <StatCard label="Completed documents" value={String(completedDocuments(orders).length)} detail="Your finished documents" href="/dashboard/documents" />
      <StatCard label="Pending balance" value={formatNaira(orders.reduce((total, order) => total + orderBalance(order), 0))} detail="Settle per service item" href="/dashboard/orders?filter=balance" />
    </section>
    <section className="mt-8"><div className="mb-5 flex items-center justify-between gap-4"><h2 className="text-xl font-extrabold text-primary">Your orders</h2><Button href="/dashboard/orders" variant="outline">View all</Button></div><OrderCards orders={orders.slice(0, 4)} /></section>
    <section id="notifications" className="mt-8 rounded-2xl border border-line bg-white p-6"><h2 className="text-xl font-bold text-primary">Updates</h2><div className="mt-4 grid gap-4">{data.notifications.map((notice) => <article key={notice.id} className="rounded-xl bg-alt-mint p-4"><h3 className="font-bold">{notice.title}</h3><p className="mt-2 text-sm leading-6">{notice.body}</p></article>)}{!data.notifications.length && <p className="text-sm text-muted">New service updates will appear here.</p>}</div></section>
  </>;
}
