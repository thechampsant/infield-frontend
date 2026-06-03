/**
 * Role service (INF2-1535).
 *
 *   GET  /api/v1/role/getRolesByProject/{projectId}
 *   POST /api/v1/role/createRoles — used only when Super Admin creates a project
 *
 * Hierarchy roles (Employee, Manager 1–10) must exist before designations can
 * be created. Designations UI is read-only for roles.
 */

import { apiClient, ApiError } from "./api-client";
import { normalizeListResponse } from "./normalize-list-response";
import {
  accessForRole,
  DEFAULT_HIERARCHY_ROLE_DEFINITIONS,
  filterHierarchyRoles,
  type DesignationAccess,
} from "@/lib/designations/backend-roles";

const BASE = "/api/v1/role";
const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API === "true";

export interface BackendRole {
  id: string;
  roleName: string;
  level: number;
}

export interface CreateRolePayload {
  projectId: string;
  roleName: string;
  level: number;
}

export interface ProjectRolesSummary {
  projectId: string;
  allRoles: BackendRole[];
  hierarchyRoles: BackendRole[];
  totalFromApi: number;
  hierarchyCount: number;
}

/** Option shape consumed by the designation role dropdown. */
export interface RoleOption {
  roleId: string;
  roleName: string;
  label: string;
  level: number;
  access: DesignationAccess;
}

interface RawRole {
  _id?: string;
  id?: string;
  roleName?: string;
  name?: string;
  level?: number;
}

function normalizeRole(raw: RawRole): BackendRole {
  const idRaw = raw._id ?? raw.id;
  let id = "";
  if (typeof idRaw === "string") id = idRaw;
  else if (idRaw && typeof idRaw === "object" && "toString" in idRaw) {
    id = String(idRaw);
  }

  return {
    id,
    roleName: (raw.roleName ?? raw.name ?? "").trim(),
    level: typeof raw.level === "number" ? raw.level : 0,
  };
}

function isRoleAlreadyExistsError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false;
  if (err.status === 409) return true;
  return /already exists/i.test(err.message);
}

export const roleService = {
  async listByProject(projectId: string): Promise<BackendRole[]> {
    const res = await apiClient.get<unknown>(
      `${BASE}/getRolesByProject/${encodeURIComponent(projectId)}`,
    );
    const rawList = normalizeListResponse<RawRole>(res);
    return rawList
      .map(normalizeRole)
      .filter((r) => r.id && r.roleName)
      .sort((a, b) => a.level - b.level);
  },

  /** Roles eligible for designation mapping (Employee / Manager, levels 1–11). */
  async listHierarchyByProject(projectId: string): Promise<BackendRole[]> {
    const roles = await roleService.listByProject(projectId);
    return filterHierarchyRoles(roles);
  },

  /**
   * Single fetch from `GET getRolesByProject` with counts for UI diagnostics.
   */
  async getProjectRolesSummary(projectId: string): Promise<ProjectRolesSummary> {
    const allRoles = await roleService.listByProject(projectId);
    const hierarchyRoles = filterHierarchyRoles(allRoles);
    return {
      projectId,
      allRoles,
      hierarchyRoles,
      totalFromApi: allRoles.length,
      hierarchyCount: hierarchyRoles.length,
    };
  },

  /**
   * Provision INF2-1535 default hierarchy roles for a new project.
   * No-op when `NEXT_PUBLIC_USE_MOCK_API=true` (mock project create does not hit this API).
   */
  async createHierarchyForProject(projectId: string): Promise<void> {
    if (USE_MOCK_API) {
      throw new Error(
        "Role seeding requires the live API. Set NEXT_PUBLIC_USE_MOCK_API=false.",
      );
    }

    if (!/^[a-f\d]{24}$/i.test(projectId)) {
      throw new Error(
        `Invalid project id "${projectId}". Expected a 24-character Mongo ObjectId from createProject.`,
      );
    }

    const roles: CreateRolePayload[] = DEFAULT_HIERARCHY_ROLE_DEFINITIONS.map(
      (def) => ({
        projectId,
        roleName: def.roleName,
        level: def.level,
      }),
    );

    try {
      await apiClient.post(`${BASE}/createRoles`, { roles });
    } catch (err) {
      if (isRoleAlreadyExistsError(err)) return;
      throw err;
    }
  },
};

/** Build dropdown options (sorted by hierarchy level) from backend roles. */
export function toRoleOptions(roles: BackendRole[]): RoleOption[] {
  return roles.map((r) => ({
    roleId: r.id,
    roleName: r.roleName,
    label: `${r.roleName} (Level ${r.level})`,
    level: r.level,
    access: accessForRole(r.roleName),
  }));
}
