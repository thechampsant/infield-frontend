/**
 * Designation service (INF2-1535).
 *
 * Backend designation CRUD (all bulk-oriented):
 *   GET   /api/v1/designation/getDesignationsByProject/{projectId}
 *   POST  /api/v1/designation/createDesignations   (CreateBulkDesignationsDto)
 *   POST  /api/v1/designation/updateDesignations   (UpdateBulkDesignationsDto)
 *   POST  /api/v1/designation/deleteDesignations   (DeleteBulkDesignationsDto)
 *
 * The Swagger `Designation` response schema is empty, so list results are read
 * defensively and normalized to a stable `Designation` shape. The role may come
 * back as an id string or a populated object.
 */

import { apiClient } from "./api-client";
import type { DesignationAccess } from "@/lib/designations/backend-roles";

const BASE = "/api/v1/designation";

/** Payload item for `createDesignations` (matches DesignationDto). */
export interface DesignationDto {
  projectId: string;
  name: string;
  roleId: string;
  permissions: string[];
  access?: DesignationAccess;
}

/** Payload item for `updateDesignations` (matches UpdateDesignationDto). */
export interface UpdateDesignationDto {
  id: string;
  name?: string;
  roleId?: string;
  permissions?: string[];
  access?: DesignationAccess;
}

/** Normalized designation used by the UI. */
export interface Designation {
  id: string;
  name: string;
  roleId: string;
  roleName?: string;
  roleLevel?: number;
  projectId?: string;
  permissions?: string[];
  access?: DesignationAccess;
}

interface RawRoleRef {
  _id?: string;
  id?: string;
  roleName?: string;
  name?: string;
  level?: number;
}

interface RawDesignation {
  _id?: string;
  id?: string;
  name?: string;
  designationName?: string;
  roleId?: string | RawRoleRef;
  role?: RawRoleRef;
  projectId?: string;
  permissions?: string[];
  access?: DesignationAccess;
}

function normalizeDesignation(raw: RawDesignation): Designation {
  const roleRef =
    raw.role ?? (typeof raw.roleId === "object" ? raw.roleId : undefined);
  const roleId =
    typeof raw.roleId === "string"
      ? raw.roleId
      : (roleRef?._id ?? roleRef?.id ?? "");

  return {
    id: raw._id ?? raw.id ?? "",
    name: raw.name ?? raw.designationName ?? "",
    roleId,
    roleName: roleRef?.roleName ?? roleRef?.name,
    roleLevel: typeof roleRef?.level === "number" ? roleRef.level : undefined,
    projectId: raw.projectId,
    permissions: raw.permissions,
    access: raw.access,
  };
}

export interface BulkDesignationResult {
  total: number;
  successCount: number;
  invalidCount: number;
  successes: { id: string; name: string }[];
  errors: { row?: string | number; data?: unknown; errors: string[] }[];
}

export const designationService = {
  async listByProject(projectId: string): Promise<Designation[]> {
    const res = await apiClient.get<RawDesignation[]>(
      `${BASE}/getDesignationsByProject/${projectId}`,
    );
    return Array.isArray(res) ? res.map(normalizeDesignation) : [];
  },

  async create(designations: DesignationDto[]): Promise<void> {
    await apiClient.post(`${BASE}/createDesignations`, { designations });
  },

  async update(designations: UpdateDesignationDto[]): Promise<void> {
    await apiClient.post(`${BASE}/updateDesignations`, { designations });
  },

  async remove(ids: string[]): Promise<void> {
    await apiClient.post(`${BASE}/deleteDesignations`, { ids });
  },

  async downloadTemplate(projectId: string): Promise<Blob> {
    return apiClient.getBlob(
      `${BASE}/bulk/template?projectId=${encodeURIComponent(projectId)}`,
    );
  },

  async exportDesignations(projectId: string): Promise<Blob> {
    return apiClient.getBlob(
      `${BASE}/bulk/export?projectId=${encodeURIComponent(projectId)}`,
    );
  },

  async bulkUpload(projectId: string, file: File): Promise<BulkDesignationResult> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("projectId", projectId);
    return apiClient.postFormData<BulkDesignationResult>(`${BASE}/bulk/excel`, formData);
  },
};
