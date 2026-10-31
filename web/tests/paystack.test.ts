// @vitest-environment node
import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initializePaystack, paymentCallbackUrl, validPaystackSignature, verifyPaystack } from "@/lib/paystack";

const input = { email: "customer@example.com", amount: 3_000_000, reference: "BRX-TEST-123", callbackUrl: "http://localhost:3001/payment/success", metadata: { integration: "brixer", expectedKobo: 3_000_000 } };

beforeEach(() => vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_unit_test_only"));
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("Paystack server integration", () => {
  it("initializes NGN hosted checkout using the server secret and configured amount", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ status: true, data: { authorization_url: "https://checkout.paystack.com/test-checkout", reference: input.reference, access_code: "test-checkout" } }));
    vi.stubGlobal("fetch", fetch);
    const result = await initializePaystack(input);
    expect(result.authorization_url).toMatch(/^https:\/\/checkout\.paystack\.com\//);
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe("https://api.paystack.co/transaction/initialize");
    expect(options.headers.Authorization).toBe("Bearer sk_test_unit_test_only");
    expect(JSON.parse(options.body)).toMatchObject({ amount: "3000000", currency: "NGN", email: input.email, callback_url: input.callbackUrl });
    expect(JSON.stringify(result)).not.toContain("sk_test_");
  });

  it("fails rather than returning fake success when the key is missing", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "");
    await expect(initializePaystack(input)).rejects.toThrow("Secure payment is currently unavailable");
  });

  it("does not accept unexpected checkout URLs or references", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ status: true, data: { authorization_url: "https://example.com/checkout", reference: input.reference } })));
    await expect(initializePaystack(input)).rejects.toThrow("Unable to open secure checkout");
  });

  it("verifies transactions through Paystack without caching", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ status: true, data: { reference: input.reference, status: "success" } }));
    vi.stubGlobal("fetch", fetch);
    await expect(verifyPaystack(input.reference)).resolves.toMatchObject({ status: "success" });
    expect(fetch.mock.calls[0][0]).toBe(`https://api.paystack.co/transaction/verify/${input.reference}`);
    expect(fetch.mock.calls[0][1].cache).toBe("no-store");
  });

  it("uses the active origin for local callbacks and the configured deployment origin", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(paymentCallbackUrl(new Request("http://localhost:3001/api/checkout/initialize"))).toBe("http://localhost:3001/payment/success");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://brixer.ng");
    expect(paymentCallbackUrl(new Request("http://localhost:3001/api/checkout/initialize"))).toBe("https://brixer.ng/payment/success");
  });

  it("rejects malformed and tampered webhook signatures without throwing", () => {
    const body = JSON.stringify({ event: "charge.success" });
    const signature = crypto.createHmac("sha512", "sk_test_unit_test_only").update(body).digest("hex");
    expect(validPaystackSignature(body, signature)).toBe(true);
    expect(validPaystackSignature(body, "short")).toBe(false);
    expect(validPaystackSignature(`${body}tampered`, signature)).toBe(false);
    expect(validPaystackSignature(body, null)).toBe(false);
  });
});
