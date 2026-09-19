import { apiClient } from "./api-client";
import {
  clampListPageSize,
  DEFAULT_LIST_PAGE_SIZE,
  normalizeListMeta,
  type ListMeta,
  type RawListMeta,
} from "./pagination";

const BASE = "/api/v1/upload-audits";

export type UploadAuditKind =
  | "roles"
  | "designations"
  | "users"
  | "stores"
  | "products"
  | "user-store-map"
  | "pjp"
  | "reportee-map"
  | "product-store-map"
  | "target-master"
  | "focus-target"
  | "custom-view"
  | "holidays";

export type UploadAuditResult = "accepted" | "gcs_failed";

export interface UploadAuditRow {
  id: string;
  kind: UploadAuditKind | string;
  originalFileName: string;
  uploadedBy: string;
  uploadedByName: string;
  createdAt: string;
  result: UploadAuditResult | string;
  summary: {
    total?: number;
    successCount?: number;
    invalidCount?: number;
  };
  hasErrorLog: boolean;
  canDownload: boolean;
}

export interface UploadAuditListResult {
  data: UploadAuditRow[];
  meta: ListMeta;
}

export const UPLOAD_AUDIT_KIND_LABELS: Record<string, string> = {
  roles: "Roles",
  designations: "Designations",
  users: "Users",
  stores: "Stores",
  products: "Products",
  "user-store-map": "User-Store Map",
  pjp: "PJP",
  "reportee-map": "Reportee Map",
  "product-store-map": "Product-Store Map",
  "target-master": "Target Master",
  "focus-target": "Focus Target",
  "custom-view": "Custom View",
  holidays: "Holidays",
};

type UploadAuditEnvelope = {
  data?: UploadAuditRow[];
  meta?: RawListMeta;
};

export const uploadAuditService = {
  async list(
    projectId: string,
    kinds: string | string[],
    page = 1,
    pageSize = DEFAULT_LIST_PAGE_SIZE,
  ): Promise<UploadAuditListResult> {
    const kind = Array.isArray(kinds) ? kinds.join(",") : kinds;
    const params = new URLSearchParams({
      projectId,
      kind,
      page: String(page),
      pageSize: String(clampListPageSize(pageSize)),
    });
    const res = await apiClient.getRaw<UploadAuditEnvelope>(`${BASE}?${params.toString()}`);
    const rows = Array.isArray(res?.data) ? res.data : [];
    return {
      data: rows,
      meta: normalizeListMeta(res?.meta, rows.length),
    };
  },

  downloadFile(id: string, projectId: string): Promise<Blob> {
    return apiClient.getBlob(
      `${BASE}/${encodeURIComponent(id)}/file?projectId=${encodeURIComponent(projectId)}`,
    );
  },

  downloadErrorLog(id: string, projectId: string): Promise<Blob> {
    return apiClient.getBlob(
      `${BASE}/${encodeURIComponent(id)}/error-log?projectId=${encodeURIComponent(projectId)}`,
    );
  },
};

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
