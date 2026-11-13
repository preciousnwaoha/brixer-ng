import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
export interface CheckoutContact { fullName?: string; email?: string; phone?: string }
export async function authenticatedBuyer() {
  if (env.demoMode || !env.supabaseUrl || !env.supabaseAnonKey) return null;
  const supabase = await createClient(); const { data: { user }, error } = await supabase.auth.getUser();
  if (error && error.name !== "AuthSessionMissingError") throw new Error("Unable to verify your login. Please log in again before paying.");
  return user && (user.email_confirmed_at || user.phone_confirmed_at) ? { user, supabase } : null;
}
export async function checkoutCustomer(): Promise<{ contact: CheckoutContact; buyerId?: string }> {
  const auth = await authenticatedBuyer();
  if (!auth) return { contact: {} };
  const { data: profile, error } = await auth.supabase.from("profiles").select("full_name,phone,role").eq("id", auth.user.id).single();
  if (error) throw new Error("Unable to load your contact details.");
  if (profile?.role !== "client") return { buyerId: auth.user.id, contact: { fullName: profile?.full_name || "", email: auth.user.email || "", phone: (auth.user.phone ? `+${auth.user.phone.replace(/^\+/, "")}` : "") || profile?.phone || "" } };
  const { error: attachError } = await auth.supabase.rpc("attach_guest_orders");
  if (attachError) throw new Error("Unable to load your checkout details.");
  const { data: guest } = await auth.supabase.from("orders").select("customer_name,customer_email,customer_phone,checkouts!inner(buyer_id)").is("checkouts.buyer_id", null).in("payment_state", ["paid", "deposit_paid"]).order("created_at", { ascending: true }).limit(1).maybeSingle();
  return { buyerId: auth.user.id, contact: { fullName: profile?.full_name || guest?.customer_name || "", email: auth.user.email || guest?.customer_email || "", phone: (auth.user.phone ? `+${auth.user.phone.replace(/^\+/, "")}` : "") || profile?.phone || guest?.customer_phone || "" } };
}
