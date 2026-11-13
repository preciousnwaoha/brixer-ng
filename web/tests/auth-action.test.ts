// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/phone-otp", () => ({ phoneOtpAvailable: () => true, clearVerifiedOtps: vi.fn() }));
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), profile: vi.fn(), rpc: vi.fn(), link: vi.fn(), password: vi.fn(), verify: vi.fn(), update: vi.fn(), recover: vi.fn() }));
vi.mock("@/lib/env", () => ({ env: { demoMode: true, siteUrl: "https://brixer.example", supabaseUrl: "https://supabase.example.invalid", supabaseAnonKey: "test", supabaseServiceKey: "test", whatsappEnabled: true } }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn(() => ({ rpc: mocks.rpc, from: vi.fn(() => ({ update: vi.fn().mockReturnThis(), eq: vi.fn(async () => ({ error: null })) })) })) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({ auth: { getUser: mocks.getUser, signInWithOtp: mocks.link, signInWithPassword: mocks.password, verifyOtp: mocks.verify, updateUser: mocks.update, resetPasswordForEmail: mocks.recover }, from: vi.fn(() => ({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: mocks.profile })) })) }));
import { POST } from "@/app/api/auth/action/route";
function post(body: object) { return POST(new Request("https://brixer.example/api/auth/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })); }
beforeEach(() => {
  vi.clearAllMocks(); mocks.rpc.mockImplementation(async (name) => ({ data: name === "auth_attempt" ? true : { exists: true }, error: null }));
  const user = { id: "verified-user", email_confirmed_at: "2026-11-12", phone_confirmed_at: "2026-11-12", app_metadata: { role: "admin" } };
  mocks.getUser.mockResolvedValue({ data: { user }, error: null }); mocks.profile.mockResolvedValue({ data: { role: "client" }, error: null });
  mocks.link.mockResolvedValue({ error: null }); mocks.password.mockResolvedValue({ data: { user }, error: null }); mocks.verify.mockResolvedValue({ data: { user }, error: null }); mocks.update.mockResolvedValue({ error: null }); mocks.recover.mockResolvedValue({ error: null });
});
describe("login actions preserve the portal without granting roles", () => {
  it.each(["team", "staff"])("disables account creation for %s magic links", async (portal) => { expect((await post({ action: "link", portal, identifier: "team@example.com" })).status).toBe(200); expect(mocks.link.mock.calls[0][0].options.shouldCreateUser).toBe(false); expect(new URL(mocks.link.mock.calls[0][0].options.emailRedirectTo).searchParams.get("portal")).toBe(portal); });
  it("keeps customer email signup available", async () => { await post({ action: "link", identifier: "customer@example.com" }); expect(mocks.link.mock.calls[0][0].options.shouldCreateUser).toBe(true); });
  it.each(["password", "verify", "set-password"])("rejects a client using internal %s even with admin metadata", async (action) => { const result = await post({ action, portal: "team", role: "admin", identifier: action === "password" ? "client@example.com" : "+2348012345678", password: "password123", token: "123456" }); expect(result.status).toBe(403); expect(mocks.update).not.toHaveBeenCalled(); });
  it.each(["admin", "staff"])("accepts %s at the team entry after a database role check", async (role) => { mocks.profile.mockResolvedValue({ data: { role }, error: null }); const result = await post({ action: "password", portal: "team", identifier: "team@example.com", password: "password123" }); const target = new URL((await result.json()).redirect, "https://brixer.example"); expect(result.status).toBe(200); expect(target.searchParams.get("portal")).toBe("team"); });
  it("requires the staff role on staff-only login", async () => { mocks.profile.mockResolvedValue({ data: { role: "admin" }, error: null }); expect((await post({ action: "password", portal: "staff", identifier: "owner@example.com", password: "password123" })).status).toBe(403); });
  it("retains the portal and destination through password recovery", async () => { await post({ action: "recover", portal: "team", identifier: "admin@example.com", next: "/admin/orders/job" }); const callback = new URL(mocks.recover.mock.calls[0][1].redirectTo); const setup = new URL(callback.searchParams.get("next")!, callback); expect(callback.searchParams.get("portal")).toBe("team"); expect(setup.pathname).toBe("/auth/set-password"); expect(setup.searchParams.get("next")).toBe("/admin/orders/job"); });
});

describe("direct phone OTP", () => {
  it("creates a first-time client using phone OTP without an email step", async () => {
    const response = await post({ action: "phone", identifier: "08012345678" });
    expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ otpSent: true, phone: "+2348012345678" });
    expect(mocks.link).toHaveBeenCalledWith({ phone: "+2348012345678", options: { shouldCreateUser: true } });
    expect(mocks.rpc.mock.calls.every(([name]) => name === "auth_attempt")).toBe(true);
  });
  it.each(["team", "staff"])("does not create phone users through the %s portal", async (portal) => {
    expect((await post({ action: "phone", portal, identifier: "08012345678" })).status).toBe(200);
    expect(mocks.link).toHaveBeenCalledWith({ phone: "+2348012345678", options: { shouldCreateUser: false } });
  });
  it("rejects the retired enrollment action", async () => { expect((await post({ action: "enroll", identifier: "08012345678" })).status).toBe(400); expect(mocks.update).not.toHaveBeenCalled(); });
});
