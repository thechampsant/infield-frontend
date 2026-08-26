import type { BackendUser } from "@/lib/api/types";
import { authService } from "@/lib/api/auth-service";
import { projectAdminLandingPath } from "@/lib/auth/permissions";

/**
 * Maps a backend role to its landing route after login.
 *
 * Prefer {@link landingRouteForUser} — Project Admin needs project codes from
 * the profile. This role-only helper cannot send them to a project.
 */
export function landingRouteForRole(role?: string): string {
  const normalized = normalizeRole(role);

  if (normalized.includes("superadmin")) return "/super-admin/accounts";
  if (normalized.includes("clientadmin") || normalized.includes("accountadmin"))
    return "/account-admin/projects";
  if (normalized.includes("projectadmin")) return "/account-admin/projects";
  if (normalized.includes("manager")) return "/workspace";

  // Unknown role: default to super-admin console.
  return "/super-admin/accounts";
}

export function landingRouteForUser(user?: BackendUser | null): string {
  const enrichedRoute = enrichedLandingRouteForUser(user);
  return enrichedRoute ?? landingRouteForRole(user?.role);
}

export async function resolveLandingRouteForCurrentUser(
  fallbackUser?: BackendUser | null,
): Promise<string> {
  try {
    const freshUser = await authService.getMe();
    return landingRouteForUser(freshUser);
  } catch {
    return landingRouteForUser(fallbackUser);
  }
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

export function isWebPortalRestricted(user?: BackendUser | null): boolean {
  return !isSuperAdmin(user?.role) && user?.access === "MOBILE";
}

function enrichedLandingRouteForUser(user?: BackendUser | null): string | null {
  if (!user) return null;
  if (isSuperAdmin(user.role)) return "/super-admin/accounts";
  if (isWebPortalRestricted(user)) return "/login/password?restricted=web";

  if (isProjectAdmin(user.role)) {
    return projectAdminLandingRoute(user);
  }

  const singleProjectRoute = singleActiveProjectRoute(user);
  if (singleProjectRoute) return singleProjectRoute;

  const normalizedRole = normalizeRole(user.role);
  if (
    normalizedRole.includes("clientadmin") ||
    normalizedRole.includes("accountadmin")
  ) {
    return "/account-admin/projects";
  }

  return null;
}

/** Project Admin belongs to one project — never Super Admin accounts. */
function projectAdminLandingRoute(user: BackendUser): string | null {
  const fromSingleProject = singleActiveProjectRoute(user);
  if (fromSingleProject) return fromSingleProject;

  if (
    user.accountCode &&
    user.projectCode &&
    isWebAccessAllowedForProjectLanding(user.access)
  ) {
    return projectAdminLandingPath(
      user.accountCode,
      user.projectCode,
      user,
    );
  }

  const first = (user.projects ?? []).find(
    (project) =>
      Boolean(project.accountCode && project.projectCode) &&
      (!project.status || normalizeStatus(project.status) === "active"),
  );
  if (
    first?.accountCode &&
    first.projectCode &&
    isWebAccessAllowedForProjectLanding(user.access)
  ) {
    return projectAdminLandingPath(
      first.accountCode,
      first.projectCode,
      user,
    );
  }

  return null;
}

function singleActiveProjectRoute(user: BackendUser): string | null {
  if (!isWebAccessAllowedForProjectLanding(user.access)) return null;

  const activeProjects = (user.projects ?? []).filter(
    (project) => normalizeStatus(project.status) === "active",
  );

  if (activeProjects.length !== 1) return null;

  const [project] = activeProjects;
  if (!project.accountCode || !project.projectCode) return null;

  // Report-only users land on Reports; setup users still open Uploaders → Roles.
  return projectAdminLandingPath(
    project.accountCode,
    project.projectCode,
    user,
  );
}

function isWebAccessAllowedForProjectLanding(
  access: BackendUser["access"],
): boolean {
  return access === "WEB" || access === "BOTH" || access == null;
}

function isSuperAdmin(role?: string): boolean {
  return normalizeRole(role).includes("superadmin");
}

function isProjectAdmin(role?: string): boolean {
  return normalizeRole(role).includes("projectadmin");
}

function normalizeRole(role?: string): string {
  return (role ?? "").toLowerCase().replace(/[\s_-]+/g, "");
}

function normalizeStatus(status?: string): string {
  return (status ?? "").toLowerCase().replace(/[\s_-]+/g, "");
}
