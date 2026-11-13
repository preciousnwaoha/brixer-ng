import { z } from "zod";
import { env } from "@/lib/env";
import { signedDownloadUrl } from "@/lib/r2";
import { requireUser, errorResponse, AccessError } from "@/lib/access";
import { canDownloadOutput } from "@/lib/commerce";
export async function GET(request: Request) {
  try {
    const id = z.uuid().parse(new URL(request.url).searchParams.get("id"));
    if (env.demoMode) throw new AccessError("Preview documents are illustrative.", 404);
    const { supabase, user, profile } = await requireUser();
    const { data: document } = await supabase.from("documents").select("*").eq("id", id).maybeSingle();
    if (!document) throw new AccessError("Document not found.", 404);
    const { data: order } = await supabase.from("orders").select("*").eq("id", document.order_id).single();
    if (!order) throw new AccessError("Service item not found.", 404);
    const operator = profile.role === "admin" || (profile.role === "staff" && order.assigned_staff_id === user.id);
    if (!operator) {
      if (profile.role !== "client") throw new AccessError("You cannot access this document.", 403);
      const { data: allowed, error } = await supabase.rpc("can_access_customer_order", { p_order_id: order.id });
      if (error || allowed !== true) throw new AccessError("You cannot access this document.", 403);
      if (document.kind !== "application" && !canDownloadOutput(order, !!document.released_at)) throw new AccessError("Settle this service item’s balance to download its completed documents. Documents must also be marked ready by the team.", 403);
    }
    return Response.json({ url: await signedDownloadUrl(document.object_key, document.file_name), expiresIn: 300 }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return errorResponse(error); }
}
