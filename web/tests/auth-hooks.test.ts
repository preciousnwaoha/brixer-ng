// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Webhook } from "standardwebhooks";
const mocks = vi.hoisted(() => ({ send: vi.fn(), enqueue: vi.fn(), dispatch: vi.fn(), after: vi.fn() }));
vi.mock("next/server", () => ({ after: mocks.after }));
vi.mock("@/lib/phone-otp", () => ({ enqueuePhoneOtp: mocks.enqueue, dispatchPhoneOtp: mocks.dispatch }));
vi.mock("resend", () => ({ Resend: class { emails = { send: mocks.send }; } }));
vi.mock("@/lib/env", () => ({ env: { siteUrl: "https://brixer.example", resendKey: "test", whatsappEnabled: true } }));
import { handleAuthHook } from "@/lib/auth-hooks";
const secret = `whsec_${Buffer.from("01234567890123456789012345678901").toString("base64")}`;
function signed(payload: object) { const body = JSON.stringify(payload); const date = new Date(); const id = "hook-test"; return new Request("https://brixer.example/api/auth/hooks/email", { method: "POST", headers: { "webhook-id": id, "webhook-timestamp": String(Math.floor(date.getTime() / 1000)), "webhook-signature": new Webhook(secret).sign(id, date, body) }, body }); }
beforeEach(() => { vi.stubEnv("SUPABASE_EMAIL_HOOK_SECRET", secret); vi.stubEnv("SUPABASE_SMS_HOOK_SECRET", secret); mocks.send.mockResolvedValue({ data: { id: "sent" }, error: null }); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
describe("signed authentication delivery", () => {
  const data = { user: { email: "customer@example.com" }, email_data: { token_hash: "one-time-hash", email_action_type: "magiclink", redirect_to: "https://brixer.example/auth/callback?next=%2Fauth%2Fphone" } };
  it("rejects unsigned requests without sending", async () => { expect((await handleAuthHook(new Request("https://brixer.example", { method: "POST", body: "{}" }), "email")).status).toBe(401); expect(mocks.send).not.toHaveBeenCalled(); });
  it("sends a one-time link through Resend and retains the destination", async () => { expect((await handleAuthHook(signed(data), "email")).status).toBe(200); expect(mocks.send.mock.calls[0][0].html).toContain("next=%2Fauth%2Fphone"); expect(mocks.send.mock.calls[0][0].html).toContain("token_hash=one-time-hash"); });
  it("keeps the originating team portal in magic links", async () => {
    await handleAuthHook(signed({ ...data, email_data: { ...data.email_data, redirect_to: "https://brixer.example/auth/callback?portal=team&next=%2Fadmin" } }), "email");
    expect(mocks.send.mock.calls[0][0].html).toContain("portal=team");
    expect(mocks.send.mock.calls[0][0].html).toContain("next=%2Fadmin");
  });
  it("does not use an external callback destination", async () => { await handleAuthHook(signed({ ...data, email_data: { ...data.email_data, redirect_to: "https://evil.example?next=//evil.example" } }), "email"); expect(mocks.send.mock.calls[0][0].html).not.toContain("evil.example"); });
  it("reports provider errors instead of pretending delivery succeeded", async () => { mocks.send.mockResolvedValue({ error: { message: "Provider unavailable" } }); expect((await handleAuthHook(signed(data), "email")).status).toBe(503); });
  it("queues a signed OTP and dispatches after the hook response", async () => {
    mocks.enqueue.mockResolvedValue(undefined);
    expect((await handleAuthHook(signed({ user: { phone: "+2348011111111" }, sms: { otp: "123456" } }), "sms")).status).toBe(200);
    expect(mocks.enqueue).toHaveBeenCalledWith("hook-test", "+2348011111111", "123456", expect.any(Number));
    expect(mocks.dispatch).not.toHaveBeenCalled(); await mocks.after.mock.calls[0][0](); expect(mocks.dispatch).toHaveBeenCalledWith("hook-test");
  });
});
