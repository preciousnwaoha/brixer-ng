export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { AccessError, requireUser } from "@/lib/access";
import { authPath, loginPath, loginPortal, portalForRole, portalRoles } from "@/lib/auth-routing";
import { AccountActions } from "@/components/auth/account-actions";
export default async function SetPassword({ searchParams }: { searchParams: Promise<{ portal?: string; next?: string }> }) {
  const query = await searchParams;
  let portal = loginPortal(query.portal);
  try {
    const { profile } = await requireUser();
    if (!query.portal) portal = portalForRole(profile.role);
    if (!portalRoles(portal).includes(profile.role)) throw new AccessError("Invalid account role.", 403);
  } catch (error) { redirect(`${authPath(loginPath(portal), portal)}&error=${error instanceof AccessError && error.status === 403 ? "role" : "account"}`); }
  return <main className="grid min-h-screen place-items-center bg-alt-mint p-5"><section className="w-full max-w-md rounded-3xl bg-white p-8"><h1 className="text-3xl font-bold text-primary">Set your password.</h1><AccountActions mode="set-password" portal={portal} next={query.next} /></section></main>;
}
