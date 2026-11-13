import type { OrderStage } from "@/types";
import type { ServiceOrder } from "@/types/operations";

export const orderStages: { id: OrderStage; label: string }[] = [
  { id: "received", label: "Received" },
  { id: "enter_details", label: "Enter details" },
  { id: "filing", label: "Filing" },
  { id: "submitted", label: "Submitted" },
  { id: "processing", label: "Processing" },
  { id: "completed", label: "Completed" }
];
export function activeIssue(order: ServiceOrder) {
  return order.order_issues?.find((issue) => issue.status !== "cleared");
}
export function needsInitialDetails(order: ServiceOrder) {
  return order.stage === "enter_details" || (order.stage === "received" && !["submitted", "approved"].includes(order.applications[0]?.status ?? ""));
}
export function needsClientAttention(order: ServiceOrder) {
  return needsInitialDetails(order) || activeIssue(order)?.status === "open" || order.information_requests.some((field) => !field.issue_id && field.status === "pending");
}
export function orderBalance(order: ServiceOrder) { return Math.max(0, Number(order.total_kobo) - Number(order.paid_kobo)); }
export function paidOrders(orders: ServiceOrder[]) { return orders.filter((order) => ["paid", "deposit_paid"].includes(order.payment_state)); }
export function completedDocuments(orders: ServiceOrder[]) {
  return orders.flatMap((order) => order.documents.filter((document) => document.kind !== "application" && !!document.released_at).map((document) => ({ document, order })));
}
