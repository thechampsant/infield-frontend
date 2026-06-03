/**
 * Backend role hierarchy helpers (INF2-1535).
 *
 * The platform uses a fixed hierarchy — Employee (Level 1) and Manager 1-10
 * (Levels 2-11) — plus admin roles. A designation must be mapped to one of the
 * hierarchy roles returned by `GET /api/v1/role/getRolesByProject/{projectId}`.
 * Hierarchy roles are seeded when a Super Admin creates a project (see
 * `provisionHierarchyRolesForProject`); Designations UI only reads roles.
 */

export type DesignationAccess = "WEB" | "MOBILE" | "BOTH";

export type RoleKind = "employee" | "manager" | "admin" | "other";

/** Shown on Designations page when no hierarchy roles are available. */
export const HIERARCHY_ROLES_UNAVAILABLE_PAGE =
  "Hierarchy roles are not available for this project yet. They are normally created when a Super Admin adds the project. Contact your Super Admin if Employee and Manager roles are missing.";

/** Shorter copy for add/edit designation modals. */
export const HIERARCHY_ROLES_UNAVAILABLE_MODAL =
  "Hierarchy roles are not available for this project. They are normally created when a Super Admin adds the project—contact your Super Admin if Employee and Manager roles are missing.";

export interface HierarchyRoleShape {
  roleName: string;
  level: number;
}

/** INF2-1535 AC3 — seeded via `createRoles` when Super Admin creates a project. */
export const DEFAULT_HIERARCHY_ROLE_DEFINITIONS: ReadonlyArray<HierarchyRoleShape> = [
  { roleName: "Employee", level: 1 },
  ...Array.from({ length: 10 }, (_, i) => ({
    roleName: `Manager ${i + 1}`,
    level: i + 2,
  })),
];

/** INF2-1535 AC3: Employee (L1) and Manager 1–10 (L2–L11) only. */
export function isHierarchyRole(role: HierarchyRoleShape): boolean {
  const kind = classifyRole(role.roleName);
  if (kind !== "employee" && kind !== "manager") return false;
  return role.level >= 1 && role.level <= 11;
}

export function filterHierarchyRoles<T extends HierarchyRoleShape>(roles: T[]): T[] {
  return roles.filter(isHierarchyRole);
}

/** Case/format-insensitive comparison key for role names. */
export function normalizeRoleName(name: string): string {
  return name.toLowerCase().replace(/[\s_-]+/g, "");
}

export function classifyRole(roleName: string): RoleKind {
  const n = normalizeRoleName(roleName);
  if (n.includes("employee")) return "employee";
  if (n.startsWith("manager")) return "manager";
  if (n.includes("admin")) return "admin";
  return "other";
}

/**
 * Access level a designation inherits from its role:
 * Employees are mobile-only, managers get both app and web, admins are web-only.
 */
export function accessForRole(roleName: string): DesignationAccess {
  switch (classifyRole(roleName)) {
    case "employee":
      return "MOBILE";
    case "admin":
      return "WEB";
    default:
      return "BOTH";
  }
}

/**
 * Default permissions sent to the designation API (which requires at least one).
 * These are baseline read permissions; the backend enforces the real access
 * rules from the mapped role. Confirm with backend before production tuning.
 */
export function permissionsForRole(roleName: string): string[] {
  if (classifyRole(roleName) === "employee") return ["user:read"];
  return ["user:read", "module-config:read"];
}

export function accessLabel(access?: DesignationAccess): string {
  switch (access) {
    case "MOBILE":
      return "Mobile";
    case "WEB":
      return "Web";
    case "BOTH":
      return "App + Web";
    default:
      return "—";
  }
}
