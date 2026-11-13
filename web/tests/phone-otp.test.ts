// @vitest-environment node
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), update: vi.fn(), maybeSingle: vi.fn() }));
vi.mock("@/lib/env", () => ({ env: { whatsappEnabled: true } }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc: mocks.rpc, from: () => ({ update: mocks.update, select: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }) }) }) }));
import { encryptOtp, decryptOtp, otpPhoneHash, dispatchPhoneOtp, fallbackOtpToSms, recordOtpWhatsAppStatus, sendTermiiOtp } from "@/lib/phone-otp";
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv("AUTH_OTP_DELIVERY_KEY", "ab".repeat(32)); vi.stubEnv("TERMII_API_KEY", "test"); vi.stubEnv("TERMII_BASE_URL", "https://api.ng.termii.com"); vi.stubEnv("TERMII_SENDER_ID", "Brixer");
  vi.stubEnv("WHATSAPP_ACCESS_TOKEN", "test"); vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "sender"); vi.stubEnv("WHATSAPP_AUTH_TEMPLATE", "login_otp");
  const chain = { eq: vi.fn().mockReturnThis(), then: (resolve: (value: object) => unknown) => Promise.resolve({ error: null }).then(resolve) }; mocks.update.mockReturnValue(chain);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("phone OTP delivery", () => {
  it("encrypts fallback codes and binds ciphertext to its delivery", () => {
    const value = encryptOtp("attempt", { phone: "+2348012345678", otp: "123456", preferSms: false });
    expect(value).not.toContain("123456"); expect(decryptOtp("attempt", value).otp).toBe("123456"); expect(() => decryptOtp("another-attempt", value)).toThrow();
    expect(otpPhoneHash("08012345678")).toBe(otpPhoneHash("+2348012345678"));
  });
  it("uses the transactional Termii route and checks provider acceptance", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: "ok", message_id: "sms-id" }))); vi.stubGlobal("fetch", fetch);
    expect(await sendTermiiOtp("08012345678", "123456")).toBe("sms-id");
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({ channel: "dnd", to: "2348012345678" });
    fetch.mockResolvedValue(new Response(JSON.stringify({ code: "insufficient_balance" }))); await expect(sendTermiiOtp("08012345678", "123456")).rejects.toThrow();
  });
  it("falls back to SMS with the same code when WhatsApp rejects delivery", async () => {
    const delivery = { id: "attempt", ciphertext: encryptOtp("attempt", { phone: "+2348012345678", otp: "123456", preferSms: false }) };
    mocks.rpc.mockResolvedValue({ data: delivery, error: null });
    const fetch = vi.fn().mockResolvedValueOnce(new Response("{}", { status: 400 })).mockResolvedValueOnce(new Response(JSON.stringify({ code: "ok", message_id: "sms" }))); vi.stubGlobal("fetch", fetch);
    await dispatchPhoneOtp("attempt"); expect(fetch).toHaveBeenCalledTimes(2); expect(JSON.parse(fetch.mock.calls[1][1].body).sms).toContain("123456"); expect(mocks.update).toHaveBeenCalledWith({ status: "sms", ciphertext: null });
  });
  it("sends no duplicate or expired fallback when the database refuses the claim", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null }); const fetch = vi.fn(); vi.stubGlobal("fetch", fetch); await fallbackOtpToSms("expired"); expect(fetch).not.toHaveBeenCalled();
  });
  it("accepts a signed-failure callback only for a known OTP message", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null }); const fetch = vi.fn(); vi.stubGlobal("fetch", fetch); await recordOtpWhatsAppStatus("unrelated-order-update", "failed"); expect(mocks.rpc).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
  });
});
