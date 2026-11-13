import crypto from "node:crypto";
import { z } from "zod";
import { env } from "@/lib/env";
import { signedUploadUrl } from "@/lib/r2";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizedOrder } from "@/lib/order-access";
import { AccessError, errorResponse } from "@/lib/access";
import { validateUploadField } from "@/lib/upload-access";
const schema = z.object({ orderId: z.uuid(), fileName: z.string().min(1).max(180), contentType: z.enum(["application/pdf", "image/jpeg", "image/png"]), size: z.number().int().positive().max(10 * 1024 * 1024), kind: z.enum(["application", "completed", "banking"]).default("application"), fieldId: z.string().min(1).max(80).optional(), informationRequestId: z.uuid().optional() });
export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    if (env.demoMode) throw new AccessError("Uploads require a configured account and private storage. Preview files are not saved.", 503);
    const { order, user, owner, operator, supabase } = await authorizedOrder(input.orderId);
    if (input.kind !== "application" && !operator) throw new AccessError("Only authorized staff can upload output documents.", 403);
    if (input.kind === "application" && !owner) throw new AccessError("Only the customer can submit application files.", 403);
    if (!["paid", "deposit_paid"].includes(order.payment_state)) throw new AccessError("Payment must be confirmed before uploading.", 409);
    await validateUploadField(supabase, order, input);
    const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120);
    const key = `staging/${user.id}/${order.id}/${crypto.randomUUID()}-${safeName}`;
    const uploadUrl = await signedUploadUrl(key, input.contentType);
    const { data: intent, error } = await createAdminClient().from("upload_intents").insert({ order_id: order.id, uploaded_by: user.id, kind: input.kind, field_id: input.fieldId ?? null, information_request_id: input.informationRequestId ?? null, object_key: key, file_name: input.fileName, content_type: input.contentType, size_bytes: input.size }).select("id").single();
    if (error || !intent) throw new Error("Unable to authorize upload.");
    return Response.json({ uploadUrl, key, uploadId: intent.id, expiresIn: 600 });
  } catch (error) { return errorResponse(error); }
}
