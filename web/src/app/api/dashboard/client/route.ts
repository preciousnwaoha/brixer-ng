import { NextResponse } from "next/server";
import { services } from "@/config/services";
import { clientOrders } from "@/lib/demo-data";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  if (env.demoMode) return NextResponse.json({ orders: clientOrders });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabase.from("orders").select("id, reference, service_code, created_at, stage, payment_plan, total_kobo, paid_kobo").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const orders = (data ?? []).map((order) => ({ id: order.id, reference: order.reference, service: services.find((service) => service.code === order.service_code)?.name ?? order.service_code, startedAt: new Intl.DateTimeFormat("en-NG", { month: "short", day: "numeric", year: "numeric" }).format(new Date(order.created_at)), stage: order.stage, paymentPlan: order.payment_plan, totalKobo: Number(order.total_kobo), paidKobo: Number(order.paid_kobo) }));
  return NextResponse.json({ orders });
}
