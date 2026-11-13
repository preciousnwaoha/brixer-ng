import { z } from "zod";
import { headObject, sealUpload } from "@/lib/r2";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizedOrder } from "@/lib/order-access";
import { errorResponse, AccessError } from "@/lib/access";
import { validateUploadField } from "@/lib/upload-access";
import { dispatchOrderEvents } from "@/lib/events";
const schema = z.object({ orderId: z.uuid(), uploadId: z.uuid() });
export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const { user, order, supabase, owner, operator } = await authorizedOrder(input.orderId);
    const admin = createAdminClient();
    const { data: intent } = await admin.from("upload_intents").select("*").eq("id", input.uploadId).eq("order_id", input.orderId).eq("uploaded_by", user.id).single();
    if (!intent) throw new AccessError("Upload authorization not found.", 404);
    if (intent.finalized_at) { const { data } = await admin.from("documents").select("id").eq("object_key", `documents/${input.orderId}/${intent.id}`).single(); return Response.json({ stored: true, documentId: data?.id }); }
    if ((intent.kind === "application" && !owner) || (intent.kind !== "application" && !operator)) throw new AccessError("Upload access denied.", 403);
    await validateUploadField(supabase, order, { kind: intent.kind, fieldId: intent.field_id, informationRequestId: intent.information_request_id, contentType: intent.content_type });
    if (Date.parse(intent.expires_at) < Date.now()) throw new Error("Upload authorization expired. Select the file again.");
    const object = await headObject(intent.object_key);
    if (object.ContentLength !== Number(intent.size_bytes) || object.ContentType !== intent.content_type) throw new Error("Uploaded file failed size or type validation.");
    const finalKey = `documents/${input.orderId}/${intent.id}`;
    await sealUpload(intent.object_key, finalKey);
    const { data, error } = await admin.rpc("finalize_upload", { p_upload_id: intent.id, p_user_id: user.id, p_key: finalKey, p_etag: object.ETag ?? null });
    if (error) throw error;
    await dispatchOrderEvents(input.orderId);
    return Response.json({ stored: true, documentId: data });
  } catch (error) { return errorResponse(error); }
}
