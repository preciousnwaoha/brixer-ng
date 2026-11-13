import { authorizedOrder } from "@/lib/order-access";
import { AccessError, errorResponse } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { issueActionSchema, validateIssueAnswers } from "@/lib/issue-fields";
import { dispatchOrderEvents } from "@/lib/events";
import { env } from "@/lib/env";
import type { InformationRequest } from "@/types/operations";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; issueId: string }> }) {
  try {
    if (env.demoMode) throw new AccessError("Preview issues are not saved.", 503);
    const input = issueActionSchema.parse(await request.json()); const { id, issueId } = await params;
    const { order, user, supabase, profile } = await authorizedOrder(id, input.action === "submit" ? "client" : "operator");
    if (input.action !== "submit" && profile.role !== "admin") throw new AccessError("Admin access required.", 403);
    const { data: issue, error: issueError } = await supabase.from("order_issues").select("id").eq("id", issueId).eq("order_id", order.id).maybeSingle();
    if (issueError || !issue) throw new AccessError("Issue not found.", 404);
    let answers: Record<string, string> | null = null;
    if (input.action === "submit") {
      const [fields, documents] = await Promise.all([
        supabase.from("information_requests").select("*").eq("order_id", order.id).eq("issue_id", issueId),
        supabase.from("documents").select("id,information_request_id,content_type").eq("order_id", order.id).eq("kind", "application")
      ]);
      if (fields.error || documents.error || !fields.data?.length) throw new Error("Unable to load issue requirements.");
      answers = validateIssueAnswers(fields.data as InformationRequest[], input.answers, documents.data ?? []);
    }
    const { error } = await createAdminClient().rpc("change_order_issue", { p_order_id: order.id, p_issue_id: issueId, p_actor_id: user.id, p_action: input.action, p_answers: answers, p_message: input.action === "reopen" ? input.message : null });
    if (error) throw new AccessError(error.message, 409);
    await dispatchOrderEvents(order.id);
    return Response.json({ saved: true });
  } catch (error) { return errorResponse(error); }
}
