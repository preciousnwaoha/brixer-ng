import { z } from "zod";
import type { ServiceDefinition, ServiceFormField } from "@/types";
import type { InformationRequest } from "@/types/operations";
import { validateAnswers } from "./application";

export const supportedMimeTypes = ["application/pdf", "image/jpeg", "image/png"] as const;
export const issueFieldSchema = z.object({
  label: z.string().trim().min(1).max(200),
  type: z.enum(["text", "tel", "email", "file", "date", "select"]),
  required: z.boolean().default(true),
  options: z.array(z.string().trim().min(1).max(200)).max(100).default([]),
  allowedMimeTypes: z.array(z.enum(supportedMimeTypes)).min(1).default([...supportedMimeTypes])
}).superRefine((field, context) => {
  if (field.type === "select" && (!field.options.length || new Set(field.options).size !== field.options.length)) context.addIssue({ code: "custom", message: "Select fields need distinct options." });
});
export const createIssueSchema = z.object({ message: z.string().trim().min(3).max(2000), fields: z.array(issueFieldSchema).min(1).max(30) });
export const issueActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("submit"), answers: z.record(z.string(), z.unknown()) }),
  z.object({ action: z.literal("clear") }),
  z.object({ action: z.literal("reopen"), message: z.string().trim().min(3).max(2000) })
]);
export function informationField(field: InformationRequest): ServiceFormField {
  return { id: field.id, label: field.label, type: field.input_type, required: field.required !== false, options: field.options, allowedMimeTypes: field.allowed_mime_types };
}
export function validateIssueAnswers(fields: InformationRequest[], answers: Record<string, unknown>, documents: { id: string; information_request_id: string | null; content_type: string }[]) {
  const files = documents.filter((doc) => fields.some((field) => field.id === doc.information_request_id && new Set<string>(field.allowed_mime_types ?? supportedMimeTypes).has(doc.content_type))).map((doc) => ({ id: doc.id, field_id: doc.information_request_id }));
  return validateAnswers({ formFields: fields.map(informationField) } as ServiceDefinition, answers, true, files);
}
