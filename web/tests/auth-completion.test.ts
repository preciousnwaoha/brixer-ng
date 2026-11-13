// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), profile: vi.fn(), rpc: vi.fn(), exchange: vi.fn(), verify: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({ auth: { getUser: mocks.getUser, exchangeCodeForSession: mocks.exchange, verifyOtp: mocks.verify }, from: vi.fn(() => ({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: mocks.profile })), rpc: mocks.rpc })) }));
vi.mock("@/lib/env", () => ({ env: { demoMode: true } }));
import { GET as complete } from "@/app/auth/complete/route";
import { GET as callback } from "@/app/auth/callback/route";
import { GET as confirm } from "@/app/auth/confirm/route";
import { authPath, pathPortal, passwordSetupPath, resolvedDestination } from "@/lib/auth-routing";
beforeEach(() => {
  vi.clearAllMocks(); mocks.getUser.mockResolvedValue({ data: { user: { id: "verified", email_confirmed_at: "2026-11-12" } }, error: null });
  mocks.profile.mockResolvedValue({ data: { role: "client" }, error: null }); mocks.rpc.mockResolvedValue({ error: null }); mocks.exchange.mockResolvedValue({ error: null }); mocks.verify.mockResolvedValue({ error: null });
});
const request = (path: string) => new Request(`https://brixer.example${path}`);
describe("login completion by database role", () => {
  it.each([{ role: "admin", portal: "team", target: "/admin" }, { role: "staff", portal: "team", target: "/staff" }, { role: "staff", portal: "staff", target: "/staff" }, { role: "client", portal: "client", target: "/dashboard" }])("routes $role from $portal to its correct dashboard", async ({ role, portal, target }) => {
    mocks.profile.mockResolvedValue({ data: { role }, error: null });
    expect((await complete(request(`/auth/complete?portal=${portal}`))).headers.get("location")).toBe(`https://brixer.example${target}`);
    expect(mocks.rpc).toHaveBeenCalledTimes(role === "client" ? 1 : 0);
  });
  it.each([{ role: "client", portal: "team", login: "/admin/login" }, { role: "client", portal: "staff", login: "/staff/login" }, { role: "admin", portal: "staff", login: "/staff/login" }, { role: "admin", portal: "client", login: "/login" }])("rejects $role in the $portal entry", async ({ role, portal, login }) => {
    mocks.profile.mockResolvedValue({ data: { role }, error: null });
    const response = await complete(request(`/auth/complete?portal=${portal}&next=/admin&role=admin`)); const destination = new URL(response.headers.get("location")!);
    expect(destination.pathname).toBe(login); expect(destination.searchParams.get("error")).toBe("role"); expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("does not let a staff team login use an admin return path", async () => { mocks.profile.mockResolvedValue({ data: { role: "staff" }, error: null }); expect((await complete(request("/auth/complete?portal=team&next=/admin/settings"))).headers.get("location")).toBe("https://brixer.example/staff"); });
  it("retains a permitted service detail return path", async () => { mocks.profile.mockResolvedValue({ data: { role: "admin" }, error: null }); expect((await complete(request("/auth/complete?portal=team&next=/admin/orders/job"))).headers.get("location")).toBe("https://brixer.example/admin/orders/job"); });
  it("rejects a wrong role before password setup", async () => { const response = await complete(request("/auth/complete?portal=team&next=/auth/set-password")); expect(new URL(response.headers.get("location")!).searchParams.get("error")).toBe("role"); });
});
describe("authentication callback context", () => {
  it("preserves the team entry through Google code exchange", async () => { const response = await callback(request("/auth/callback?code=valid&portal=team&next=/admin/orders/job")); const target = new URL(response.headers.get("location")!); expect(target.pathname).toBe("/auth/complete"); expect(target.searchParams.get("portal")).toBe("team"); expect(target.searchParams.get("next")).toBe("/admin/orders/job"); });
  it("preserves the staff entry through magic-link verification", async () => { const response = await confirm(request("/auth/confirm?token_hash=valid&type=magiclink&portal=staff&next=/staff/orders/job")); const target = new URL(response.headers.get("location")!); expect(target.searchParams.get("portal")).toBe("staff"); expect(target.searchParams.get("next")).toBe("/staff/orders/job"); });
  it("returns an expired internal link to its original login", async () => { mocks.verify.mockResolvedValue({ error: new Error("Expired") }); const response = await confirm(request("/auth/confirm?token_hash=expired&type=magiclink&portal=team")); expect(response.headers.get("location")).toBe("https://brixer.example/admin/login?error=expired"); });
  it("keeps recovery in the same entry and prevents nested setup loops", async () => { const setup = passwordSetupPath("team", "/admin/orders/job"); expect(passwordSetupPath("team", setup)).toBe(setup); const response = await confirm(request(authPath("/auth/confirm?token_hash=recovery&type=recovery", "team", setup))); const target = new URL(response.headers.get("location")!); expect(target.searchParams.get("next")).toBe(setup); });
  it.each(["/admin/login", "/staff/login"])("does not protect the login entry %s", (path) => expect(pathPortal(path)).toBeNull());
  it.each(["//evil.example", "/auth/complete", "/admin/login"])("does not redirect repeatedly or externally to %s", (next) => expect(resolvedDestination("admin", next)).toBe("/admin"));
});

it("admits a verified phone-only client and attaches guest orders", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: { id: "phone-only", phone_confirmed_at: "2026-11-12", email_confirmed_at: null } }, error: null });
  expect((await complete(request("/auth/complete"))).headers.get("location")).toBe("https://brixer.example/dashboard"); expect(mocks.rpc).toHaveBeenCalledWith("attach_guest_orders");
});
