import type { ReactNode } from "react";
import { ClientLayout } from "@/components/dashboard/client-layout";
import { protectPage } from "@/lib/access";
export const dynamic = "force-dynamic";
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  await protectPage("client");
  return <ClientLayout>{children}</ClientLayout>;
}
