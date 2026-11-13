import { z } from "zod";
import { env } from "@/lib/env";
import { requireUser, errorResponse, AccessError } from "@/lib/access";
export async function POST(request: Request) {
  try {
    const { supabase } = await requireUser(["admin", "staff"]);
    if (env.demoMode) throw new AccessError("Preview jobs are read-only.", 503);
    const { jobId } = z.object({ jobId: z.string().min(1).max(120) }).parse(await request.json());
    const { error } = await supabase.rpc("pickup_job", { p_order_reference: jobId });
    if (error) throw new AccessError(error.message, 409);
    return Response.json({ pickedUp: jobId });
  } catch (error) { return errorResponse(error); }
}
