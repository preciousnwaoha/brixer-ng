import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { processOutbox } from "@/lib/outbox";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!env.supabaseServiceKey) return NextResponse.json({ processed: 0, demo: true });
  const results = await processOutbox();
  return NextResponse.json({ processed: results.length, results });
}
