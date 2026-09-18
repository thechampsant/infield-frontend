/**
 * User-Store Mapping service.
 *
 * List rows come from GET /users/store-mapping (paged summaries).
 * Assigning stores still PATCHes user.storeIds.
 */

import { apiClient } from "./api-client";
import {
  clampListPageSize,
  DEFAULT_LIST_PAGE_SIZE,
  normalizeListMeta,
  type ListMeta,
  type RawListMeta,
} from "./pagination";
import { storeService, type StoreRecord } from "./store-service";

const USERS_BASE = "/api/v1/users";

export const USER_STORE_MAPPING_FIELD_KEY = "storeIds";

export type UserStoreMappingFilter = "all" | "mapped" | "unmapped";

export interface UserStoreMappingSummary {
  userId: string;
  employeeId: string;
  name: string;
  email: string;
  designation: string;
  mappedCount: number;
  sampleStoreCodes: string[];
}

export interface UserStoreMappingListResult {
  data: UserStoreMappingSummary[];
  meta: ListMeta & { mappedCount: number; unmappedCount: number };
}

export interface MappedUser {
  backendId: string;
  employeeId: string;
  name: string;
  email: string;
  designation: string;
  mappedStoreIds: string[];
}

export interface BulkMappingResult {
  total: number;
  successCount: number;
  invalidCount: number;
  errors: { row: number | string; employeeId?: string; errors: string[] }[];
}

export const userStoreMappingService = {
  async listPage(
    projectId: string,
    page = 1,
    pageSize = DEFAULT_LIST_PAGE_SIZE,
    search?: string,
    mapped: UserStoreMappingFilter = "all",
  ): Promise<UserStoreMappingListResult> {
    const params = new URLSearchParams({
      projectId,
      page: String(page),
      pageSize: String(clampListPageSize(pageSize)),
      mapped,
    });
    const term = search?.trim();
    if (term) params.set("search", term);
    const res = await apiClient.get<{
      data?: UserStoreMappingSummary[];
      meta?: RawListMeta & { mappedCount?: number; unmappedCount?: number };
    }>(`${USERS_BASE}/store-mapping?${params.toString()}`);
    const rows = Array.isArray(res) ? res : (res.data ?? []);
    const meta = normalizeListMeta(Array.isArray(res) ? undefined : res.meta, rows.length);
    return {
      data: rows.map((row) => ({
        userId: String(row.userId ?? ""),
        employeeId: String(row.employeeId ?? ""),
        name: String(row.name ?? ""),
        email: String(row.email ?? ""),
        designation: String(row.designation ?? ""),
        mappedCount: Number(row.mappedCount ?? 0),
        sampleStoreCodes: Array.isArray(row.sampleStoreCodes)
          ? row.sampleStoreCodes.map(String)
          : [],
      })),
      meta: {
        ...meta,
        mappedCount: Number(
          (Array.isArray(res) ? undefined : res.meta)?.mappedCount ?? 0,
        ),
        unmappedCount: Number(
          (Array.isArray(res) ? undefined : res.meta)?.unmappedCount ?? 0,
        ),
      },
    };
  },

  async getMappedStoreIds(projectId: string, userId: string): Promise<string[]> {
    const res = await apiClient.get<{ userId?: string; storeIds?: string[] }>(
      `${USERS_BASE}/store-mapping/${encodeURIComponent(userId)}?projectId=${encodeURIComponent(projectId)}`,
    );
    return Array.isArray(res?.storeIds) ? res.storeIds.map(String) : [];
  },

  async listStoresPage(
    projectId: string,
    page = 1,
    pageSize = DEFAULT_LIST_PAGE_SIZE,
    search?: string,
  ) {
    return storeService.listByProject(projectId, page, pageSize, search);
  },

  async updateMapping(userId: string, storeIds: string[]): Promise<void> {
    await apiClient.patch(`${USERS_BASE}/${encodeURIComponent(userId)}`, {
      [USER_STORE_MAPPING_FIELD_KEY]: storeIds,
    });
  },

  async clearMapping(userId: string): Promise<void> {
    await apiClient.patch(`${USERS_BASE}/${encodeURIComponent(userId)}`, {
      [USER_STORE_MAPPING_FIELD_KEY]: [],
    });
  },

  async downloadTemplate(projectId: string): Promise<Blob> {
    return apiClient.getBlob(
      `${USERS_BASE}/bulk/mapping-template?projectId=${encodeURIComponent(projectId)}`,
    );
  },

  async exportMapping(projectId: string): Promise<Blob> {
    return apiClient.getBlob(
      `${USERS_BASE}/bulk/mapping-export?projectId=${encodeURIComponent(projectId)}`,
    );
  },

  async bulkUpload(projectId: string, file: File): Promise<BulkMappingResult> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("projectId", projectId);
    return apiClient.postFormData<BulkMappingResult>(
      `${USERS_BASE}/bulk/mapping-excel`,
      formData,
    );
  },
};

export type { StoreRecord };
