// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ verify: vi.fn(), fulfill: vi.fn() }));
vi.mock("@/lib/paystack", () => ({ verifyPaystack: mocks.verify }));
vi.mock("@/lib/fulfillment", () => ({ fulfillPayment: mocks.fulfill }));
vi.mock("@/lib/env", () => ({ env: { demoMode: true } }));
import { confirmPayment } from "@/lib/payment-confirmation";

const payment = { id: 123, reference: "BRX-TEST-123", amount: 3_000_000, currency: "NGN", status: "success", domain: "test", metadata: { integration: "brixer", expectedKobo: 3_000_000, orderReference: "BRX-ORDER-123", paymentKind: "deposit" } };
beforeEach(() => { vi.clearAllMocks(); mocks.verify.mockResolvedValue(payment); mocks.fulfill.mockResolvedValue({ reference: payment.reference }); });

describe("payment confirmation", () => {
  it("confirms and fulfills a verified test transaction even when dashboard demo mode is enabled", async () => {
    await expect(confirmPayment(payment.reference)).resolves.toMatchObject({ state: "confirmed", orderReference: "BRX-ORDER-123", isBalance: false });
    expect(mocks.fulfill).toHaveBeenCalledWith(expect.objectContaining({ amount: 3_000_000, status: "success", reference: payment.reference }));
  });

  it.each(["pending", "abandoned", "ongoing"])("keeps %s transactions pending without fulfillment", async (status) => {
    mocks.verify.mockResolvedValue({ ...payment, status });
    await expect(confirmPayment(payment.reference)).resolves.toMatchObject({ state: "pending" });
    expect(mocks.fulfill).not.toHaveBeenCalled();
  });

  it.each([
    { status: "failed" }, { currency: "USD" }, { amount: 1 }, { reference: "OTHER-REF" },
    { metadata: {} }, { domain: "live" }
  ])("rejects unsuccessful or mismatched payment details: %j", async (change) => {
    mocks.verify.mockResolvedValue({ ...payment, ...change });
    await expect(confirmPayment(payment.reference)).resolves.toMatchObject({ state: "failed" });
    expect(mocks.fulfill).not.toHaveBeenCalled();
  });

  it("does not verify or confirm a missing reference", async () => {
    await expect(confirmPayment("")).resolves.toMatchObject({ state: "failed" });
    expect(mocks.verify).not.toHaveBeenCalled();
  });

  it("preserves the original order reference for a balance transaction", async () => {
    mocks.verify.mockResolvedValue({ ...payment, metadata: { ...payment.metadata, paymentKind: "balance" } });
    await expect(confirmPayment(payment.reference)).resolves.toMatchObject({ state: "confirmed", isBalance: true, orderReference: "BRX-ORDER-123" });
  });

  it("does not report success if verification or fulfillment fails", async () => {
    mocks.verify.mockRejectedValue(new Error("Provider unavailable"));
    await expect(confirmPayment(payment.reference)).rejects.toThrow("Provider unavailable");
    expect(mocks.fulfill).not.toHaveBeenCalled();
  });
});
