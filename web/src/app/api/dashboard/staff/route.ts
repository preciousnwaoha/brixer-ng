import { requireUser, errorResponse } from "@/lib/access";
import { loadOrders } from "@/lib/dashboard-data";
export async function GET() {
  try {
    const { supabase, profile, user } = await requireUser(["staff"]);
    const [orders, earnings] = await Promise.all([loadOrders(supabase), supabase.from("staff_earnings").select("amount_kobo").eq("staff_id", user.id).eq("status", "available")]);
    if (earnings.error) throw earnings.error;
    return Response.json({ profile, userId: user.id, orders, payments: [], options: [], notifications: [], earningsKobo: (earnings.data ?? []).reduce((n, row) => n + Number(row.amount_kobo), 0) });
  } catch (error) { return errorResponse(error); }
}
