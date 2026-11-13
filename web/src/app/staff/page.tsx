export const dynamic = "force-dynamic";
import { StaffDashboard } from "@/components/dashboard/staff-dashboard";
import { protectPage } from "@/lib/access";
export default async function Page() { await protectPage("staff"); return <StaffDashboard />; }
