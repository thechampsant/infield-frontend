/**
 * User-Store Mapping service.
 *
 * The mapping is stored directly on the user document as:
 *   user.storeIds = [storeObjectId, storeObjectId, ...]
 *
 * This is set via PATCH /api/v1/users/:id with { storeIds: [...] }
 * The field key is USER_STORE_MAPPING_FIELD_KEY = 'storeIds' (from @app/common).
 *
 * Reading mapped stores per user: user[storeIds] array on the user record.
 * Reading all stores for project: GET /api/v1/stores?projectId=...
 */

import { apiClient } from "./api-client";
import { storeService, type StoreRecord } from "./store-service";

const USERS_BASE = "/api/v1/users";

/** The field key used on the user document for store mapping (mirrors backend constant). */
export const USER_STORE_MAPPING_FIELD_KEY = "storeIds";

export interface MappedUser {
  backendId: string;
  employeeId: string;
  name: string;
  email: string;
  designation: string;
  /** Array of store ObjectId strings currently mapped to this user */
  mappedStoreIds: string[];
}

interface RawUser {
  _id?: string;
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  employeeId?: string;
  designation?: string | { name?: string };
  storeIds?: unknown;
  [key: string]: unknown;
}

interface PaginatedUsers {
  data?: RawUser[];
  meta?: unknown;
}

export interface BulkMappingResult {
  total: number;
  successCount: number;
  invalidCount: number;
  errors: { row: number | string; employeeId?: string; errors: string[] }[];
}

function normalizeUser(raw: RawUser): MappedUser {
  const backendId = String(raw._id ?? raw.id ?? "");
  const name = `${raw.firstName ?? ""} ${raw.lastName ?? ""}`.trim() || raw.email || "";
  const designation =
    typeof raw.designation === "object" && raw.designation
      ? ((raw.designation as any).name ?? "")
      : String(raw.designation ?? "");

  // storeIds stored as array of ObjectId strings on user doc
  const rawStoreIds = raw[USER_STORE_MAPPING_FIELD_KEY];
  let mappedStoreIds: string[] = [];
  if (Array.isArray(rawStoreIds)) {
    mappedStoreIds = rawStoreIds.map((id: unknown) => String(id)).filter(Boolean);
  } else if (typeof rawStoreIds === "string" && rawStoreIds) {
    mappedStoreIds = [rawStoreIds];
  }

  return {
    backendId,
    employeeId: raw.employeeId ?? backendId,
    name,
    email: String(raw.email ?? ""),
    designation,
    mappedStoreIds,
  };
}

export const userStoreMappingService = {
  /** List all active users for a project with their current store mappings. */
  async listUsersWithMapping(projectId: string, limit = 10000): Promise<MappedUser[]> {
    const res = await apiClient.get<PaginatedUsers | RawUser[]>(
      `${USERS_BASE}?projectId=${encodeURIComponent(projectId)}&limit=${limit}`,
    );
    const rows = Array.isArray(res) ? res : ((res as PaginatedUsers).data ?? []);
    return rows.map(normalizeUser);
  },

  /** List all active stores for a project. */
  async listStores(projectId: string): Promise<StoreRecord[]> {
    return storeService.listByProject(projectId);
  },

  /**
   * Update the store mapping for a user.
   * Sends PATCH /api/v1/users/:userId with { storeIds: [...] }.
   */
  async updateMapping(userId: string, storeIds: string[]): Promise<void> {
    await apiClient.patch(`${USERS_BASE}/${encodeURIComponent(userId)}`, {
      [USER_STORE_MAPPING_FIELD_KEY]: storeIds,
    });
  },

  /** Clear all store mappings for a user. */
  async clearMapping(userId: string): Promise<void> {
    await apiClient.patch(`${USERS_BASE}/${encodeURIComponent(userId)}`, {
      [USER_STORE_MAPPING_FIELD_KEY]: [],
    });
  },

  /** Download Excel template for bulk mapping upload. */
  async downloadTemplate(projectId: string): Promise<Blob> {
    return apiClient.getBlob(
      `${USERS_BASE}/bulk/mapping-template?projectId=${encodeURIComponent(projectId)}`,
    );
  },

  /** Export current user-store mapping as Excel. */
  async exportMapping(projectId: string): Promise<Blob> {
    return apiClient.getBlob(
      `${USERS_BASE}/bulk/mapping-export?projectId=${encodeURIComponent(projectId)}`,
    );
  },

  /** Bulk upload user-store mappings from Excel file. */
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
