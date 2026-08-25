import type { BackendUser } from "@/lib/api/types";

/** Matches libs/common Permission.MODULE_CONFIG_UPDATE */
export const MODULE_CONFIG_UPDATE = "module-config:update";

export function hasPermission(
  user: BackendUser | null | undefined,
  permission: string,
): boolean {
  if (!user) return false;
  if (user.role === "SUPER_ADMIN") return true;
  if (user.role === "ACCOUNT_ADMIN") {
    // ACCOUNT_ADMIN role map always includes module-config:update
    if (permission === MODULE_CONFIG_UPDATE) return true;
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
