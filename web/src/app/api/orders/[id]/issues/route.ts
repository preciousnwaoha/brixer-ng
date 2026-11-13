import { authorizedOrder } from "@/lib/order-access";
import { AccessError, errorResponse } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createIssueSchema } from "@/lib/issue-fields";
import { dispatchOrderEvents } from "@/lib/events";
import { env } from "@/lib/env";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (env.demoMode) throw new AccessError("Preview issues are not saved.", 503);
    const input = createIssueSchema.parse(await request.json());
    const { order, user, profile } = await authorizedOrder((await params).id, "operator");
    if (profile.role !== "admin") throw new AccessError("Only admins can request issue details.", 403);
    const { data, error } = await createAdminClient().rpc("create_order_issue", { p_order_id: order.id, p_actor_id: user.id, p_message: input.message, p_fields: input.fields });
    if (error) throw new AccessError(error.code === "23505" ? "This item already has an unresolved issue." : error.message, 409);
    await dispatchOrderEvents(order.id);
    return Response.json({ id: data, saved: true });
  } catch (error) { return errorResponse(error); }
}
