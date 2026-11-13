import { z } from "zod";
import { env } from "@/lib/env";
import { requireUser, errorResponse, AccessError } from "@/lib/access";
import { serviceSchema } from "@/lib/service-schema";
export async function GET() {
  try {
    const { supabase } = await requireUser(["admin"]);
    const [catalogue, options] = await Promise.all([supabase.from("services").select("definition").order("sort_order"), supabase.from("service_options").select("*").order("kind")]);
    if (catalogue.error || options.error) throw new Error("Unable to load settings.");
    return Response.json({ services: catalogue.data.map((row) => row.definition), options: options.data, readiness: { supabase: !!env.supabaseServiceKey, paystack: !!process.env.PAYSTACK_SECRET_KEY, resend: !!env.resendKey, emailHook: !!process.env.SUPABASE_EMAIL_HOOK_SECRET, storage: !!(env.r2AccountId && env.r2AccessKey && env.r2SecretKey), whatsapp: !!(env.whatsappEnabled && process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_AUTH_TEMPLATE && process.env.WHATSAPP_UPDATE_TEMPLATE && process.env.SUPABASE_SMS_HOOK_SECRET) } });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser(["admin"]);
    if (env.demoMode) throw new AccessError("Preview settings are read-only.", 503);
    const input = z.discriminatedUnion("action", [z.object({ action: z.literal("service"), definition: serviceSchema }), z.object({ action: z.literal("option"), option: z.object({ id: z.uuid().optional(), kind: z.enum(["bank", "hard_copy", "delivery"]), label: z.string().trim().min(1).max(100), description: z.string().max(1000), available: z.boolean() }) })]).parse(await request.json());
    const { error } = input.action === "service" ? await supabase.from("services").upsert({ code: input.definition.code, definition: input.definition, updated_at: new Date().toISOString() }) : await supabase.from("service_options").upsert(input.option);
    if (error) throw new Error("Unable to save settings. Check for duplicate codes, slugs, or option labels.");
    const { createAdminClient } = await import("@/lib/supabase/admin");
    await createAdminClient().from("audit_logs").insert({ actor_id: user.id, action: "settings_updated", entity_type: input.action, entity_id: input.action === "service" ? input.definition.code : input.option.id ?? input.option.label });
    return Response.json({ saved: true });
  } catch (error) { return errorResponse(error instanceof z.ZodError ? new Error(error.issues.map((issue) => issue.message).join(" ")) : error); }
}
