"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { ServiceDefinition } from "@/types";
import { Button } from "@/components/ui/button";
import { TextField, TextArea } from "@/components/ui/field";
import { UploadField, type UploadDocument } from "./upload-field";
export function ApplicationForm({ service, orderId, initialAnswers = {}, documents = [], readOnly = false }: { service: ServiceDefinition; orderId: string; initialAnswers?: Record<string, string>; documents?: UploadDocument[]; readOnly?: boolean }) {
  const query = useQueryClient(); const router = useRouter();
  const [files, setFiles] = useState<Record<string, string>>(() => Object.fromEntries(service.formFields.filter((field) => field.type === "file").map((field) => [field.id, initialAnswers[field.id] ?? documents.find((doc) => doc.field_id === field.id)?.id ?? ""])));
  const [savedAnswers, setSavedAnswers] = useState(initialAnswers); const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null; const shouldSubmit = submitter?.value !== "draft";
    const answers = { ...Object.fromEntries(new FormData(event.currentTarget)), ...files }; setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/applications/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, answers, submit: shouldSubmit }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      setSavedAnswers(answers as Record<string, string>); if (shouldSubmit) setSubmitted(true);
      setMessage(shouldSubmit ? "Details submitted. Our team can now begin filing." : "Draft saved. You can return to finish it later.");
      await Promise.all([query.invalidateQueries({ queryKey: ["order", orderId] }), query.invalidateQueries({ queryKey: ["dashboard", "client"] })]); router.refresh();
    } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  }
  if (readOnly || submitted) return <div><p role="status" className="mb-5 rounded-xl bg-alt-mint p-4 text-sm text-primary">{message || "Your details have been submitted. Any further information needed will appear in an issue form."}</p><dl className="grid gap-4">{service.formFields.map((field) => <div key={field.id}><dt className="text-xs font-bold text-muted">{field.label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm text-primary">{field.type === "file" ? files[field.id] ? documents.find((doc) => doc.id === files[field.id])?.file_name ?? "File saved securely" : "—" : savedAnswers[field.id] || "—"}</dd></div>)}</dl></div>;
  return <form onSubmit={submit} noValidate className="grid gap-6">{service.formFields.map((field) => field.type === "file" ? <div key={field.id}><UploadField orderId={orderId} fieldId={field.id} allowedMimeTypes={field.allowedMimeTypes} label={`${field.label}${field.required ? " *" : ""}`} onUploaded={(doc) => setFiles((current) => ({ ...current, [field.id]: doc.id }))} />{files[field.id] && <p className="mt-1 text-xs text-primary">File saved securely.</p>}</div> : field.type === "textarea" ? <TextArea key={field.id} name={field.id} label={field.label} defaultValue={initialAnswers[field.id] ?? ""} placeholder={field.placeholder} hint={field.help} /> : field.type === "select" ? <label key={field.id} className="grid gap-2 text-sm font-bold text-primary">{field.label}<select aria-label={field.label} name={field.id} defaultValue={initialAnswers[field.id] ?? ""} className="h-12 rounded-xl border border-line bg-white px-4"><option value="">Select an option</option>{field.options?.map((option) => <option key={option}>{option}</option>)}</select></label> : <TextField key={field.id} name={field.id} label={`${field.label}${field.required ? " *" : ""}`} type={field.type} defaultValue={initialAnswers[field.id] ?? ""} placeholder={field.placeholder} hint={field.help} />)}{message && <p role="status" className="rounded-xl bg-alt-mint p-4 text-sm text-primary">{message}</p>}<div className="flex flex-wrap gap-3"><Button type="submit" value="submit" disabled={busy}>{busy ? "Saving…" : "Submit required details"}</Button><Button type="submit" value="draft" disabled={busy} variant="outline">Save draft</Button></div></form>;
}
