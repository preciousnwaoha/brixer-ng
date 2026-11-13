import { getCatalogue } from "@/lib/catalogue";
export async function GET() {
  try { return Response.json({ services: await getCatalogue() }); }
  catch { return Response.json({ error: "The service catalogue is temporarily unavailable." }, { status: 503 }); }
}
