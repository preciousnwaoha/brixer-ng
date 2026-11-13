export const dynamic = "force-dynamic";
import { protectPage } from "@/lib/access";
import { ServiceSettings } from "@/components/admin/service-settings";
export default async function SettingsPage() { await protectPage("admin"); return <ServiceSettings />; }
