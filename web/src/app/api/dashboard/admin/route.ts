import { NextResponse } from "next/server";
import { services } from "@/config/services";
import { adminOrders } from "@/lib/demo-data";
import { env } from "@/lib/env";
import { formatNaira } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  if (env.demoMode) return NextResponse.json({ orders: adminOrders });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { data, error } = await supabase.from("orders").select("reference, customer_name, service_code, stage, payment_state, paid_kobo, total_kobo, assigned_staff_id").order("created_at", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const orders = (data ?? []).map((order) => ({ reference: order.reference, customer: order.customer_name, service: services.find((service) => service.code === order.service_code)?.name ?? order.service_code, status: order.payment_state === "deposit_paid" ? "Balance due" : order.stage[0].toUpperCase() + order.stage.slice(1), payment: order.payment_state === "paid" ? "Paid" : `${Math.round((Number(order.paid_kobo) / Number(order.total_kobo)) * 100)}%`, assignee: order.assigned_staff_id ? "Assigned" : "Unassigned", amount: formatNaira(Number(order.total_kobo)) }));
  return NextResponse.json({ orders });
}
