/**
 * Inbox Items service.
 *
 * Endpoints:
 *   GET   /api/v1/inbox/assigned-to-me   — Get pending approvals
 *   PATCH /api/v1/inbox/:id/approve      — Approve single item
 *   PATCH /api/v1/inbox/:id/reject       — Reject single item
 *   PATCH /api/v1/inbox/:id/send-back    — Send back single item
 *   POST  /api/v1/inbox/bulk-approve     — Bulk approve
 *   POST  /api/v1/inbox/bulk-reject      — Bulk reject
 *   POST  /api/v1/inbox/bulk-send-back   — Bulk send back
 */

import { apiClient } from "./api-client";

const BASE = "/api/v1/inbox";

// ─── Types ────────────────────────────────────────────────────────────────

export interface InboxSubmittedBy {
  userId: string;
  firstName: string;
  lastName: string;
  designation: string;
}

export interface InboxDisplayField {
  key: string;
  label: string;
  value: string;
}

export type InboxAction = "approve" | "reject" | "send-back";
export type InboxSlaStatus = "OnTime" | "Warning" | "Breached";
export type InboxModule = "claims" | "leave" | "regularization" | "visit";

export interface InboxItem {
  inboxItemId: string;
  module: string;
  requestType: string;
  status: string;
  submittedBy: InboxSubmittedBy;
  submittedDate: string;
  slaDeadline: string;
  slaStatus: InboxSlaStatus;
  displayFields: InboxDisplayField[];
  actions: InboxAction[];
}

export interface InboxPagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface InboxListResponse {
  items: InboxItem[];
  pagination: InboxPagination;
}

export interface InboxFilters {
  projectId?: string;
  module?: string;
  requestType?: string;
  status?: string;
  slaStatus?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: "slaDeadline" | "submittedDate";
  sortDirection?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface InboxActionResult {
  inboxItemId: string;
  status: string;
  action: string;
  processedAt: string;
}

export interface InboxBulkResult {
  succeeded: string[];
  failed: string[];
}

// ─── Raw types ────────────────────────────────────────────────────────────

interface RawInboxItem {
  inboxItemId?: string;
  module?: string;
  requestType?: string;
  status?: string;
  submittedBy?: InboxSubmittedBy;
  submittedDate?: string;
  slaDeadline?: string;
  slaStatus?: string;
  displayFields?: InboxDisplayField[];
  actions?: string[];
}

interface RawListResponse {
  items?: RawInboxItem[];
  pagination?: InboxPagination;
}

// ─── Normalizers ──────────────────────────────────────────────────────────

function normalizeItem(raw: RawInboxItem): InboxItem {
  return {
    inboxItemId: raw.inboxItemId ?? "",
    module: raw.module ?? "",
    requestType: raw.requestType ?? "",
    status: raw.status ?? "",
    submittedBy: raw.submittedBy ?? {
      userId: "",
      firstName: "",
      lastName: "",
      designation: "",
    },
    submittedDate: raw.submittedDate ?? "",
    slaDeadline: raw.slaDeadline ?? "",
    slaStatus: (raw.slaStatus as InboxSlaStatus) ?? "OnTime",
    displayFields: raw.displayFields ?? [],
    actions: (raw.actions as InboxAction[]) ?? [],
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function buildQuery(filters: InboxFilters): string {
  const params = new URLSearchParams();
  if (filters.projectId) params.set("projectId", filters.projectId);
  if (filters.module) params.set("module", filters.module);
  if (filters.requestType) params.set("requestType", filters.requestType);
  if (filters.status) params.set("status", filters.status);
  if (filters.slaStatus) params.set("slaStatus", filters.slaStatus);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.sortBy) params.set("sortBy", filters.sortBy);
  if (filters.sortDirection) params.set("sortDirection", filters.sortDirection);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

// ─── Service ──────────────────────────────────────────────────────────────

export const inboxItemsService = {
  /**
   * Get items assigned to the current user (pending approvals).
   */
  async getAssignedToMe(filters: InboxFilters = {}): Promise<InboxListResponse> {
    const res = await apiClient.get<RawListResponse>(
      `${BASE}/assigned-to-me${buildQuery(filters)}`
    );
    return {
      items: Array.isArray(res?.items) ? res.items.map(normalizeItem) : [],
      pagination: res?.pagination ?? { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    };
  },

  /**
   * Approve a single inbox item.
   */
  async approve(inboxItemId: string, remarks: string = "Approved by admin"): Promise<InboxActionResult> {
    return apiClient.patch<InboxActionResult>(
      `${BASE}/${encodeURIComponent(inboxItemId)}/approve`,
      { remarks }
    );
  },

  /**
   * Reject a single inbox item.
   */
  async reject(inboxItemId: string, remarks: string): Promise<InboxActionResult> {
    return apiClient.patch<InboxActionResult>(
      `${BASE}/${encodeURIComponent(inboxItemId)}/reject`,
      { remarks }
    );
  },

  /**
   * Send back a single inbox item.
   */
  async sendBack(inboxItemId: string, remarks: string): Promise<InboxActionResult> {
    return apiClient.patch<InboxActionResult>(
      `${BASE}/${encodeURIComponent(inboxItemId)}/send-back`,
      { remarks }
    );
  },

  /**
   * Bulk approve multiple items.
   */
  async bulkApprove(inboxItemIds: string[], remarks: string = "Approved by admin"): Promise<InboxBulkResult> {
    return apiClient.post<InboxBulkResult>(`${BASE}/bulk-approve`, {
      inboxItemIds,
      remarks,
    });
  },

  /**
   * Bulk reject multiple items.
   */
  async bulkReject(inboxItemIds: string[], remarks: string): Promise<InboxBulkResult> {
    return apiClient.post<InboxBulkResult>(`${BASE}/bulk-reject`, {
      inboxItemIds,
      remarks,
    });
  },

  /**
   * Bulk send back multiple items.
   */
  async bulkSendBack(inboxItemIds: string[], remarks: string): Promise<InboxBulkResult> {
    return apiClient.post<InboxBulkResult>(`${BASE}/bulk-send-back`, {
      inboxItemIds,
      remarks,
    });
  },
};
