// @vitest-environment node
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { services } from "@/config/services";
const mocks = vi.hoisted(() => ({ buyer: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/env", () => ({ env: { demoMode: false, supabaseUrl: "https://supabase.example.test", supabaseServiceKey: "test", supabaseAnonKey: "test" } }));
vi.mock("@/lib/catalogue", () => ({ getCatalogue: async () => services }));
vi.mock("@/lib/checkout-customer", () => ({ authenticatedBuyer: mocks.buyer }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc: mocks.rpc }) }));
import { POST } from "@/app/api/checkout/initialize/route";
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_ownership_test_only"); mocks.buyer.mockResolvedValue({ user: { id: "verified-buyer" } }); mocks.rpc.mockResolvedValue({ data: { checkoutId: "checkout", reference: "BRX-TEST", amount: 6000000, authorizationUrl: "https://checkout.paystack.com/mock", status: "initialized" }, error: null }); });
afterEach(() => vi.unstubAllEnvs());
function checkout(extra = {}) { return POST(new Request("https://brixer.example/api/checkout/initialize", { method: "POST", body: JSON.stringify({ items: [{ serviceCode: "LTD", quantity: 1 }], paymentPlan: "full", fullName: "Another recipient", email: "recipient@example.com", phone: "08012345678", ...extra }) })); }
describe("checkout buyer identity", () => {
  it("uses the verified session, ignoring a forged buyer and edited recipient", async () => {
    expect((await checkout({ buyerId: "attacker", user_id: "attacker" })).status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("create_checkout", expect.objectContaining({ p_buyer_id: "verified-buyer", p_contact: expect.objectContaining({ email: "recipient@example.com" }) }));
  });
  it("scopes idempotency to the buyer and keeps guest ownership unassigned", async () => {
    await checkout(); const buyerDigest = mocks.rpc.mock.calls[0][1].p_digest; mocks.buyer.mockResolvedValue(null); await checkout();
    expect(mocks.rpc.mock.calls[1][1].p_buyer_id).toBeNull(); expect(mocks.rpc.mock.calls[1][1].p_digest).not.toBe(buyerDigest);
  });
});
