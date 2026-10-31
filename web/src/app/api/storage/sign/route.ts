import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { signedUploadUrl } from "@/lib/r2";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ orderId: z.uuid(), fileName: z.string().min(1).max(180), contentType: z.enum(["application/pdf", "image/jpeg", "image/png"]), size: z.number().positive().max(10 * 1024 * 1024) });

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    if (env.demoMode) return NextResponse.json({ demo: true, key: `demo/${input.fileName}` });
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: order } = await supabase.from("orders").select("id").eq("id", input.orderId).eq("user_id", user.id).maybeSingle();
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120);
    const key = `applications/${user.id}/${order.id}/${crypto.randomUUID()}-${safeName}`;
    const uploadUrl = await signedUploadUrl(key, input.contentType);
    return NextResponse.json({ uploadUrl, key, expiresIn: 600 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to authorize upload." }, { status: 400 }); }
}
