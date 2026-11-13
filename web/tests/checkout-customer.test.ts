// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), profile: vi.fn(), guest: vi.fn(), rpc: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/env", () => ({ env: { demoMode: false, supabaseUrl: "https://supabase.example.test", supabaseAnonKey: "test" } }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.user }, rpc: mocks.rpc, from: mocks.from }) }));
import { checkoutCustomer } from "@/lib/checkout-customer";
beforeEach(() => {
  vi.clearAllMocks(); mocks.user.mockResolvedValue({ data: { user: { id: "buyer", email: "buyer@example.com", phone: "2348012345678", email_confirmed_at: "2026-11-12" } }, error: null });
  mocks.profile.mockResolvedValue({ data: { full_name: "Amina Buyer", role: "client", phone: "+2348099999999" }, error: null });
  mocks.guest.mockResolvedValue({ data: { customer_name: "Other recipient", customer_email: "other@example.com", customer_phone: "+2348077777777" }, error: null });
  mocks.rpc.mockResolvedValue({ error: null });
  mocks.from.mockImplementation((table) => { const chain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), single: mocks.profile, maybeSingle: mocks.guest }; return table === "profiles" || table === "orders" ? chain : undefined; });
});
describe("checkout contact defaults", () => {
  it("prefills buyer details rather than a previous recipient", async () => {
    expect(await checkoutCustomer()).toEqual({ buyerId: "buyer", contact: { fullName: "Amina Buyer", email: "buyer@example.com", phone: "+2348012345678" } });
  });
  it("uses matched guest data only to fill missing contact values", async () => {
    mocks.profile.mockResolvedValue({ data: { full_name: null, phone: null, role: "client" }, error: null });
    mocks.user.mockResolvedValue({ data: { user: { id: "buyer", phone: "2348012345678", phone_confirmed_at: "2026-11-12" } }, error: null });
    expect((await checkoutCustomer()).contact).toEqual({ fullName: "Other recipient", email: "other@example.com", phone: "+2348012345678" });
  });
  it("keeps guest checkout blank without loading account records", async () => {
    mocks.user.mockResolvedValue({ data: { user: null }, error: { name: "AuthSessionMissingError" } });
    expect(await checkoutCustomer()).toEqual({ contact: {} }); expect(mocks.from).not.toHaveBeenCalled();
  });
  it("does not use unrelated guest records from an administrator's broader visibility", async () => {
    mocks.profile.mockResolvedValue({ data: { full_name: "Administrator", role: "admin" }, error: null });
    expect((await checkoutCustomer()).contact.fullName).toBe("Administrator"); expect(mocks.guest).not.toHaveBeenCalled();
  });
});
