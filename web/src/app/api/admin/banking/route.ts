import { z } from "zod";
import { requireUser, errorResponse } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
export async function POST(request: Request) {
  try {
    const input = z.object({ id: z.uuid(), bankName: z.string().max(100), status: z.enum(["awaiting_details", "routed", "processing", "completed"]) }).parse(await request.json());
    await requireUser(["admin"]); const admin = createAdminClient();
    const { data: bank } = await admin.from("service_options").select("id").eq("kind", "bank").eq("label", input.bankName).eq("available", true).maybeSingle(); if (!bank) throw new Error("Choose an available partner bank.");
    const { error } = await admin.from("bank_requests").update({ bank_name: input.bankName, status: input.status, routed_at: input.status === "routed" ? new Date().toISOString() : undefined }).eq("id", input.id); if (error) throw error;
    return Response.json({ saved: true });
  } catch (error) { return errorResponse(error); }
}
