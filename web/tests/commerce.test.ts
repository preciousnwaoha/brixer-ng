import { describe, expect, it } from "vitest";
import { services } from "@/config/services";
import { quoteCart, installmentEligible, normalizePhone, safeNext, canDownloadOutput } from "@/lib/commerce";
const ltd = services.find((s) => s.code === "LTD")!;
describe("cart payment rules", () => {
  it("charges half for eligible units and full for ineligible units", () => {
    const quote = quoteCart([{ serviceCode: "LTD", quantity: 2 }, { serviceCode: "TIN", quantity: 1 }], services, "installment");
    expect(quote).toMatchObject({ totalKobo: 12500000, dueNowKobo: 6500000, balanceKobo: 6000000 });
    expect(quote.lines[1]).toMatchObject({ eligible: false, dueNowKobo: 500000, balanceKobo: 0 });
  });
  it.each([[999999, false], [1000000, true], [1000001, true]])("enforces the per-unit threshold at %i kobo", (priceKobo, eligible) => {
    expect(installmentEligible({ priceKobo, installmentEligible: true })).toBe(eligible);
  });
  it("honors a service-specific exclusion even above the threshold", () => { expect(installmentEligible({ priceKobo: 2000000, installmentEligible: false })).toBe(false); });
  it("never makes a cheap service eligible by buying more units", () => { const q = quoteCart([{ serviceCode: "TIN", quantity: 4 }], services, "installment"); expect(q.dueNowKobo).toBe(2000000); expect(q.balanceKobo).toBe(0); });
  it("rounds each odd-kobo unit and preserves exact total", () => { const q = quoteCart([{ serviceCode: "LTD", quantity: 3 }], [{ ...ltd, priceKobo: 1000001 }], "installment"); expect(q.dueNowKobo).toBe(1500003); expect(q.dueNowKobo + q.balanceKobo).toBe(3000003); });
  it("coalesces duplicate lines while bounding quantities", () => { expect(quoteCart([{ serviceCode: "LTD", quantity: 1 }, { serviceCode: "LTD", quantity: 2 }], services, "full").lines[0].quantity).toBe(3); expect(() => quoteCart([{ serviceCode: "LTD", quantity: 20 }, { serviceCode: "LTD", quantity: 1 }], services, "full")).toThrow(); });
  it.each([[], [{ serviceCode: "MISSING", quantity: 1 }], [{ serviceCode: "COOP", quantity: 1 }], [{ serviceCode: "LTD", quantity: 0 }]].map((items) => ({ items })))("rejects invalid and unavailable selections", ({ items }) => { expect(() => quoteCart(items, services, "full")).toThrow(); });
});
describe("contact and redirect validation", () => {
  it.each(["08012345678", "+234 801 234 5678", "2348012345678"])("normalizes %s", (input) => { expect(normalizePhone(input)).toBe("+2348012345678"); });
  it.each(["email@example.com", "123", "+0000000000", "080123456789999"])("rejects %s", (input) => { expect(() => normalizePhone(input)).toThrow(); });
  it.each(["//evil.example", "/\\evil.example", "https://evil.example", "/\nevil"])("rejects unsafe return path %s", (path) => { expect(safeNext(path)).toBe("/dashboard"); });
  it("preserves an internal destination", () => expect(safeNext("/dashboard/orders/item")).toBe("/dashboard/orders/item"));
});
describe("output release gate", () => {
  const order = { total_kobo: 6000000, paid_kobo: 6000000, payment_state: "paid", stage: "completed" };
  it("requires full payment, completion, and document release", () => {
    expect(canDownloadOutput(order, true)).toBe(true);
    expect(canDownloadOutput({ ...order, paid_kobo: 3000000, payment_state: "deposit_paid" }, true)).toBe(false);
    expect(canDownloadOutput({ ...order, stage: "processing" }, true)).toBe(false);
    expect(canDownloadOutput(order, false)).toBe(false);
    expect(canDownloadOutput({ ...order, payment_state: "reversed" }, true)).toBe(false);
  });
});
