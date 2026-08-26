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

/** Path segments under project-admin that require module-config:update */
export function isModuleConfigPath(pathname: string): boolean {
  return (
    pathname.includes("/modules") ||
    pathname.includes("/web-modules") ||
    pathname.includes("/form-builder") ||
    pathname.includes("/configuration/module-toggles") ||
    pathname.includes("/configuration/attendance-rules")
  );
}
