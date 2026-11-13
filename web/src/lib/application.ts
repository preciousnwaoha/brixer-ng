import type { ServiceDefinition } from "@/types";
import { normalizePhone } from "./commerce";
export function validateAnswers(service: ServiceDefinition, answers: Record<string, unknown>, submitted: boolean, documents: { id: string; field_id: string | null }[]) {
  const clean: Record<string, string> = {};
  for (const field of service.formFields) {
    const value = answers[field.id];
    if (value !== undefined && typeof value !== "string") throw new Error(`Invalid value for ${field.label}.`);
    const text = typeof value === "string" ? value.trim() : "";
    if (text.length > 10000) throw new Error(`${field.label} is too long.`);
    if (field.type === "file") {
      const doc = documents.find((d) => d.id === text && d.field_id === field.id);
      if (text && !doc) throw new Error(`Upload a valid file for ${field.label}.`);
      if (submitted && field.required && !doc) throw new Error(`${field.label} is required.`);
    } else {
      if (submitted && field.required && !text) throw new Error(`${field.label} is required.`);
      if (text && field.type === "select" && !field.options?.includes(text)) throw new Error(`Choose an available ${field.label}.`);
      if (text && field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) throw new Error(`Enter a valid ${field.label}.`);
      if (text && field.type === "tel") normalizePhone(text);
      if (text && field.type === "date" && (!/^\d{4}-\d{2}-\d{2}$/.test(text) || !Number.isFinite(Date.parse(text)) || new Date(text).toISOString().slice(0, 10) !== text)) throw new Error(`Enter a valid ${field.label}.`);
    }
    clean[field.id] = text;
  }
  return clean;
}
