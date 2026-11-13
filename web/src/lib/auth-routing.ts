import type { UserRole } from "@/types";
import { safeNext } from "@/lib/commerce";

export type LoginPortal = "client" | "team" | "staff";

export function loginPortal(value: unknown): LoginPortal {
  return value === "team" || value === "staff" ? value : "client";
}

export function loginPath(portal: LoginPortal) {
  return portal === "team" ? "/admin/login" : portal === "staff" ? "/staff/login" : "/login";
}

export function portalForRole(role: UserRole): LoginPortal {
  return role === "admin" ? "team" : role === "staff" ? "staff" : "client";
}

export function portalRoles(portal: LoginPortal): UserRole[] {
  return portal === "team" ? ["admin", "staff"] : portal === "staff" ? ["staff"] : ["client"];
}

export function roleDestination(role: UserRole) {
  return role === "client" ? "/dashboard" : `/${role}`;
}

export function portalDestination(portal: LoginPortal) {
  return portal === "team" ? "/admin" : portal === "staff" ? "/staff" : "/dashboard";
}

export function pathPortal(path: string): LoginPortal | null {
  if (path === "/admin/login" || path === "/staff/login") return null;
  if (path === "/admin" || path.startsWith("/admin/")) return "team";
  if (path === "/staff" || path.startsWith("/staff/")) return "staff";
  if (path === "/dashboard" || path.startsWith("/dashboard/")) return "client";
  return null;
}

export function authPath(path: string, portal: LoginPortal, next?: string) {
  const url = new URL(path, "https://brixer.invalid");
  url.searchParams.set("portal", portal);
  if (next) url.searchParams.set("next", safeNext(next, portalDestination(portal)));
  return `${url.pathname}${url.search}`;
}

export function resolvedDestination(role: UserRole, requested?: string | null) {
  const fallback = roleDestination(role);
  const next = safeNext(requested, fallback);
  const path = new URL(next, "https://brixer.invalid").pathname;
  if (["/login", "/admin/login", "/staff/login", "/auth/complete", "/auth/callback", "/auth/confirm", "/auth/phone"].includes(path)) return fallback;
  const target = pathPortal(path);
  if (target && !portalRoles(target).includes(role)) return fallback;
  // Staff may use the team entry but cannot enter the admin dashboard.
  if (target === "team" && role !== "admin") return fallback;
  return next;
}

export function passwordSetupPath(portal: LoginPortal, requested?: string | null) {
  const next = safeNext(requested, portalDestination(portal));
  return new URL(next, "https://brixer.invalid").pathname === "/auth/set-password"
    ? authPath(next, portal)
    : authPath("/auth/set-password", portal, next);
}
