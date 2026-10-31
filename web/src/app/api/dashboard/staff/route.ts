import { NextResponse } from "next/server";
import { services } from "@/config/services";
import { availableJobs } from "@/lib/demo-data";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  if (env.demoMode) return NextResponse.json({ jobs: availableJobs });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["staff", "admin"].includes(profile.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { data, error } = await supabase.from("orders").select("reference, service_code, customer_name, payment_plan, payment_state").is("assigned_staff_id", null).eq("stage", "received").neq("payment_state", "pending").order("created_at", { ascending: true }).limit(20);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const jobs = (data ?? []).map((order) => { const service = services.find((item) => item.code === order.service_code); return { id: order.reference, service: service?.name ?? order.service_code, client: order.customer_name, detail: `${order.payment_plan === "full" ? "Full payment" : "Deposit paid"} · Application ready`, earning: service ? Math.round(service.priceKobo * service.staffRate) : 0, category: service?.categoryLabel ?? "Compliance" }; });
  return NextResponse.json({ jobs });
}
