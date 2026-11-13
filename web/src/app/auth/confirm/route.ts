import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authPath, loginPath, loginPortal, passwordSetupPath } from "@/lib/auth-routing";
import type { EmailOtpType } from "@supabase/supabase-js";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const portal = loginPortal(url.searchParams.get("portal"));
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  try {
    if (token_hash && type && ["email", "signup", "invite", "magiclink", "recovery"].includes(type)) {
      const { error } = await (await createClient()).auth.verifyOtp({ token_hash, type: type as EmailOtpType });
      const next = type === "recovery" ? passwordSetupPath(portal, url.searchParams.get("next")) : url.searchParams.get("next") ?? undefined;
      if (!error) return NextResponse.redirect(new URL(authPath("/auth/complete", portal, next), url.origin));
    }
  } catch { /* Return to the originating login screen. */ }
  return NextResponse.redirect(new URL(`${loginPath(portal)}?error=expired`, url.origin));
}
