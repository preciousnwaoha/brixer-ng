export const dynamic = "force-dynamic";
import { ClientDashboard } from "@/components/dashboard/client-dashboard";
import { protectPage } from "@/lib/access";
export default async function Page() { await protectPage("client"); return <ClientDashboard />; }
