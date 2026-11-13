import { authorizedOrder } from "@/lib/order-access";
import { orderSelection, demoOrders } from "@/lib/dashboard-data";
import { errorResponse } from "@/lib/access";
import { env } from "@/lib/env";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (env.demoMode) { const order = demoOrders().find((o) => o.id === id); return order ? Response.json({ order, options: [], payments: [], operator: false }) : Response.json({ error: "Preview item not found." }, { status: 404 }); }
    const { supabase, order, operator } = await authorizedOrder(id);
    const [details, options, payments] = await Promise.all([supabase.from("orders").select(orderSelection).eq("id", order.id).single(), supabase.from("service_options").select("*").eq("available", true), supabase.from("payments").select("*,allocations:payment_allocations(order_id,amount_kobo)").or(`order_id.eq.${order.id},checkout_id.eq.${order.checkout_id}`).order("created_at", { ascending: false })]);
    for (const result of [details, options, payments]) if (result.error) throw result.error;
    return Response.json({ order: details.data, options: options.data, payments: (payments.data ?? []).filter((payment) => payment.order_id === order.id || payment.allocations?.some((allocation: { order_id: string }) => allocation.order_id === order.id)), operator });
  } catch (error) { return errorResponse(error); }
}
