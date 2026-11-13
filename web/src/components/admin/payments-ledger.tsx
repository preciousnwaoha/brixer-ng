"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatNaira } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { PaymentRecord } from "@/types/operations";
export function PaymentsLedger() {
  const [page, setPage] = useState(0);
  const { data, error, isFetching } = useQuery<{ payments: PaymentRecord[]; total: number }>({ queryKey: ["payments", page], queryFn: async () => { const response = await fetch(`/api/admin/payments?page=${page}`); const data = await response.json(); if (!response.ok) throw new Error(data.error); return data; } });
  return <div>{error && <p role="alert" className="text-red-700">{error.message}</p>}{isFetching && <p role="status">Loading payments…</p>}<div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead><tr>{["Reference", "Kind", "Expected", "Verified", "Status", "Date"].map((heading) => <th key={heading} className="border-b border-line p-3">{heading}</th>)}</tr></thead><tbody>{data?.payments.map((payment) => <tr key={payment.id}>{[payment.reference, payment.fulfillment_request_id ? "Hard copy / delivery" : payment.kind, formatNaira(Number(payment.expected_kobo)), payment.verified_kobo == null ? "—" : formatNaira(Number(payment.verified_kobo)), payment.status, new Date(payment.created_at).toLocaleDateString()].map((value, index) => <td key={index} className="border-b border-line p-3">{value}</td>)}</tr>)}</tbody></table></div>{data?.total === 0 && <p className="mt-4 text-sm text-muted">No payments recorded.</p>}<div className="mt-5 flex items-center gap-3"><Button variant="outline" disabled={!page || isFetching} onClick={() => setPage(page - 1)}>Previous</Button><span className="text-sm">Page {page + 1} · {data?.total ?? 0} payments</span><Button variant="outline" disabled={!data || (page + 1) * 30 >= data.total || isFetching} onClick={() => setPage(page + 1)}>Next</Button></div></div>;
}
