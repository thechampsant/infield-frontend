import type { BackendUser } from "@/lib/api/types";

/** Matches libs/common Permission.MODULE_CONFIG_UPDATE */
export const MODULE_CONFIG_UPDATE = "module-config:update";

export const ADMIN_ACCESS_AREAS = [
  "uploaders",
  "modules",
  "web-modules",
  "form-builder",
  "reports",
] as const;

export type AdminAccessArea = (typeof ADMIN_ACCESS_AREAS)[number];

export const DEFAULT_PROJECT_ADMIN_ACCESS: AdminAccessArea[] = [
  "uploaders",
  "modules",
  "form-builder",
  "reports",
];

export const ALL_ADMIN_ACCESS: AdminAccessArea[] = [...ADMIN_ACCESS_AREAS];

export const ADMIN_ACCESS_LABELS: Record<AdminAccessArea, string> = {
  uploaders: "Uploaders",
  modules: "Modules",
  "web-modules": "Web Modules",
  "form-builder": "Form Builder",
  reports: "Reports",
};

const AREA_SET = new Set<string>(ADMIN_ACCESS_AREAS);

const LANDING_ORDER: AdminAccessArea[] = [
  "uploaders",
  "modules",
  "form-builder",
  "web-modules",
  "reports",
];

const LANDING_HREF: Record<AdminAccessArea, (base: string) => string> = {
  uploaders: (base) => `${base}/uploaders/roles`,
  modules: (base) => `${base}/modules`,
  "form-builder": (base) => `${base}/form-builder`,
  "web-modules": (base) => `${base}/web-modules`,
  reports: (base) => `${base}/reports`,
};

function normalizeRole(role?: string): string {
  return (role ?? "").toLowerCase().replace(/[\s_-]+/g, "");
}

export function parseAdminAccess(raw: unknown): AdminAccessArea[] | null {
  if (!Array.isArray(raw)) return null;
  const unique: AdminAccessArea[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string" || !AREA_SET.has(item) || seen.has(item)) {
      continue;
    }
    seen.add(item);
    unique.push(item as AdminAccessArea);
  }
  return unique.length ? unique : null;
}

/** Effective setup areas for drawer / landing / guard. */
export function resolvedAdminAccess(
  user: BackendUser | null | undefined,
): AdminAccessArea[] {
  if (!user) return [];
  const role = normalizeRole(user.role);
  if (role.includes("superadmin") || role.includes("accountadmin") || role.includes("clientadmin")) {
    return [...ALL_ADMIN_ACCESS];
  }
  if (role.includes("projectadmin")) {
    return parseAdminAccess(user.adminAccess) ?? [...DEFAULT_PROJECT_ADMIN_ACCESS];
  }
  if (hasPermission(user, MODULE_CONFIG_UPDATE)) {
    return [...DEFAULT_PROJECT_ADMIN_ACCESS];
  }
  return ["reports"];
}

export function hasAdminAccess(
  user: BackendUser | null | undefined,
  area: AdminAccessArea,
): boolean {
  return resolvedAdminAccess(user).includes(area);
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
 * Web-only: can open/edit Modules configuration (attendance, visit, etc.).
 * Project Admin is gated by the modules adminAccess flag.
 */
export function canManageModules(user: BackendUser | null | undefined): boolean {
  return hasAdminAccess(user, "modules");
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

/** Map a project-admin path to its setup-area flag. Check web-modules before modules. */
export function adminAccessAreaForPath(pathname: string): AdminAccessArea | null {
  if (pathname.includes("/web-modules")) return "web-modules";
  if (pathname.includes("/uploaders")) return "uploaders";
  if (pathname.includes("/form-builder")) return "form-builder";
  if (pathname.includes("/reports")) return "reports";
  if (
    pathname.includes("/modules") ||
    pathname.includes("/master-data") ||
    pathname.includes("/configuration/module-toggles") ||
    pathname.includes("/configuration/attendance-rules")
  ) {
    return "modules";
  }
  return null;
}

/** Path segments that are setup (not Reports) — used by older callers. */
export function isModuleConfigPath(pathname: string): boolean {
  const area = adminAccessAreaForPath(pathname);
  return area !== null && area !== "reports";
}

export function firstAllowedAdminPath(
  accountCode: string,
  projectCode: string,
  user: BackendUser | null | undefined,
): string {
  const base = `/project-admin/${accountCode}/${projectCode}`;
  const access = resolvedAdminAccess(user);
  for (const area of LANDING_ORDER) {
    if (access.includes(area)) return LANDING_HREF[area](base);
  }
  return `${base}/reports`;
}

/** Default project-admin landing from granted setup areas. */
export function projectAdminLandingPath(
  accountCode: string,
  projectCode: string,
  user: BackendUser | null | undefined,
): string {
  return firstAllowedAdminPath(accountCode, projectCode, user);
}
