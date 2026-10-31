import { NextResponse } from "next/server";
import { fulfillPayment } from "@/lib/fulfillment";
import { validPaystackSignature } from "@/lib/paystack";

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!validPaystackSignature(rawBody, request.headers.get("x-paystack-signature"))) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  const event = JSON.parse(rawBody);
  if (event.event === "charge.success") {
    try {
      await fulfillPayment({ reference: event.data.reference, amount: event.data.amount, currency: event.data.currency, status: event.data.status, providerId: event.data.id, payload: event.data });
    } catch (error) {
      console.error("Paystack fulfillment failed", error);
      return NextResponse.json({ error: "Fulfillment failed" }, { status: 500 });
    }
  }
  return NextResponse.json({ received: true });
}
