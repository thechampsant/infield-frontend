/**
 * Role and Designation API implementation.
 * Follows Engineering Standards: Multi-tenancy (projectId scoping).
 */

import { apiClient } from "./api-client";
import type {
  Role,
  BackendRole,
  CreateRoleDto,
  CreateBulkRolesDto,
  UpdateRoleDto,
  UpdateBulkRolesDto,
  DeleteBulkRolesDto,
  Designation,
  BackendDesignation,
  CreateDesignationDto,
  CreateBulkDesignationsDto,
  UpdateDesignationDto,
  UpdateBulkDesignationsDto,
  DeleteBulkDesignationsDto,
} from "./types";

// ─────────────────────────────────────────────────────────────
// Mappers: Backend → Frontend
// ─────────────────────────────────────────────────────────────

/** Map BackendRole to frontend Role */
function mapRole(role: BackendRole): Role {
  return {
    id: role.id || role._id || "",
    projectId: role.projectId,
    roleName: role.roleName,
    level: role.level,
    isActive: role.isActive ?? true,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  };
}

/** Map BackendDesignation to frontend Designation */
function mapDesignation(des: BackendDesignation): Designation {
  return {
    id: des.id || des._id || "",
    projectId: des.projectId,
    name: des.name,
    roleId: des.roleId,
    roleName: des.roleName,
    permissions: des.permissions || [],
    access: des.access || "BOTH",
    isActive: des.isActive ?? true,
    createdAt: des.createdAt,
    updatedAt: des.updatedAt,
  };
}

// ─────────────────────────────────────────────────────────────
// Role API
// ─────────────────────────────────────────────────────────────

export interface RoleDesignationApi {
  // Roles
  getRolesByProject(projectId: string): Promise<Role[]>;
  getRoleByName(projectId: string, roleName: string): Promise<Role>;
  createRoles(roles: CreateRoleDto[]): Promise<Role[]>;
  updateRoles(roles: UpdateRoleDto[]): Promise<void>;
  deleteRoles(ids: string[]): Promise<void>;

  // Designations
  getDesignationsByProject(projectId: string): Promise<Designation[]>;
  getDesignationByName(projectId: string, name: string): Promise<Designation>;
  createDesignations(designations: CreateDesignationDto[]): Promise<Designation[]>;
  updateDesignations(designations: UpdateDesignationDto[]): Promise<void>;
  deleteDesignations(ids: string[]): Promise<void>;
}

export const roleDesignationApi: RoleDesignationApi = {
  // ─────────────────────────────────────────────────────────────
  // Roles
  // ─────────────────────────────────────────────────────────────

  async getRolesByProject(projectId: string): Promise<Role[]> {
    const response = await apiClient.get<BackendRole[] | { roles: BackendRole[] }>(
      `/api/v1/role/getRolesByProject/${projectId}`
    );

    // Handle different response formats
    if (Array.isArray(response)) {
      return response.map(mapRole);
    }
    return (response.roles || []).map(mapRole);
  },

  async getRoleByName(projectId: string, roleName: string): Promise<Role> {
    const response = await apiClient.get<BackendRole>(
      `/api/v1/role/getRoleByName/${projectId}/${encodeURIComponent(roleName)}`
    );
    return mapRole(response);
  },

  async createRoles(roles: CreateRoleDto[]): Promise<Role[]> {
    const payload: CreateBulkRolesDto = { roles };
    const response = await apiClient.post<{ roles: BackendRole[] } | BackendRole[]>(
      "/api/v1/role/createRoles",
      payload
    );

    if (Array.isArray(response)) {
      return response.map(mapRole);
    }
    return (response.roles || []).map(mapRole);
  },

  async updateRoles(roles: UpdateRoleDto[]): Promise<void> {
    const payload: UpdateBulkRolesDto = { roles };
    await apiClient.post("/api/v1/role/updateRoles", payload);
  },

  async deleteRoles(ids: string[]): Promise<void> {
    const payload: DeleteBulkRolesDto = { ids };
    await apiClient.post("/api/v1/role/deleteRoles", payload);
  },

  // ─────────────────────────────────────────────────────────────
  // Designations
  // ─────────────────────────────────────────────────────────────

  async getDesignationsByProject(projectId: string): Promise<Designation[]> {
    const response = await apiClient.get<BackendDesignation[] | { designations: BackendDesignation[] }>(
      `/api/v1/designation/getDesignationsByProject/${projectId}`
    );

    // Handle different response formats
    if (Array.isArray(response)) {
      return response.map(mapDesignation);
    }
    return (response.designations || []).map(mapDesignation);
  },

  async getDesignationByName(projectId: string, name: string): Promise<Designation> {
    const response = await apiClient.get<BackendDesignation>(
      `/api/v1/designation/getDesignationByName/${projectId}/${encodeURIComponent(name)}`
    );
    return mapDesignation(response);
  },

  async createDesignations(designations: CreateDesignationDto[]): Promise<Designation[]> {
    const payload: CreateBulkDesignationsDto = { designations };
    const response = await apiClient.post<{ designations: BackendDesignation[] } | BackendDesignation[]>(
      "/api/v1/designation/createDesignations",
      payload
    );

    if (Array.isArray(response)) {
      return response.map(mapDesignation);
    }
    return (response.designations || []).map(mapDesignation);
  },

  async updateDesignations(designations: UpdateDesignationDto[]): Promise<void> {
    const payload: UpdateBulkDesignationsDto = { designations };
    await apiClient.post("/api/v1/designation/updateDesignations", payload);
  },

  async deleteDesignations(ids: string[]): Promise<void> {
    const payload: DeleteBulkDesignationsDto = { ids };
    await apiClient.post("/api/v1/designation/deleteDesignations", payload);
  },
};

export default roleDesignationApi;
