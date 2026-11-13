import { env } from "@/lib/env";
import { requireUser, errorResponse } from "@/lib/access";
import { demoDashboard, loadOrders } from "@/lib/dashboard-data";
export async function GET() {
  if (env.demoMode) return Response.json(demoDashboard());
  try {
    const { supabase, user, profile } = await requireUser(["client"]);
    const { error } = await supabase.rpc("attach_guest_orders"); if (error) throw error;
    const [orders, options, notifications, payments, referral, ledger] = await Promise.all([loadOrders(supabase), supabase.from("service_options").select("*").eq("available", true), supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(30), supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(100), supabase.from("referral_codes").select("code").eq("user_id", user.id).maybeSingle(), supabase.from("referral_ledger").select("reward_kobo").eq("referrer_id", user.id).eq("status", "available")]);
    for (const result of [options, notifications, payments, referral, ledger]) if (result.error) throw result.error;
    return Response.json({ profile: { ...profile, email: user.email ?? null }, orders: orders.filter((order) => ["paid", "deposit_paid"].includes(order.payment_state)), options: options.data, notifications: notifications.data, payments: payments.data, referralCode: referral.data?.code, referralBalanceKobo: (ledger.data ?? []).reduce((n, row) => n + Number(row.reward_kobo), 0) });
  } catch (error) { return errorResponse(error); }
}
