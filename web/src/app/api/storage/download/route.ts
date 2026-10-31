import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { signedDownloadUrl } from "@/lib/r2";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return NextResponse.json({ error: "Invalid document" }, { status: 400 });
  if (env.demoMode) return NextResponse.json({ error: "Demo documents are illustrative." }, { status: 404 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: document } = await supabase.from("documents").select("object_key,file_name").eq("id", parsed.data).maybeSingle();
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  const url = await signedDownloadUrl(document.object_key, document.file_name);
  return NextResponse.json({ url, expiresIn: 300 });
}
