import { requireUser, errorResponse } from "@/lib/access";
import { loadOrders } from "@/lib/dashboard-data";
export async function GET() {
  try {
    const { supabase, profile } = await requireUser(["admin"]);
    const [orders, payments, options, notifications] = await Promise.all([loadOrders(supabase), supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(500), supabase.from("service_options").select("*"), supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(30)]);
    for (const result of [payments, options, notifications]) if (result.error) throw result.error;
    return Response.json({ profile, orders, payments: payments.data, options: options.data, notifications: notifications.data });
  } catch (error) { return errorResponse(error); }
}
