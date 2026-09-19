/**
 * User-Reportee Mapping service.
 *
 * List rows come from GET /users/reportee-mapping (paged summaries).
 * Assigning reportees PATCHes /users/reportee-mapping/:userId.
 * Excel template/upload/export remain on the bulk routes.
 */

import { apiClient } from "./api-client";
import {
  clampListPageSize,
  DEFAULT_LIST_PAGE_SIZE,
  normalizeListMeta,
  type ListMeta,
  type RawListMeta,
} from "./pagination";
import {
  projectUsersService,
  type ProjectUserListResult,
  type UserListStatus,
} from "./project-users-service";

const USERS_BASE = "/api/v1/users";

export type UserReporteeMappingFilter = "all" | "mapped" | "unmapped";
export type { UserListStatus };

export interface UserReporteeMappingSummary {
  userId: string;
  employeeId: string;
  name: string;
  email: string;
  designation: string;
  isActive: boolean;
  mappedCount: number;
  sampleReporteeNames: string[];
}

export interface UserReporteeMappingListResult {
  data: UserReporteeMappingSummary[];
  meta: ListMeta & {
    mappedCount: number;
    unmappedCount: number;
    activeCount: number;
    inactiveCount: number;
  };
}

export interface ReporteeBulkMappingResult {
  total: number;
  successCount: number;
  invalidCount: number;
  errors: { row: number | string; managerEmployeeId?: string; errors: string[] }[];
  auditId?: string;
  hasErrorLog?: boolean;
}

export interface DirectManagerDisplay {
  userId: string;
  employeeId: string;
  name: string;
}

export const userReporteeMappingService = {
  async listPage(
    projectId: string,
    page = 1,
    pageSize = DEFAULT_LIST_PAGE_SIZE,
    search?: string,
    mapped: UserReporteeMappingFilter = "all",
    status: UserListStatus = "all",
  ): Promise<UserReporteeMappingListResult> {
    const params = new URLSearchParams({
      projectId,
      page: String(page),
      pageSize: String(clampListPageSize(pageSize)),
      mapped,
      status,
    });
    const term = search?.trim();
    if (term) params.set("search", term);
    const res = await apiClient.get<{
      data?: UserReporteeMappingSummary[];
      meta?: RawListMeta & {
        mappedCount?: number;
        unmappedCount?: number;
        activeCount?: number;
        inactiveCount?: number;
      };
    }>(`${USERS_BASE}/reportee-mapping?${params.toString()}`);
    const rows = Array.isArray(res) ? res : (res.data ?? []);
    const rawMeta = Array.isArray(res) ? undefined : res.meta;
    const meta = normalizeListMeta(rawMeta, rows.length);
    return {
      data: rows.map((row) => ({
        userId: String(row.userId ?? ""),
        employeeId: String(row.employeeId ?? ""),
        name: String(row.name ?? ""),
        email: String(row.email ?? ""),
        designation: String(row.designation ?? ""),
        isActive: row.isActive !== false,
        mappedCount: Number(row.mappedCount ?? 0),
        sampleReporteeNames: Array.isArray(row.sampleReporteeNames)
          ? row.sampleReporteeNames.map(String)
          : [],
      })),
      meta: {
        ...meta,
        mappedCount: Number(rawMeta?.mappedCount ?? 0),
        unmappedCount: Number(rawMeta?.unmappedCount ?? 0),
        activeCount: Number(rawMeta?.activeCount ?? meta.activeCount ?? 0),
        inactiveCount: Number(rawMeta?.inactiveCount ?? meta.inactiveCount ?? 0),
      },
    };
  },

  async getMappedReporteeIds(projectId: string, userId: string): Promise<string[]> {
    const res = await apiClient.get<{ userId?: string; reporteeIds?: string[] }>(
      `${USERS_BASE}/reportee-mapping/${encodeURIComponent(userId)}?projectId=${encodeURIComponent(projectId)}`,
    );
    return Array.isArray(res?.reporteeIds) ? res.reporteeIds.map(String) : [];
  },

  async getManager(projectId: string, userId: string): Promise<DirectManagerDisplay | null> {
    const res = await apiClient.get<{ manager?: DirectManagerDisplay | null }>(
      `${USERS_BASE}/reportee-mapping/${encodeURIComponent(userId)}/manager?projectId=${encodeURIComponent(projectId)}`,
    );
    const manager = res?.manager;
    if (!manager?.userId) return null;
    return {
      userId: String(manager.userId),
      employeeId: String(manager.employeeId ?? ""),
      name: String(manager.name ?? ""),
    };
  },

  async assignManager(
    projectId: string,
    userId: string,
    managerId: string | null,
  ): Promise<void> {
    await apiClient.patch(
      `${USERS_BASE}/reportee-mapping/${encodeURIComponent(userId)}/manager?projectId=${encodeURIComponent(projectId)}`,
      { managerId },
    );
  },

  async listUsersPage(
    projectId: string,
    page = 1,
    pageSize = DEFAULT_LIST_PAGE_SIZE,
    search?: string,
  ): Promise<ProjectUserListResult> {
    return projectUsersService.listByProject(projectId, page, pageSize, search, "all");
  },

  async updateMapping(projectId: string, userId: string, reporteeIds: string[]): Promise<void> {
    await apiClient.patch(
      `${USERS_BASE}/reportee-mapping/${encodeURIComponent(userId)}?projectId=${encodeURIComponent(projectId)}`,
      { reporteeIds },
    );
  },

  async downloadTemplate(projectId: string): Promise<Blob> {
    return apiClient.getBlob(
      `${USERS_BASE}/bulk/reportee-template?projectId=${encodeURIComponent(projectId)}`,
    );
  },

  async exportMapping(projectId: string): Promise<Blob> {
    return apiClient.getBlob(
      `${USERS_BASE}/bulk/reportee-export?projectId=${encodeURIComponent(projectId)}`,
    );
  },

  async bulkUpload(projectId: string, file: File): Promise<ReporteeBulkMappingResult> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("projectId", projectId);
    return apiClient.postFormData<ReporteeBulkMappingResult>(
      `${USERS_BASE}/bulk/reportee-excel`,
      formData,
    );
  },
};
