"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supportedMimeTypes } from "@/lib/issue-fields";
import { activeIssue, orderStages } from "@/lib/order-status";
import type { ServiceOrder, OrderIssue } from "@/types/operations";

export async function changeIssue(orderId: string, issueId: string, body: object) {
  const response = await fetch(`/api/orders/${orderId}/issues/${issueId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Unable to update this issue."); return result;
}
export function OrderIssuePanel({ order, issue, admin }: { order: ServiceOrder; issue: OrderIssue; admin: boolean }) {
  const query = useQueryClient(); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  const fields = order.information_requests.filter((field) => field.issue_id === issue.id);
  async function act(body: object) {
    setBusy(true); setMessage("");
    try { await changeIssue(order.id, issue.id, body); await Promise.all([query.invalidateQueries({ queryKey: ["order", order.id] }), query.invalidateQueries({ queryKey: ["dashboard"] })]); }
    catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  }
  return <article className={`rounded-xl border p-4 ${issue.status === "open" ? "border-red-200 bg-red-50/40" : "border-line bg-white"}`}>
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold text-primary">{issue.status === "open" ? "Issue" : issue.status === "submitted" ? "Settling issue" : "Issue cleared"}</h3><p className="text-xs text-muted">{orderStages.find((stage) => stage.id === issue.stage)?.label}</p></div>
    <p className="mt-3 whitespace-pre-wrap text-sm text-primary">{issue.message}</p>
    {issue.status === "submitted" && <p className="mt-3 text-sm text-muted">Details received. An administrator will review your response.</p>}
    <dl className="mt-4 grid gap-3">{fields.map((field) => <div key={field.id}><dt className="text-xs font-bold text-muted">{field.label}{field.required !== false ? " *" : ""}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm">{field.input_type === "file" ? order.documents.find((doc) => doc.id === field.response)?.file_name ?? "File not submitted" : field.response || "Awaiting response"}</dd></div>)}</dl>
    {!admin && issue.status === "open" && <Button className="mt-5" href={`/dashboard/orders/${order.id}/issues/${issue.id}`}>Resolve issue</Button>}
    {admin && issue.status !== "cleared" && <div className="mt-5 grid gap-4"><Button className="justify-self-start" disabled={busy} onClick={() => void act({ action: "clear" })}>Clear issue</Button>{issue.status === "submitted" && <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); void act({ action: "reopen", message: String(new FormData(event.currentTarget).get("message")) }); }}><label className="grid gap-2 text-sm font-bold text-primary">Request a correction<textarea name="message" required minLength={3} maxLength={2000} className="rounded-xl border border-line bg-white p-3 font-normal" /></label><Button variant="outline" type="submit" disabled={busy} className="justify-self-start">Request corrections</Button></form>}</div>}
    {issue.history.length > 0 && <details className="mt-5 text-xs text-muted"><summary className="cursor-pointer font-bold">Issue history</summary><ol className="mt-3 grid gap-3">{issue.history.map((entry, index) => <li key={index}><span className="capitalize">{entry.action}</span> · {new Date(entry.at).toLocaleString()}{entry.message && <p className="mt-1 whitespace-pre-wrap">{entry.message}</p>}{entry.answers && <dl className="mt-2 grid gap-1">{Object.entries(entry.answers).map(([id, value]) => <div key={id}><dt className="font-semibold">{fields.find((field) => field.id === id)?.label ?? "Response"}</dt><dd className="whitespace-pre-wrap break-words">{order.documents.find((doc) => doc.id === value)?.file_name ?? value}</dd></div>)}</dl>}</li>)}</ol></details>}
    {message && <p role="alert" className="mt-4 text-sm text-red-700">{message}</p>}
  </article>;
}

type BuilderField = { key: string; label: string; type: "text" | "tel" | "email" | "file" | "date" | "select"; required: boolean; options: string; allowedMimeTypes: string[] };
const blankField = (key: string): BuilderField => ({ key, label: "", type: "text", required: true, options: "", allowedMimeTypes: [...supportedMimeTypes] });
export function IssueBuilder({ order }: { order: ServiceOrder }) {
  const query = useQueryClient(); const [fields, setFields] = useState<BuilderField[]>([blankField("initial")]); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  if (activeIssue(order) || !["filing", "submitted", "processing"].includes(order.stage)) return null;
  function update(key: string, patch: Partial<BuilderField>) { setFields((current) => current.map((field) => field.key === key ? { ...field, ...patch } : field)); }
  return <form className="mt-5 grid gap-5 rounded-xl bg-alt-mint p-4" onSubmit={async (event) => {
    event.preventDefault(); const form = event.currentTarget; setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/orders/${order.id}/issues`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: new FormData(form).get("message"), fields: fields.map((field) => ({ label: field.label, type: field.type, required: field.required, options: field.options.split("\n").map((option) => option.trim()).filter(Boolean), allowedMimeTypes: field.allowedMimeTypes })) }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error); form.reset(); setFields([blankField("initial")]); await Promise.all([query.invalidateQueries({ queryKey: ["order", order.id] }), query.invalidateQueries({ queryKey: ["dashboard"] })]); setMessage("Issue sent to the client.");
    } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  }}><h3 className="font-bold text-primary">Flag an issue</h3><label className="grid gap-2 text-sm font-bold text-primary">Message for the client<textarea name="message" required minLength={3} maxLength={2000} className="rounded-xl border border-line bg-white p-3 font-normal" /></label>
    {fields.map((field, index) => <fieldset key={field.key} className="grid gap-3 rounded-xl border border-line bg-white p-4"><legend className="px-2 text-xs font-bold">Requested detail {index + 1}</legend><label className="grid gap-2 text-sm">Label<input value={field.label} onChange={(event) => update(field.key, { label: event.target.value })} required maxLength={200} className="rounded-lg border border-line p-3" /></label><label className="grid gap-2 text-sm">Field type<select value={field.type} onChange={(event) => update(field.key, { type: event.target.value as BuilderField["type"] })} className="rounded-lg border border-line p-3">{[["text", "Text"], ["tel", "Phone"], ["email", "Email"], ["file", "File upload"], ["date", "Date"], ["select", "Select"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={field.required} onChange={(event) => update(field.key, { required: event.target.checked })} />Required</label>
      {field.type === "select" && <label className="grid gap-2 text-sm">Options, one per line<textarea value={field.options} onChange={(event) => update(field.key, { options: event.target.value })} required className="rounded-lg border border-line p-3" /></label>}
      {field.type === "file" && <div className="grid gap-2 text-sm"><p>Allowed file types</p>{supportedMimeTypes.map((type) => <label key={type} className="flex items-center gap-2"><input type="checkbox" checked={field.allowedMimeTypes.includes(type)} onChange={(event) => { const next = event.target.checked ? [...field.allowedMimeTypes, type] : field.allowedMimeTypes.filter((item) => item !== type); if (next.length) update(field.key, { allowedMimeTypes: next }); }} />{type === "application/pdf" ? "PDF" : type === "image/jpeg" ? "JPEG" : "PNG"}</label>)}</div>}
      {fields.length > 1 && <Button type="button" variant="outline" className="justify-self-start" onClick={() => setFields((current) => current.filter((item) => item.key !== field.key))}>Remove field</Button>}
    </fieldset>)}
    <div className="flex flex-wrap gap-3"><Button type="button" variant="outline" disabled={fields.length >= 30 || busy} onClick={() => setFields((current) => [...current, blankField(crypto.randomUUID())])}>+ Add field</Button><Button type="submit" disabled={busy}>{busy ? "Sending…" : "Send issue"}</Button></div>{message && <p role="status" className="text-sm text-primary">{message}</p>}
  </form>;
}
