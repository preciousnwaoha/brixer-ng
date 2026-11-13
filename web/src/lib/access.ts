import { ZodError } from "zod";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { authPath, loginPath, portalForRole, portalRoles, roleDestination, type LoginPortal } from "@/lib/auth-routing";
import type { UserRole } from "@/types";

export class AccessError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function requireUser(roles?: UserRole[]) {
  let supabase;
  try { supabase = await createClient(); }
  catch { throw new AccessError("Login is temporarily unavailable. Please try again later.", 503); }
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new AccessError("Please log in to continue.", 401);
  const { data: profile, error: profileError } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (profileError || !profile) throw new AccessError("Unable to verify your account.", 503);
  if (roles && !roles.includes(profile.role)) throw new AccessError("This account does not have access to this area. Use an account with the required role.", 403);
  return { supabase, user, profile };
}

export function requirePortalUser(portal: LoginPortal) { return requireUser(portalRoles(portal)); }

export async function protectPage(role: UserRole) {
  // Customer sample data remains available locally; team access always needs a DB role.
  if (role === "client" && env.demoMode) return;
  const portal = portalForRole(role);
  let auth;
  try { auth = await requireUser(); }
  catch (error) {
    const destination = new URL(authPath(loginPath(portal), portal, roleDestination(role)), "https://brixer.invalid");
    if (!(error instanceof AccessError) || error.status !== 401) destination.searchParams.set("error", "configuration");
    redirect(`${destination.pathname}${destination.search}`);
  }
  if (auth.profile.role !== role) {
    if (role === "client") redirect(roleDestination(auth.profile.role));
    redirect(`${authPath(loginPath(portal), portal)}&error=role`);
  }
  return auth;
}

export function errorResponse(error: unknown) {
  return Response.json({ error: error instanceof ZodError ? error.issues[0]?.message ?? "Please check the details you entered." : error instanceof Error ? error.message : "Unable to complete this request." }, { status: error instanceof AccessError ? error.status : 400 });
}
