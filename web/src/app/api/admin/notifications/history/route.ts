import { requireUser, errorResponse } from "@/lib/access";
export async function GET() {
  try {
    const { supabase } = await requireUser(["admin"]);
    const { data, error } = await supabase.from("notification_deliveries").select("id,channel,status,provider_status,attempt_count,last_error,created_at,next_attempt_at").order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    return Response.json({ deliveries: data });
  } catch (error) { return errorResponse(error); }
}
