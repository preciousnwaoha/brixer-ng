import { requireUser, errorResponse } from "@/lib/access";
export async function POST() { try { const { supabase } = await requireUser(); const { error } = await supabase.rpc("attach_guest_orders"); if (error) throw error; return Response.json({ claimed: true }); } catch (error) { return errorResponse(error); } }
