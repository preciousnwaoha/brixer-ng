import { NextResponse } from "next/server";
import { AccessError, requirePortalUser } from "@/lib/access";
import { authPath, loginPath, loginPortal, resolvedDestination } from "@/lib/auth-routing";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const portal = loginPortal(url.searchParams.get("portal"));
  try {
    const { supabase, user, profile } = await requirePortalUser(portal);
    if (!user.email_confirmed_at && !user.phone_confirmed_at) return NextResponse.redirect(new URL(`${loginPath(portal)}?error=verify-email`, url.origin));
    if (profile.role === "client") {
      const { error } = await supabase.rpc("attach_guest_orders");
      if (error) throw error;
    }
    let next = resolvedDestination(profile.role, url.searchParams.get("next"));
    if (["/auth/set-password"].includes(new URL(next, url.origin).pathname)) next = authPath(next, portal);
    return NextResponse.redirect(new URL(next, url.origin));
  } catch (error) {
    const destination = new URL(authPath(loginPath(portal), portal, url.searchParams.get("next") ?? undefined), url.origin);
    destination.searchParams.set("error", error instanceof AccessError && error.status === 403 ? "role" : "account");
    return NextResponse.redirect(destination);
  }
}
