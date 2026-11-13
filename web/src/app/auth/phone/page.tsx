import { redirect } from "next/navigation";
import { authPath, loginPath, loginPortal } from "@/lib/auth-routing";
export default async function RetiredPhoneEnrollment({ searchParams }: { searchParams: Promise<{ portal?: string; next?: string }> }) {
  const query = await searchParams; const portal = loginPortal(query.portal);
  redirect(authPath(loginPath(portal), portal, query.next));
}
