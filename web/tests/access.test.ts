// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ env: { demoMode: true }, createClient: vi.fn(), getUser: vi.fn(), profile: vi.fn(), redirect: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`); }) }));
vi.mock("@/lib/env", () => ({ env: mocks.env }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
import { protectPage, requireUser } from "@/lib/access";
beforeEach(() => {
  vi.clearAllMocks(); mocks.env.demoMode = true;
  mocks.getUser.mockResolvedValue({ data: { user: { id: "verified-user", app_metadata: { role: "admin" } } }, error: null });
  mocks.profile.mockResolvedValue({ data: { id: "verified-user", role: "client" }, error: null });
  mocks.createClient.mockResolvedValue({ auth: { getUser: mocks.getUser }, from: vi.fn(() => ({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: mocks.profile })) });
});
describe("database role authorization", () => {
  it("does not trust admin-looking authentication metadata", async () => { await expect(requireUser(["admin"])).rejects.toMatchObject({ status: 403 }); });
  it.each(["admin", "staff"] as const)("requires an authenticated %s role even in preview mode", async (role) => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(protectPage(role)).rejects.toThrow(`REDIRECT:/${role}/login`);
    expect(mocks.getUser).toHaveBeenCalled();
  });
  it.each(["admin", "staff"] as const)("denies a client entry to the %s dashboard", async (role) => { await expect(protectPage(role)).rejects.toThrow(`/${role}/login?portal=`); expect(mocks.redirect.mock.calls[0][0]).toContain("error=role"); });
  it.each(["admin", "staff"] as const)("accepts the actual database %s role", async (role) => { mocks.profile.mockResolvedValue({ data: { id: "verified-user", role }, error: null }); await expect(protectPage(role)).resolves.toMatchObject({ profile: { role } }); expect(mocks.redirect).not.toHaveBeenCalled(); });
  it("does not admit an admin to staff-only pages", async () => { mocks.profile.mockResolvedValue({ data: { role: "admin" }, error: null }); await expect(protectPage("staff")).rejects.toThrow("/staff/login"); });
  it("fails closed when the database profile cannot be read", async () => { mocks.profile.mockResolvedValue({ data: null, error: new Error("Unavailable") }); await expect(protectPage("admin")).rejects.toThrow("error=configuration"); });
});
