// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { services } from "@/config/services";

const mocks = vi.hoisted(() => ({ initialize: vi.fn() }));
vi.mock("@/lib/paystack", async (original) => ({ ...await original<typeof import("@/lib/paystack")>(), initializePaystack: mocks.initialize }));
vi.mock("@/lib/env", () => ({ env: { demoMode: true } }));
import { POST as checkout } from "@/app/api/checkout/initialize/route";
import { POST as balance } from "@/app/api/orders/balance/route";

const details = { fullName: "Test Customer", email: "customer@example.com", phone: "08012345678", paymentPlan: "full" };
function request(path: string, body: unknown) { return new Request(`http://localhost:3001${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); }
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_unit_test_only");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
  mocks.initialize.mockImplementation(async (input) => ({ authorization_url: "https://checkout.paystack.com/unit-test", reference: input.reference }));
});
afterEach(() => vi.unstubAllEnvs());

describe("all Brixer payment sections", () => {
  it.each(services.filter((service) => service.available))("initializes secure checkout with the server price for $code", async (service) => {
    const response = await checkout(request("/api/checkout/initialize", { ...details, serviceCode: service.code, amount: 1 }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ authorizationUrl: "https://checkout.paystack.com/unit-test" });
    expect(mocks.initialize).toHaveBeenCalledWith(expect.objectContaining({ amount: service.priceKobo, callbackUrl: "http://localhost:3001/payment/success", metadata: expect.objectContaining({ expectedKobo: service.priceKobo, paymentKind: "full" }) }));
  });

  it("includes full-price ineligible items in a mixed half-payment checkout", async () => {
    const response = await checkout(request("/api/checkout/initialize", { ...details, paymentPlan: "installment", items: [{ serviceCode: "LTD", quantity: 2 }, { serviceCode: "TIN", quantity: 1 }] }));
    expect(response.status).toBe(200);
    expect(mocks.initialize).toHaveBeenCalledWith(expect.objectContaining({ amount: 6500000 }));
  });
  it("requires review when a displayed price has changed", async () => {
    const response = await checkout(request("/api/checkout/initialize", { ...details, items: [{ serviceCode: "LTD", quantity: 1 }], expectedTotalKobo: 1 }));
    expect(response.status).toBe(409); expect(mocks.initialize).not.toHaveBeenCalled();
  });

  it("charges the configured 50% deposit without logging in", async () => {
    const response = await checkout(request("/api/checkout/initialize", { ...details, serviceCode: "LTD", paymentPlan: "installment" }));
    expect(response.status).toBe(200);
    expect(mocks.initialize).toHaveBeenCalledWith(expect.objectContaining({ amount: 3_000_000, metadata: expect.objectContaining({ paymentKind: "deposit" }) }));
  });

  it("uses hosted test checkout for balance payments instead of bypassing Paystack", async () => {
    const response = await balance(request("/api/orders/balance", { orderId: "1", email: details.email, amount: 1 }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ authorizationUrl: "https://checkout.paystack.com/unit-test" });
    expect(mocks.initialize).toHaveBeenCalledWith(expect.objectContaining({ email: details.email, amount: 3_000_000, metadata: expect.objectContaining({ paymentKind: "balance", orderReference: "BRX-0892" }) }));
  });

  it("rejects unavailable services and orders with no outstanding balance", async () => {
    expect((await checkout(request("/api/checkout/initialize", { ...details, serviceCode: "COOP" }))).status).toBe(400);
    expect((await balance(request("/api/orders/balance", { orderId: "2", email: details.email }))).status).toBe(409);
    expect(mocks.initialize).not.toHaveBeenCalled();
  });

  it("requires an email for preview balance payments", async () => {
    expect((await balance(request("/api/orders/balance", { orderId: "1" }))).status).toBe(400);
    expect(mocks.initialize).not.toHaveBeenCalled();
  });

  it("does not initialize or simulate payment when the key is missing", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "");
    expect((await checkout(request("/api/checkout/initialize", { ...details, serviceCode: "LTD" }))).status).toBe(503);
    expect((await balance(request("/api/orders/balance", { orderId: "1", email: details.email }))).status).toBe(503);
    expect(mocks.initialize).not.toHaveBeenCalled();
  });

  it("blocks live-money checkout while using demo order data", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_live_unit_test_only");
    expect((await checkout(request("/api/checkout/initialize", { ...details, serviceCode: "LTD" }))).status).toBe(503);
    expect(mocks.initialize).not.toHaveBeenCalled();
  });
});
