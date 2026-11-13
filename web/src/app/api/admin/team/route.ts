import { z } from "zod";
import { requireUser, errorResponse, AccessError } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
export async function GET() {
  try {
    const { supabase } = await requireUser(["admin"]);
    const [staff, payouts] = await Promise.all([supabase.from("profiles").select("id,full_name,staff_code,role").in("role", ["staff", "admin"]), supabase.from("payout_requests").select("*,profiles!payout_requests_user_id_fkey(full_name)").eq("status", "requested").order("created_at")]);
    if (staff.error || payouts.error) throw new Error("Unable to load team or payout requests.");
    return Response.json({ staff: staff.data, payouts: payouts.data });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    const input = z.object({ orderId: z.uuid(), staffId: z.uuid().nullable() }).parse(await request.json());
    const { user } = await requireUser(["admin"]); const admin = createAdminClient();
    if (input.staffId) { const { data: staff } = await admin.from("profiles").select("id").eq("id", input.staffId).in("role", ["staff", "admin"]).single(); if (!staff) throw new Error("Choose an active team account."); }
    const { data: order, error } = await admin.from("orders").update({ assigned_staff_id: input.staffId }).eq("id", input.orderId).in("payment_state", ["paid", "deposit_paid"]).select("id").single(); if (error || !order) throw new AccessError("Paid service item not found.", 404);
    await admin.from("audit_logs").insert({ actor_id: user.id, action: "job_assigned", entity_type: "order", entity_id: order.id, metadata: { staffId: input.staffId } });
    return Response.json({ saved: true });
  } catch (error) { return errorResponse(error); }
}
