import { z } from "zod";
import { cartItemsSchema, quoteCart } from "@/lib/commerce";
import { getCatalogue } from "@/lib/catalogue";
export async function POST(request: Request) {
  try {
    const input = z.object({ items: cartItemsSchema, paymentPlan: z.enum(["full", "installment"]).default("full") }).parse(await request.json());
    return Response.json(quoteCart(input.items, await getCatalogue(), input.paymentPlan));
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Unable to quote this cart." }, { status: 400 }); }
}
