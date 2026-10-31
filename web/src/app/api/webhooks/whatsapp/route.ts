import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === process.env.WHATSAPP_VERIFY_TOKEN) return new NextResponse(url.searchParams.get("hub.challenge") ?? "", { status: 200 });
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

export async function POST() {
  // Delivery-status persistence can be expanded when the feature flag is enabled and approved templates exist.
  return NextResponse.json({ received: true });
}
