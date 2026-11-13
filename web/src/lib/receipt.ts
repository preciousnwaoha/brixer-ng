import crypto from "node:crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ServiceDefinition } from "@/types";
export interface Receipt { reference: string; checkoutId: string; lines: { name: string; quantity: number; priceKobo: number; timeline: string; paidKobo: number; balanceKobo: number }[] }
export function setReceiptCookie(response: NextResponse, receipt: Receipt) {
  // Production receipts stay in the DB; the signed cookie is only proof of checkout context.
  const payload = { reference: receipt.reference, checkoutId: receipt.checkoutId, expiresAt: Date.now() + 86400000, ...(env.demoMode ? { lines: receipt.lines } : {}) };
  let body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  if (body.length > 3600) body = Buffer.from(JSON.stringify({ ...payload, lines: undefined })).toString("base64url");
  const signature = crypto.createHmac("sha256", process.env.PAYSTACK_SECRET_KEY!).update(body).digest("base64url");
  response.cookies.set("brx-receipt", `${body}.${signature}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 86400 });
}
export async function readReceipt(reference: string): Promise<Receipt | null> {
  try {
    const raw = (await cookies()).get("brx-receipt")?.value;
    if (!raw || !process.env.PAYSTACK_SECRET_KEY) return null;
    const [body, signature] = raw.split(".");
    const expected = crypto.createHmac("sha256", process.env.PAYSTACK_SECRET_KEY).update(body).digest("base64url");
    if (!signature || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const receipt = JSON.parse(Buffer.from(body, "base64url").toString()) as Receipt & { expiresAt: number };
    if (receipt.reference !== reference || receipt.expiresAt < Date.now()) return null;
    if (env.demoMode) return receipt.lines ? receipt : null;
    const { data, error } = await createAdminClient().from("orders").select("service_snapshot,total_kobo,paid_kobo").eq("checkout_id", receipt.checkoutId).order("reference");
    if (error) return null;
    receipt.lines = (data ?? []).map((order) => ({ name: (order.service_snapshot as ServiceDefinition).name, quantity: 1, priceKobo: Number(order.total_kobo), timeline: (order.service_snapshot as ServiceDefinition).timeline, paidKobo: Number(order.paid_kobo), balanceKobo: Math.max(0, Number(order.total_kobo) - Number(order.paid_kobo)) }));
    return receipt;
  } catch { return null; }
}
