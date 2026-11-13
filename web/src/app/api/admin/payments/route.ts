import { z } from "zod";
import { requireUser, errorResponse } from "@/lib/access";
export async function GET(request: Request) {
  try {
    const { supabase } = await requireUser(["admin"]);
    const page = z.coerce.number().int().min(0).max(100000).parse(new URL(request.url).searchParams.get("page") ?? 0);
    const { data, error, count } = await supabase.from("payments").select("*", { count: "exact" }).order("created_at", { ascending: false }).order("id").range(page * 30, page * 30 + 29);
    if (error) throw error; return Response.json({ payments: data, total: count });
  } catch (error) { return errorResponse(error); }
}
