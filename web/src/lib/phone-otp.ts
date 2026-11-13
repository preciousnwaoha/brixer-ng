import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/commerce";
import { env } from "@/lib/env";

function encryptionKey() {
  const value = process.env.AUTH_OTP_DELIVERY_KEY ?? "";
  const key = Buffer.from(value, /^[a-f0-9]{64}$/i.test(value) ? "hex" : "base64");
  if (key.length !== 32) throw new Error("Phone login delivery is not configured.");
  return key;
}
export function otpPhoneHash(phone: string) { return crypto.createHmac("sha256", encryptionKey()).update(normalizePhone(phone)).digest("hex"); }
export function encryptOtp(id: string, payload: { phone: string; otp: string; preferSms: boolean }) {
  const iv = crypto.randomBytes(12); const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv); cipher.setAAD(Buffer.from(id));
  const data = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((part) => part.toString("base64url")).join(".");
}
export function decryptOtp(id: string, value: string): { phone: string; otp: string; preferSms: boolean } {
  const [iv, tag, ciphertext] = value.split(".").map((part) => Buffer.from(part, "base64url"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), iv); decipher.setAAD(Buffer.from(id)); decipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8"));
}
function whatsappConfigured() { return !!(env.whatsappEnabled && process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_AUTH_TEMPLATE); }
function termiiConfigured() { return !!(process.env.TERMII_API_KEY && process.env.TERMII_BASE_URL && process.env.TERMII_SENDER_ID); }
export function phoneOtpAvailable() {
  try { encryptionKey(); return whatsappConfigured() || termiiConfigured(); } catch { return false; }
}
export async function sendTermiiOtp(phone: string, otp: string) {
  if (!termiiConfigured()) throw new Error("SMS delivery is not configured.");
  const base = new URL(process.env.TERMII_BASE_URL!);
  if (base.protocol !== "https:") throw new Error("The SMS provider URL must use HTTPS.");
  const response = await fetch(new URL("/api/sms/send", base), { method: "POST", signal: AbortSignal.timeout(12000), headers: { "Content-Type": "application/json" }, body: JSON.stringify({ api_key: process.env.TERMII_API_KEY, to: normalizePhone(phone).slice(1), from: process.env.TERMII_SENDER_ID, sms: `Your Brixer login code is ${otp}. Do not share this code.`, type: "plain", channel: "dnd" }) });
  const data = await response.json();
  if (!response.ok || data.code !== "ok") throw new Error("Unable to deliver the SMS code. Request another code or use email.");
  return String(data.message_id ?? data.message_id_str ?? "");
}
export async function enqueuePhoneOtp(id: string, phone: string, otp: string, issuedAt: number) {
  if (!phoneOtpAvailable()) throw new Error("Phone login is temporarily unavailable. Use your email or Google.");
  if (!id || !/^\d{6,10}$/.test(otp)) throw new Error("Invalid phone authentication request.");
  const lifetime = Number(process.env.AUTH_OTP_EXPIRY_SECONDS ?? "600");
  if (!Number.isInteger(lifetime) || lifetime < 60 || lifetime > 3600) throw new Error("Phone login expiry is not configured correctly.");
  const expiresAt = new Date(issuedAt + lifetime * 1000);
  if (expiresAt.getTime() <= Date.now()) throw new Error("This code has expired. Request another code.");
  phone = normalizePhone(phone.startsWith("+") ? phone : `+${phone}`);
  const admin = createAdminClient(); const phoneHash = otpPhoneHash(phone);
  const { data: previous, error: previousError } = await admin.from("auth_otp_deliveries").select("id,status").eq("phone_hash", phoneHash).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (previousError) throw new Error("Unable to prepare phone login.");
  const preferSms = !!(previous && previous.id !== id && ["queued", "sending", "whatsapp", "failed", "sms_sending", "sms"].includes(previous.status) && termiiConfigured());
  const { error } = await admin.from("auth_otp_deliveries").insert({ id, phone_hash: phoneHash, ciphertext: encryptOtp(id, { phone: normalizePhone(phone), otp, preferSms }), status: "queued", expires_at: expiresAt.toISOString() });
  if (error && error.code !== "23505") throw new Error("Unable to queue phone login.");
}
export async function fallbackOtpToSms(id: string) {
  const admin = createAdminClient();
  const { data: delivery, error } = await admin.rpc("claim_otp_sms", { p_id: id });
  if (error) throw new Error("Unable to prepare SMS fallback.");
  if (!delivery?.id || !delivery.ciphertext) return;
  try {
    const { phone, otp } = decryptOtp(delivery.id, delivery.ciphertext);
    await sendTermiiOtp(phone, otp);
    const { error: saved } = await admin.from("auth_otp_deliveries").update({ status: "sms", ciphertext: null }).eq("id", delivery.id).eq("status", "sms_sending"); if (saved) throw saved;
  } catch {
    await admin.from("auth_otp_deliveries").update({ status: "failed" }).eq("id", delivery.id).eq("status", "sms_sending");
    throw new Error("Phone code delivery failed. Request another code or use email.");
  }
}
export async function dispatchPhoneOtp(id: string) {
  const admin = createAdminClient();
  const { data: delivery, error } = await admin.rpc("claim_otp_delivery", { p_id: id });
  if (error) throw new Error("Unable to start phone code delivery.");
  if (!delivery?.id || !delivery.ciphertext) return;
  const payload = decryptOtp(id, delivery.ciphertext);
  if (whatsappConfigured() && !payload.preferSms) {
    try {
      const response = await fetch(`https://graph.facebook.com/${process.env.WHATSAPP_GRAPH_VERSION ?? "v23.0"}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, { method: "POST", signal: AbortSignal.timeout(12000), headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ messaging_product: "whatsapp", to: payload.phone.slice(1), type: "template", template: { name: process.env.WHATSAPP_AUTH_TEMPLATE, language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? "en" }, components: [{ type: "body", parameters: [{ type: "text", text: payload.otp }] }, { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: payload.otp }] }] } }) });
      const result = await response.json(); if (!response.ok || !result.messages?.[0]?.id) throw new Error("WhatsApp delivery failed.");
      const { error: saved } = await admin.from("auth_otp_deliveries").update({ status: "whatsapp", provider_id: result.messages[0].id }).eq("id", id).eq("status", "sending"); if (saved) throw saved;
      return;
    } catch { /* The same Supabase code is sent through SMS below. */ }
  }
  await admin.from("auth_otp_deliveries").update({ status: "failed" }).eq("id", id).eq("status", "sending");
  await fallbackOtpToSms(id);
}
export async function recordOtpWhatsAppStatus(providerId: string, status: string) {
  const admin = createAdminClient();
  const { data: delivery, error } = await admin.from("auth_otp_deliveries").select("id").eq("provider_id", providerId).maybeSingle();
  if (error) throw error;
  if (!delivery) return;
  if (status === "failed") await fallbackOtpToSms(delivery.id);
  else if (["delivered", "read"].includes(status)) await admin.from("auth_otp_deliveries").update({ ciphertext: null }).eq("id", delivery.id).eq("status", "whatsapp");
}
export async function clearVerifiedOtps(phone: string) {
  const { error } = await createAdminClient().from("auth_otp_deliveries").update({ status: "verified", ciphertext: null }).eq("phone_hash", otpPhoneHash(phone));
  if (error) throw new Error("Unable to finish phone verification.");
}
