import { describe, it, expect } from "vitest";
import { createIssueSchema, validateIssueAnswers } from "@/lib/issue-fields";
import type { InformationRequest } from "@/types/operations";
const field = (input: Partial<InformationRequest> = {}): InformationRequest => ({ id: "field", order_id: "order", label: "Requested detail", description: "", input_type: "text", status: "pending", response: null, required: true, ...input });
describe("issue form validation", () => {
  it("requires an admin message, fields, labels and select options", () => {
    expect(createIssueSchema.safeParse({ message: "Please clarify", fields: [] }).success).toBe(false);
    expect(createIssueSchema.safeParse({ message: "Please clarify", fields: [{ label: "Office", type: "select" }] }).success).toBe(false);
    const parsed = createIssueSchema.parse({ message: "Please clarify", fields: [{ label: "Certificate", type: "file" }] });
    expect(parsed.fields[0]).toMatchObject({ required: true, allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"] });
  });
  it.each([ ["tel", "wrong"], ["email", "wrong"], ["date", "2026-02-30"], ["select", "Unknown"] ] as const)("rejects invalid %s responses", (type, answer) => {
    expect(() => validateIssueAnswers([field({ input_type: type, options: ["Lagos"] })], { field: answer }, [])).toThrow();
  });
  it("accepts valid typed values and optional blanks", () => {
    expect(validateIssueAnswers([field({ input_type: "tel" })], { field: "08012345678" }, [])).toEqual({ field: "08012345678" });
    expect(validateIssueAnswers([field({ required: false })], {}, [])).toEqual({ field: "" });
  });
  it("rejects missing, unrelated and disallowed file uploads", () => {
    const required = field({ input_type: "file", allowed_mime_types: ["application/pdf"] });
    expect(() => validateIssueAnswers([required], { field: "doc" }, [{ id: "doc", information_request_id: "other", content_type: "application/pdf" }])).toThrow();
    expect(() => validateIssueAnswers([required], { field: "doc" }, [{ id: "doc", information_request_id: "field", content_type: "image/png" }])).toThrow();
    expect(validateIssueAnswers([required], { field: "doc" }, [{ id: "doc", information_request_id: "field", content_type: "application/pdf" }])).toEqual({ field: "doc" });
  });
});
