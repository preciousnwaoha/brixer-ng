import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { headObject } from "@/lib/r2";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ orderId: z.uuid(), key: z.string().min(5), fileName: z.string().min(1).max(180), contentType: z.enum(["application/pdf", "image/jpeg", "image/png"]), fieldId: z.string().min(1).max(80) });

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    if (env.demoMode) return NextResponse.json({ stored: true, demo: true });
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !input.key.startsWith(`applications/${user.id}/${input.orderId}/`)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const object = await headObject(input.key);
    if (!object.ContentLength || object.ContentLength > 10 * 1024 * 1024 || object.ContentType !== input.contentType) return NextResponse.json({ error: "Uploaded file failed validation." }, { status: 400 });
    const { error } = await supabase.from("documents").insert({ order_id: input.orderId, owner_id: user.id, kind: "application", field_id: input.fieldId, object_key: input.key, file_name: input.fileName, content_type: input.contentType, size_bytes: object.ContentLength, etag: object.ETag?.replaceAll('"', "") });
    if (error) throw error;
    return NextResponse.json({ stored: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to finalize upload." }, { status: 400 }); }
}
