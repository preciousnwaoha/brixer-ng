import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authPath, loginPath, loginPortal } from "@/lib/auth-routing";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const portal = loginPortal(url.searchParams.get("portal"));
  const code = url.searchParams.get("code");
  try {
    if (code) {
      const { error } = await (await createClient()).auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL(authPath("/auth/complete", portal, url.searchParams.get("next") ?? undefined), url.origin));
    }
  } catch { /* Return to the originating login screen. */ }
  return NextResponse.redirect(new URL(`${loginPath(portal)}?error=expired`, url.origin));
}
