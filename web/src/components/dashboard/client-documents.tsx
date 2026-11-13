"use client";
import { useClientDashboard } from "./client-layout";
import { DocumentButton } from "@/components/orders/order-workspace";
import { Button } from "@/components/ui/button";
import { completedDocuments, paidOrders } from "@/lib/order-status";
import { canDownloadOutput } from "@/lib/commerce";
export function ClientDocuments() {
  const data = useClientDashboard();
  if (!data) return null;
  const documents = completedDocuments(paidOrders(data.orders));
  return <section className="rounded-2xl border border-line bg-white p-5 sm:p-6"><h2 className="text-xl font-bold text-primary">Your Documents</h2><p className="mt-2 text-sm text-muted">Completed documents unlock once the relevant service item is fully paid.</p>{documents.map(({ document, order }) => <div key={document.id} className="mt-6"><p className="text-xs font-bold text-muted">{order.service_snapshot.shortName} · {order.reference}</p><DocumentButton document={document} locked={!canDownloadOutput(order, !!document.released_at)} />{!canDownloadOutput(order, !!document.released_at) && <Button href={`/dashboard/orders/${order.id}/balance`} variant="outline" className="mt-3">Settle item balance</Button>}</div>)}{!documents.length && <p className="mt-5 text-sm text-muted">Your completed documents will appear here.</p>}</section>;
}
