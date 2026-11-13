import { createAdminClient } from "@/lib/supabase/admin";
import { processOutbox } from "@/lib/outbox";
export async function dispatchOrderEvents(orderId: string) {
  try {
    const { data, error } = await createAdminClient().from("notifications").select("id").eq("order_id", orderId).order("created_at", { ascending: false }).limit(25);
    if (error) throw error;
    return await processOutbox((data ?? []).map((n) => n.id));
  } catch { console.error("Order saved; notification delivery needs administrator retry."); return []; }
}
