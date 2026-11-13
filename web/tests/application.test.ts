import { describe, expect, it } from "vitest";
import { validateAnswers } from "@/lib/application";
import { services } from "@/config/services";
const service = { ...services[0], formFields: [{ id: "name", label: "Name", type: "text" as const, required: true }, { id: "bank", label: "Bank", type: "select" as const, options: ["FCMB"] }, { id: "id_doc", label: "Identity document", type: "file" as const, required: true }] };
describe("service application validation", () => {
  it("allows incomplete drafts without accepting arbitrary answer types", () => { expect(validateAnswers(service, {}, false, [])).toEqual({ name: "", bank: "", id_doc: "" }); expect(() => validateAnswers(service, { name: { fake: true } }, false, [])).toThrow(); });
  it("requires submitted fields and actual finalized files", () => {
    expect(() => validateAnswers(service, { name: "Customer" }, true, [])).toThrow("Identity document");
    expect(() => validateAnswers(service, { name: "Customer", id_doc: "another-order-document" }, true, [{ id: "document", field_id: "id_doc" }])).toThrow();
    expect(validateAnswers(service, { name: " Customer ", id_doc: "document", unrecognized: "discard" }, true, [{ id: "document", field_id: "id_doc" }])).toEqual({ name: "Customer", bank: "", id_doc: "document" });
  });
  it("rejects invalid selections", () => { expect(() => validateAnswers(service, { bank: "Unknown" }, false, [])).toThrow("available Bank"); });
});
