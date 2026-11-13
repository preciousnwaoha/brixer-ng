// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), profile: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/env", () => ({ env: { demoMode: true } }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({ auth: { getUser: mocks.getUser }, from: mocks.from })) }));
import { GET as admin } from "@/app/api/dashboard/admin/route";
import { GET as staff } from "@/app/api/dashboard/staff/route";
import { GET as settings } from "@/app/api/admin/settings/route";
import { GET as team } from "@/app/api/admin/team/route";
import { GET as payments } from "@/app/api/admin/payments/route";
import { GET as history } from "@/app/api/admin/notifications/history/route";
import { POST as pickup } from "@/app/api/staff/jobs/pickup/route";
import { POST as stage } from "@/app/api/staff/orders/stage/route";
const request = (body?: object) => new Request("https://brixer.example/api/internal", { method: "POST", body: JSON.stringify(body ?? { jobId: "BRX-TEST", orderReference: "BRX-TEST", stage: "filing" }), headers: { "Content-Type": "application/json" } });
const routes = [{ name: "admin dashboard", run: () => admin() }, { name: "staff dashboard", run: () => staff() }, { name: "settings", run: () => settings() }, { name: "team", run: () => team() }, { name: "payments", run: () => payments(new Request("https://brixer.example/api/admin/payments")) }, { name: "notification history", run: () => history() }, { name: "job pickup", run: () => pickup(request()) }, { name: "stage changes", run: () => stage(request()) }];
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "verified-user" } }, error: null });
  mocks.profile.mockResolvedValue({ data: { id: "verified-user", full_name: "Verified account", role: "client" }, error: null });
  mocks.from.mockImplementation(() => { const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), range: vi.fn().mockReturnThis(), single: mocks.profile, then: (resolve: (result: unknown) => unknown) => Promise.resolve({ data: [], error: null, count: 0 }).then(resolve) }; return query; });
});
describe("internal APIs always authenticate against database profiles", () => {
  it.each(routes)("rejects anonymous $name access even with preview enabled", async ({ run }) => { mocks.getUser.mockResolvedValue({ data: { user: null }, error: null }); expect((await run()).status).toBe(401); expect(mocks.from).not.toHaveBeenCalled(); });
  it.each(routes)("rejects client-role $name access even with preview enabled", async ({ run }) => { expect((await run()).status).toBe(403); });
  it.each(routes.slice(0, 6).filter((r) => r.name !== "staff dashboard"))("allows database admins to read $name", async ({ run }) => { mocks.profile.mockResolvedValue({ data: { role: "admin" }, error: null }); expect((await run()).status).toBe(200); });
  it("allows staff to read their dashboard but does not substitute an admin role", async () => {
    mocks.profile.mockResolvedValue({ data: { role: "staff" }, error: null }); expect((await staff()).status).toBe(200);
    mocks.profile.mockResolvedValue({ data: { role: "admin" }, error: null }); expect((await staff()).status).toBe(403);
  });
});
