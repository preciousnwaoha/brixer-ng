"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { UploadField } from "./upload-field";
import { changeIssue } from "./order-issues";
import type { ServiceOrder } from "@/types/operations";
export function IssueForm({ orderId, issueId }: { orderId: string; issueId: string }) {
  const query = useQueryClient(); const router = useRouter(); const [files, setFiles] = useState<Record<string, string>>({}); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  const { data, error, isPending } = useQuery<{ order: ServiceOrder }>({ queryKey: ["order", orderId], queryFn: async () => { const response = await fetch(`/api/orders/${orderId}`); const result = await response.json(); if (!response.ok) throw new Error(result.error); return result; } });
  if (isPending) return <p role="status">Loading issue details…</p>;
  if (error || !data) return <p role="alert" className="text-red-700">{error?.message ?? "Unable to load this order."}</p>;
  const issue = data.order.order_issues?.find((item) => item.id === issueId);
  if (!issue) return <p role="alert">Issue not found.</p>;
  if (issue.status !== "open") return <div><p className="text-sm text-primary">{issue.status === "submitted" ? "Details received. Your issue is being reviewed." : "This issue has been cleared."}</p><Button href={`/dashboard/orders/${orderId}`} className="mt-5">View order</Button></div>;
  const fields = data.order.information_requests.filter((field) => field.issue_id === issueId);
  return <section className="mx-auto max-w-2xl rounded-2xl border border-line bg-white p-5 sm:p-8"><Button href={`/dashboard/orders/${orderId}`} variant="outline">← Your order</Button><h2 className="mt-6 text-2xl font-extrabold text-primary">Resolve issue</h2><p className="mt-4 whitespace-pre-wrap rounded-xl bg-red-50 p-4 text-sm text-red-800">{issue.message}</p><form className="mt-6 grid gap-5" noValidate onSubmit={async (event) => {
    event.preventDefault(); setBusy(true); setMessage(""); const answers = Object.fromEntries(new FormData(event.currentTarget)); fields.filter((field) => field.input_type === "file").forEach((field) => { answers[field.id] = files[field.id] ?? field.response ?? ""; });
    try { await changeIssue(orderId, issueId, { action: "submit", answers }); await Promise.all([query.invalidateQueries({ queryKey: ["order", orderId] }), query.invalidateQueries({ queryKey: ["dashboard", "client"] })]); router.push(`/dashboard/orders/${orderId}`); }
    catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  }}>{fields.map((field) => field.input_type === "file" ? <div key={field.id}><UploadField orderId={orderId} informationRequestId={field.id} allowedMimeTypes={field.allowed_mime_types} label={`${field.label}${field.required !== false ? " *" : ""}`} onUploaded={(document) => setFiles((current) => ({ ...current, [field.id]: document.id }))} />{(files[field.id] || field.response) && <p className="mt-2 text-xs text-primary">File saved securely.</p>}</div> : field.input_type === "select" ? <label key={field.id} className="grid gap-2 text-sm font-bold text-primary">{field.label}{field.required !== false ? " *" : ""}<select aria-label={`${field.label}${field.required !== false ? " *" : ""}`} name={field.id} defaultValue={field.response ?? ""} className="rounded-xl border border-line bg-white p-3"><option value="">Choose an option</option>{field.options?.map((option) => <option key={option}>{option}</option>)}</select></label> : <TextField key={field.id} name={field.id} type={field.input_type} label={`${field.label}${field.required !== false ? " *" : ""}`} defaultValue={field.response ?? ""} required={field.required !== false} maxLength={10000} />)}{message && <p role="alert" className="text-sm text-red-700">{message}</p>}<Button type="submit" disabled={busy}>{busy ? "Submitting…" : "Submit issue details"}</Button></form></section>;
}
