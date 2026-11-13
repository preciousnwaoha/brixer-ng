import { requireUser, AccessError } from "@/lib/access";
export async function authorizedOrder(orderId: string, mode: "read" | "client" | "operator" = "read") {
  const auth = await requireUser();
  const { data: order, error } = await auth.supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (error || !order) throw new AccessError("Service item not found.", 404);
  const { data: hasAccess, error: accessError } = await auth.supabase.rpc("can_access_customer_order", { p_order_id: order.id });
  if (accessError) throw new AccessError("Unable to verify order access.", 503);
  const owner = auth.profile.role === "client" && hasAccess === true;
  const operator = auth.profile.role === "admin" || (auth.profile.role === "staff" && order.assigned_staff_id === auth.user.id);
  if ((mode === "client" && !owner) || (mode === "operator" && !operator) || (mode === "read" && !owner && !operator)) throw new AccessError("You cannot access this service item.", 403);
  return { ...auth, order, owner, operator };
}
