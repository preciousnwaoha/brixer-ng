"use client";

import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, FileUp, Save } from "lucide-react";
import { useState } from "react";
import type { ServiceDefinition } from "@/types";
import { Button } from "@/components/ui/button";
import { TextArea, TextField } from "@/components/ui/field";

export function ApplicationForm({ service, orderId }: { service: ServiceDefinition; orderId: string }) {
  const [files, setFiles] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<"draft" | "submitted" | null>(null);
  const submit = useMutation({
    mutationFn: async ({ form, shouldSubmit }: { form: FormData; shouldSubmit: boolean }) => {
      const response = await fetch("/api/applications/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, answers: Object.fromEntries(form), submit: shouldSubmit })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to save application");
      return shouldSubmit;
    },
    onSuccess: (shouldSubmit) => setSaved(shouldSubmit ? "submitted" : "draft")
  });

  async function upload(fieldId: string, file: File) {
    const sign = await fetch("/api/storage/sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, fileName: file.name, contentType: file.type, size: file.size }) });
    const data = await sign.json();
    if (!sign.ok) throw new Error(data.error);
    if (data.uploadUrl) {
      const response = await fetch(data.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!response.ok) throw new Error("Upload failed");
      await fetch("/api/storage/finalize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, key: data.key, fileName: file.name, contentType: file.type, fieldId }) });
    }
    setFiles((current) => ({ ...current, [fieldId]: file.name }));
  }

  return (
    <form onSubmit={(event) => { event.preventDefault(); const nativeEvent = event.nativeEvent as SubmitEvent; const submitter = nativeEvent.submitter as HTMLButtonElement | null; submit.mutate({ form: new FormData(event.currentTarget), shouldSubmit: submitter?.value !== "draft" }); }} className="grid gap-6">
      {service.formFields.map((field) => field.type === "textarea" ? <TextArea key={field.id} name={field.id} label={field.label} required={field.required} placeholder={field.placeholder} hint={field.help} /> : field.type === "select" ? <label key={field.id} className="grid gap-2 text-sm font-semibold text-primary">{field.label}<select name={field.id} required={field.required} className="h-12 rounded-xl border border-line bg-white px-4 text-sm font-normal"><option value="">Select an option</option>{field.options?.map((option) => <option key={option}>{option}</option>)}</select></label> : field.type === "file" ? <label key={field.id} className="rounded-2xl border border-dashed border-alt-sage bg-alt-mint p-5 text-center"><FileUp className="mx-auto size-6 text-primary" /><span className="mt-2 block text-sm font-extrabold text-primary">{field.label}</span><span className="mt-1 block text-xs text-muted">{files[field.id] ?? field.help ?? "PDF, JPG or PNG"}</span><input className="mt-4 block w-full text-xs" type="file" accept=".pdf,.jpg,.jpeg,.png" required={field.required && !files[field.id]} onChange={(event) => event.target.files?.[0] && upload(field.id, event.target.files[0])} /></label> : <TextField key={field.id} name={field.id} label={field.label} type={field.type} required={field.required} placeholder={field.placeholder} hint={field.help} />)}
      {saved && <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700"><CheckCircle2 className="size-4" />{saved === "draft" ? "Draft saved. You can return to finish it later." : "Application submitted successfully."}</p>}
      {submit.error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{submit.error.message}</p>}
      <div className="flex flex-col gap-3 sm:flex-row"><Button type="submit" value="submit" disabled={submit.isPending} className="flex-1"><Save className="size-4" />{submit.isPending ? "Saving…" : "Save and submit application"}</Button><Button type="submit" value="draft" disabled={submit.isPending} variant="outline" className="sm:w-auto">Save draft</Button></div>
    </form>
  );
}
