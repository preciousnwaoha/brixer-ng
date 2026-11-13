"use client";
import { useSearchParams } from "next/navigation";
import { useClientDashboard } from "./client-layout";
import { Button } from "@/components/ui/button";
import { ProgressTracker } from "@/components/orders/progress-tracker";
import { activeIssue, needsInitialDetails, needsClientAttention, orderBalance, paidOrders } from "@/lib/order-status";
import { formatNaira } from "@/lib/utils";
import type { ServiceOrder } from "@/types/operations";
export function OrderAttentionBadge({ order }: { order: ServiceOrder }) {
  const issue = activeIssue(order);
  const label = issue?.status === "open" ? "Issue" : issue?.status === "submitted" ? "Settling issue" : needsInitialDetails(order) ? "Pending details" : "";
  if (!label) return null;
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${issue?.status === "open" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"}`}>{label}</span>;
}
export function OrderCards({ orders }: { orders: ServiceOrder[] }) {
  return <div className="grid gap-5 sm:grid-cols-2" data-testid="order-grid">{orders.map((order) => {
    const issue = activeIssue(order);
    const initial = needsInitialDetails(order);
    const href = issue?.status === "open" ? `/dashboard/orders/${order.id}/issues/${issue.id}` : initial ? `/dashboard/orders/${order.id}/application` : `/dashboard/orders/${order.id}`;
    return <article key={order.id} className="min-w-0 rounded-2xl border border-line bg-white p-4 sm:p-5"><div className="flex items-start justify-between gap-2"><p className="min-w-0 break-all text-xs text-muted">{order.reference}</p><OrderAttentionBadge order={order} /></div><h3 className="mt-2 text-lg font-bold text-primary">{order.service_snapshot?.name ?? order.service_code}</h3><div className="mt-5"><ProgressTracker stage={order.stage} issue={issue?.status === "open"} /></div>{issue && <p className={`mt-5 text-sm ${issue.status === "open" ? "text-red-700" : "text-muted"}`}>{issue.status === "open" ? issue.message : "Your response has been received. Our team is reviewing the issue."}</p>}{initial && !issue && <p className="mt-5 text-sm text-muted">Enter the required details so our team can begin filing.</p>}{orderBalance(order) > 0 && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Balance: {formatNaira(orderBalance(order))}. Settle this item to unlock its completed documents.</p>}<div className="mt-5 flex flex-wrap gap-3"><Button href={href}>{issue?.status === "open" ? "Resolve issue" : initial ? "Enter Needed Details" : "View order"}</Button>{(initial || issue?.status === "open") && <Button href={`/dashboard/orders/${order.id}`} variant="outline">View order</Button>}</div></article>;
  })}{!orders.length && <div className="rounded-2xl border border-line bg-white p-6 sm:col-span-2"><p className="text-sm text-muted">No orders to show here yet.</p><Button href="/dashboard/new-order" className="mt-4">New order</Button></div>}</div>;
}
export function ClientOrders() {
  const data = useClientDashboard();
  const filter = useSearchParams().get("filter");
  if (!data) return null;
  const all = paidOrders(data.orders);
  const orders = all.filter((order) => filter === "active" ? order.stage !== "completed" : filter === "attention" ? needsClientAttention(order) : filter === "balance" ? orderBalance(order) > 0 : true);
  const label = filter === "active" ? "Active orders" : filter === "attention" ? "Orders needing your attention" : filter === "balance" ? "Orders with a pending balance" : "Your orders";
  return <section><div className="mb-6 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-extrabold text-primary">{label}</h2>{filter && <Button variant="outline" href="/dashboard/orders">Show all orders</Button>}</div><OrderCards orders={orders} /></section>;
}
