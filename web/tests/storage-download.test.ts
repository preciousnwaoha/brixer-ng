// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), signedDownloadUrl: vi.fn(), document: {} as Record<string, unknown>, order: {} as Record<string, unknown>, hasGrant: false }));
vi.mock("@/lib/env", () => ({ env: { demoMode: false } }));
vi.mock("@/lib/r2", () => ({ signedDownloadUrl: mocks.signedDownloadUrl }));
vi.mock("@/lib/access", async (original) => ({ ...await original<typeof import("@/lib/access")>(), requireUser: mocks.requireUser }));
import { GET } from "@/app/api/storage/download/route";
const documentId = "11111111-1111-4111-8111-111111111111";
const request = () => new Request(`https://brixer.example/api/storage/download?id=${documentId}`);
beforeEach(() => {
  vi.clearAllMocks(); mocks.hasGrant = false; mocks.document = { id: documentId, order_id: "order", object_key: "private/result.pdf", file_name: "result.pdf", kind: "completed", released_at: "2026-11-11" };
  mocks.order = { id: "order", user_id: "client", assigned_staff_id: "assigned-staff", total_kobo: 6000000, paid_kobo: 6000000, payment_state: "paid", stage: "completed" };
  const query = (data: () => unknown) => ({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn(async () => ({ data: data() })), single: vi.fn(async () => ({ data: data() })) });
  mocks.requireUser.mockResolvedValue({ user: { id: "client" }, profile: { role: "client" }, supabase: { rpc: vi.fn(async () => ({ data: mocks.order.user_id === "client" || mocks.hasGrant, error: null })), from: vi.fn((table) => table === "documents" ? query(() => mocks.document) : query(() => mocks.order)) } });
  mocks.signedDownloadUrl.mockResolvedValue("https://storage.example/short-lived-url");
});
describe("document download authorization", () => {
  it("issues a short-lived link only after full payment and release", async () => { const result = await GET(request()); expect(result.status).toBe(200); expect(await result.json()).toMatchObject({ expiresIn: 300 }); });
  it.each([{ paid_kobo: 3000000, payment_state: "deposit_paid" }, { stage: "processing" }, { payment_state: "reversed" }, { user_id: "someone-else" }])("blocks access for %j", async (patch) => { Object.assign(mocks.order, patch); expect((await GET(request())).status).toBe(403); expect(mocks.signedDownloadUrl).not.toHaveBeenCalled(); });
  it("blocks unreleased outputs even on paid jobs", async () => { mocks.document.released_at = null; expect((await GET(request())).status).toBe(403); });
  it("keeps customer input files available while a service balance is unpaid", async () => { mocks.document.kind = "application"; mocks.document.released_at = null; mocks.order.paid_kobo = 3000000; expect((await GET(request())).status).toBe(200); });
  it("allows authorized admin work without a customer payment gate", async () => { const auth = await mocks.requireUser(); auth.profile.role = "admin"; auth.user.id = "administrator"; mocks.order.paid_kobo = 3000000; expect((await GET(request())).status).toBe(200); });
  it("does not treat an unassigned staff account as authorized", async () => { const auth = await mocks.requireUser(); auth.profile.role = "staff"; auth.user.id = "another-staff"; expect((await GET(request())).status).toBe(403); });
});

it("allows a verified guest-order grant without transferring the original owner", async () => { mocks.order.user_id = "email-owner"; mocks.hasGrant = true; expect((await GET(request())).status).toBe(200); });
