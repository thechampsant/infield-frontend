import type { BackendUser } from "@/lib/api/types";

/**
 * Maps a backend role to its landing route after login.
 *
 * The backend returns a `role` on the user object. Role naming isn't strictly
 * specified, so we match loosely (case/format-insensitive). Project Admin and
 * Manager dashboards require project context that login does not provide, so
 * they fall back to a sensible default until those routes exist.
 */
export function landingRouteForRole(role?: string): string {
  const normalized = (role ?? "").toLowerCase().replace(/[\s_-]+/g, "");

  if (normalized.includes("superadmin")) return "/super-admin/accounts";
  if (normalized.includes("clientadmin") || normalized.includes("accountadmin"))
    return "/account-admin/projects";
  if (normalized.includes("projectadmin")) return "/super-admin/accounts";
  if (normalized.includes("manager")) return "/workspace";

  // Unknown role: default to super-admin console.
  return "/super-admin/accounts";
}

export function landingRouteForUser(user?: BackendUser | null): string {
  return landingRouteForRole(user?.role);
}

/**
 * Message shown when an Employee-level user tries to reach the web portal
 * (INF2-1535 AC6). Copy mirrors the acceptance criteria.
 */
export const WEB_ACCESS_RESTRICTED_MESSAGE =
  "Web portal access is restricted to Manager level and above.";

/**
 * Whether the user may use the web portal (INF2-1535 AC6/AC7). Access is
 * derived from the designation's mapped role: Employees are mobile-only, while
 * Managers (and admins) get web access.
 *
 * The backend does not yet return `access` on the auth payload, so this
 * defaults to allowing access and only blocks when `access` is explicitly
 * "MOBILE". Wire this into the web-portal guard once the field is populated.
 */
export function isWebPortalAllowed(user?: BackendUser | null): boolean {
  return user?.access !== "MOBILE";
}
