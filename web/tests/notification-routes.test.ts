// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  env: {
    demoMode: false,
    supabaseUrl: "https://supabase.example.invalid" as string | undefined,
    supabaseAnonKey: "test-anon-key" as string | undefined,
    supabaseServiceKey: "test-service-key" as string | undefined
  },
  createClient: vi.fn(),
  getUser: vi.fn(),
  profile: vi.fn(),
  processOutbox: vi.fn()
}));
vi.mock("@/lib/env", () => ({ env: mocks.env }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/outbox", () => ({ processOutbox: mocks.processOutbox }));

import { POST as handler } from "@/app/api/admin/notifications/process/route";
const POST = () => handler(new Request("https://brixer.example/api/admin/notifications/process", { method: "POST" }));

beforeEach(() => {
  vi.resetAllMocks();
  Object.assign(mocks.env, { demoMode: false, supabaseUrl: "https://supabase.example.invalid", supabaseAnonKey: "test-anon-key", supabaseServiceKey: "test-service-key" });
  const profileQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: mocks.profile };
  mocks.createClient.mockResolvedValue({ auth: { getUser: mocks.getUser }, from: vi.fn(() => profileQuery) });
  mocks.getUser.mockResolvedValue({ data: { user: { id: "admin-user" } }, error: null });
  mocks.profile.mockResolvedValue({ data: { role: "admin" }, error: null });
  mocks.processOutbox.mockResolvedValue([]);
});
afterEach(() => vi.unstubAllEnvs());

describe("manual notification delivery", () => {
  it("returns delivery counts to an authenticated administrator", async () => {
    mocks.processOutbox.mockResolvedValue([{ id: "private-delivery-1", status: "sent" }, { id: "private-delivery-2", status: "failed" }]);
    const response = await POST();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ processed: 2, sent: 1, unsuccessful: 1 });
    expect(mocks.processOutbox).toHaveBeenCalledOnce();
  });

  it("reports an empty queue", async () => {
    expect(await (await POST()).json()).toEqual({ processed: 0, sent: 0, unsuccessful: 0 });
  });

  it("rejects unsigned-in users", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await POST()).status).toBe(401);
    expect(mocks.profile).not.toHaveBeenCalled();
    expect(mocks.processOutbox).not.toHaveBeenCalled();
  });

  it("rejects an invalid session even when a user object is returned", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "admin-user" } }, error: new Error("Invalid session") });
    expect((await POST()).status).toBe(401);
    expect(mocks.processOutbox).not.toHaveBeenCalled();
  });

  it.each(["staff", "client"])("rejects the %s role", async (role) => {
    mocks.profile.mockResolvedValue({ data: { role }, error: null });
    expect((await POST()).status).toBe(403);
    expect(mocks.processOutbox).not.toHaveBeenCalled();
  });

  it("fails closed if administrator access cannot be verified", async () => {
    mocks.profile.mockResolvedValue({ data: null, error: new Error("Database unavailable") });
    expect((await POST()).status).toBe(503);
    expect(mocks.processOutbox).not.toHaveBeenCalled();
  });

  it.each(["supabaseUrl", "supabaseAnonKey", "supabaseServiceKey"] as const)("requires %s in live mode", async (key) => {
    mocks.env[key] = undefined;
    expect((await POST()).status).toBe(503);
    expect(mocks.processOutbox).not.toHaveBeenCalled();
  });

  it("performs no work in demo mode even with service credentials configured", async () => {
    mocks.env.demoMode = true;
    const response = await POST();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ processed: 0, sent: 0, unsuccessful: 0, demo: true });
    expect(mocks.createClient).toHaveBeenCalled();
    expect(mocks.profile).toHaveBeenCalled();
    expect(mocks.processOutbox).not.toHaveBeenCalled();
  });

  it("requires a database admin role even in preview mode", async () => {
    mocks.env.demoMode = true;
    mocks.profile.mockResolvedValue({ data: { role: "client" }, error: null });
    expect((await POST()).status).toBe(403);
    expect(mocks.processOutbox).not.toHaveBeenCalled();
  });

  it("does not expose worker error details or report a failed batch as successful", async () => {
    mocks.processOutbox.mockRejectedValue(new Error("recipient@example.com private provider response"));
    const response = await POST();
    expect(response.status).toBe(500);
    const body = await response.text();
    expect(body).toContain("Some messages may already have been sent");
    expect(body).not.toContain("recipient@example.com");
    expect(body).not.toContain("private provider response");
  });
});
