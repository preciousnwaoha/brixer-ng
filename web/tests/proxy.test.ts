// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn(() => ({ auth: { getUser: mocks.getUser } })) }));
import { proxy } from "@/proxy";
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true"); vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://supabase.example.invalid"); vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test"); mocks.getUser.mockResolvedValue({ data: { user: null }, error: null }); });
afterEach(() => vi.unstubAllEnvs());
describe("team route redirects", () => {
  it.each([{ path: "/admin", login: "/admin/login" }, { path: "/admin/settings?tab=services", login: "/admin/login" }, { path: "/staff/orders/job", login: "/staff/login" }])("protects $path even in preview mode", async ({ path, login }) => { const response = await proxy(new NextRequest(`https://brixer.example${path}`)); const target = new URL(response.headers.get("location")!); expect(target.pathname).toBe(login); expect(target.searchParams.get("next")).toBe(path); });
  it.each(["/admin/login", "/staff/login"])("keeps %s accessible without a session", async (path) => { const response = await proxy(new NextRequest(`https://brixer.example${path}`)); expect(response.headers.get("location")).toBeNull(); });
  it("uses the internal login screen when auth is not configured", async () => { vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", ""); const response = await proxy(new NextRequest("https://brixer.example/admin/settings")); expect(new URL(response.headers.get("location")!).pathname).toBe("/admin/login"); });
  it("passes an authenticated request to the server page role guard", async () => { mocks.getUser.mockResolvedValue({ data: { user: { id: "verified" } }, error: null }); expect((await proxy(new NextRequest("https://brixer.example/admin"))).headers.get("location")).toBeNull(); });
});
