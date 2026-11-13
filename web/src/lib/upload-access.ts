import type { SupabaseClient } from "@supabase/supabase-js";
import type { ServiceDefinition } from "@/types";
import { supportedMimeTypes } from "./issue-fields";

export async function validateUploadField(supabase: SupabaseClient, order: { id: string; stage: string; service_snapshot: ServiceDefinition }, input: { kind: string; fieldId?: string | null; informationRequestId?: string | null; contentType: string }) {
  if (input.informationRequestId) {
    const { data: field, error } = await supabase.from("information_requests").select("*,order_issues(status)").eq("id", input.informationRequestId).eq("order_id", order.id).maybeSingle();
    if (error || !field || field.input_type !== "file" || field.status === "resolved" || input.kind !== "application" || (field.issue_id && field.order_issues?.status !== "open")) throw new Error("This file request is not accepting uploads.");
    if (!(field.allowed_mime_types ?? supportedMimeTypes).includes(input.contentType)) throw new Error("This file type is not allowed for the requested field.");
  } else if (input.kind === "application") {
    if (!["received", "enter_details"].includes(order.stage)) throw new Error("Initial service details have already been submitted.");
    const field = order.service_snapshot?.formFields.find((field) => field.id === input.fieldId && field.type === "file");
    if (!field) throw new Error("This upload does not match a required service field.");
    if (!new Set<string>(field.allowedMimeTypes ?? supportedMimeTypes).has(input.contentType)) throw new Error("This file type is not allowed for this field.");
  }
}
