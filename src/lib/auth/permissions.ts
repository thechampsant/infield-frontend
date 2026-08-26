import type { BackendUser } from "@/lib/api/types";

/** Matches libs/common Permission.MODULE_CONFIG_UPDATE */
export const MODULE_CONFIG_UPDATE = "module-config:update";

function normalizeRole(role?: string): string {
  return (role ?? "").toLowerCase().replace(/[\s_-]+/g, "");
}

export function hasPermission(
  user: BackendUser | null | undefined,
  permission: string,
): boolean {
  if (!user) return false;
  const role = normalizeRole(user.role);
  if (role.includes("superadmin")) return true;
  // JWT admin roles have module-config:update on the backend role map and
  // no designation.permissions. Hard-code so the drawer/guard work even when
  // login has not populated user.permissions[].
  if (
    permission === MODULE_CONFIG_UPDATE &&
    (role.includes("accountadmin") ||
      role.includes("clientadmin") ||
      role.includes("projectadmin"))
  ) {
    return true;
  }
  return Array.isArray(user.permissions) && user.permissions.includes(permission);
}

/**
 * Web-only: can open/edit Project Admin module configuration
 * (Modules, attendance, visit, form builder, web-modules, etc.).
 */
export function canManageModules(user: BackendUser | null | undefined): boolean {
  return hasPermission(user, MODULE_CONFIG_UPDATE);
}

/**
 * "Back to Projects" is only for admins who have an account/project list.
 * Project-scoped users (project admin, managers, report-only) stay in the project shell.
 */
export function canNavigateBackToProjects(
  user: BackendUser | null | undefined,
): boolean {
  if (!user?.role) return false;
  const normalized = user.role.toLowerCase().replace(/[\s_-]+/g, "");
  return (
    normalized.includes("superadmin") ||
    normalized.includes("accountadmin") ||
    normalized.includes("clientadmin")
  );
}

/** Path segments under project-admin that require module-config:update */
export function isModuleConfigPath(pathname: string): boolean {
  return (
    pathname.includes("/uploaders") ||
    pathname.includes("/modules") ||
    pathname.includes("/web-modules") ||
    pathname.includes("/form-builder") ||
    pathname.includes("/master-data") ||
    pathname.includes("/configuration/module-toggles") ||
    pathname.includes("/configuration/attendance-rules")
  );
}

/** Default project-admin landing based on whether the user can manage setup. */
export function projectAdminLandingPath(
  accountCode: string,
  projectCode: string,
  user: BackendUser | null | undefined,
): string {
  const base = `/project-admin/${accountCode}/${projectCode}`;
  if (canManageModules(user)) {
    return `${base}/uploaders/roles`;
  }
  return `${base}/reports`;
}
