"use client";
import { supportedMimeTypes } from "@/lib/issue-fields";
import { useState } from "react";
export interface UploadDocument { id: string; file_name: string; field_id?: string | null; kind?: string; released_at?: string | null }
export function UploadField({ orderId, fieldId, informationRequestId, kind = "application", label, onUploaded, allowedMimeTypes = [...supportedMimeTypes] }: { orderId: string; fieldId?: string; informationRequestId?: string; kind?: "application" | "completed" | "banking"; label: string; allowedMimeTypes?: string[]; onUploaded: (document: UploadDocument) => void }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [name, setName] = useState("");
  async function upload(file: File) {
    setBusy(true); setError("");
    try {
      if (!file.size || file.size > 10 * 1024 * 1024) throw new Error("Choose a file up to 10 MB.");
      if (!allowedMimeTypes.includes(file.type)) throw new Error("Choose one of the allowed file types.");
      const sign = await fetch("/api/storage/sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, fieldId, informationRequestId, kind, fileName: file.name, contentType: file.type, size: file.size }) });
      const signed = await sign.json(); if (!sign.ok || !signed.uploadUrl) throw new Error(signed.error ?? "Unable to authorize upload.");
      const uploaded = await fetch(signed.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type, "If-None-Match": "*" }, body: file }); if (!uploaded.ok) throw new Error("File upload failed. Please retry.");
      const finalized = await fetch("/api/storage/finalize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, uploadId: signed.uploadId }) });
      const result = await finalized.json(); if (!finalized.ok || !result.documentId) throw new Error(result.error ?? "File could not be saved.");
      setName(file.name); onUploaded({ id: result.documentId, file_name: file.name, field_id: fieldId, kind });
    } catch (error) { setError((error as Error).message); } finally { setBusy(false); }
  }
  return <div className="rounded-xl border border-dashed border-alt-sage bg-alt-mint p-4"><label className="grid gap-2 text-sm font-bold text-primary">{label}<span className="text-xs font-normal text-muted">{busy ? "Uploading and validating…" : name || `${allowedMimeTypes.map((type) => type === "application/pdf" ? "PDF" : type === "image/jpeg" ? "JPG" : "PNG").join(", ")} · up to 10 MB`}</span><input type="file" accept={allowedMimeTypes.join(",")} disabled={busy} onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(file); }} className="max-w-full text-xs" /></label>{error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}</div>;
}
