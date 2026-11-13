import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { loginPath, pathPortal } from "@/lib/auth-routing";

export async function proxy(request: NextRequest) {
  const portal = pathPortal(request.nextUrl.pathname);
  const internal = portal === "team" || portal === "staff";
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const demo = process.env.NEXT_PUBLIC_DEMO_MODE === "true" || (process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_DEMO_MODE !== "false");
  if (demo && !internal) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  function loginRedirect(error?: string) {
    const url = new URL(loginPath(portal ?? "client"), request.url);
    url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    if (error) url.searchParams.set("error", error);
    const redirected = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirected.cookies.set(cookie));
    return redirected;
  }
  if (!configured) return portal ? loginRedirect("configuration") : response;

  try {
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (items) => {
          items.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        }
      }
    });
    const { data: { user }, error } = await supabase.auth.getUser();
    if (portal && (error || !user)) return loginRedirect();
  } catch {
    if (portal) return loginRedirect("configuration");
  }
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
