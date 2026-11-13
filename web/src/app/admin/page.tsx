export const dynamic = "force-dynamic";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { protectPage } from "@/lib/access";
export default async function Page() { await protectPage("admin"); return <AdminDashboard />; }
