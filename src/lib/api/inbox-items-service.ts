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
  displayName: string;
  designation: string;
}

export interface InboxSlaDisplay {
  status: string;
  indicator: string;
  breachDuration: string | null;
}

export interface InboxDisplayField {
  fieldKey: string;
  label: string;
  dataType: string;
  displayOrder: number;
}

export interface InboxAvailableAction {
  actionKey: string;
  label: string;
  icon: string;
  color: string;
  enabled: boolean;
  confirmationRequired: boolean;
  remarksRequired: boolean;
}

export interface InboxStatusConfig {
  displayLabel: string;
  colorCode: string;
  icon: string;
}

export interface InboxDisplayMetadata {
  fields: InboxDisplayField[];
  sections: unknown[];
  actions: unknown[];
  statusConfig: Record<string, InboxStatusConfig>;
  formatTemplates: Record<string, unknown>;
  attachmentConfig: unknown | null;
}

export type InboxSlaStatus = "OnTime" | "Warning" | "Breached";

export interface InboxItem {
  inboxItemId: string;
  module: string;
  requestType: string;
  requestId: string;
  submittedBy: InboxSubmittedBy;
  submittedDate: string;
  currentStatus: string;
  currentLevel: number;
  totalLevels: number;
  slaDeadline: string;
  slaStatus: InboxSlaStatus;
  slaDisplay: InboxSlaDisplay;
  escalationStatus: string | null;
  moduleData: Record<string, unknown>;
  displayMetadata: InboxDisplayMetadata;
  availableActions: InboxAvailableAction[];
}

export interface InboxPagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface InboxSummary {
  total: number;
  byModule: Record<string, number>;
}

export interface InboxFilterOption {
  value: string;
  label: string;
}

export interface InboxAvailableFilter {
  filterKey: string;
  label: string;
  filterType: string;
  options?: InboxFilterOption[];
}

export interface InboxAvailableSort {
  sortKey: string;
  label: string;
  defaultDirection: string;
}

export interface InboxListResponse {
  items: InboxItem[];
  pagination: InboxPagination;
  summary: InboxSummary;
  availableFilters: InboxAvailableFilter[];
  availableSorts: InboxAvailableSort[];
}

export interface InboxFilters {
  projectId?: string;
  module?: string;
  requestType?: string;
  status?: string;
  slaStatus?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
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

interface RawListResponse {
  items?: unknown[];
  pagination?: InboxPagination;
  summary?: InboxSummary;
  availableFilters?: InboxAvailableFilter[];
  availableSorts?: InboxAvailableSort[];
}

// ─── Normalizers ──────────────────────────────────────────────────────────

function normalizeItem(raw: Record<string, unknown>): InboxItem {
  const submittedBy = (raw.submittedBy ?? {}) as Record<string, unknown>;
  const slaDisplay = (raw.slaDisplay ?? {}) as Record<string, unknown>;
  const displayMetadata = (raw.displayMetadata ?? {}) as Record<string, unknown>;

  return {
    inboxItemId: (raw.inboxItemId as string) ?? "",
    module: (raw.module as string) ?? "",
    requestType: (raw.requestType as string) ?? "",
    requestId: (raw.requestId as string) ?? "",
    submittedBy: {
      userId: (submittedBy.userId as string) ?? "",
      displayName: (submittedBy.displayName as string) ?? "",
      designation: (submittedBy.designation as string) ?? "",
    },
    submittedDate: (raw.submittedDate as string) ?? "",
    currentStatus: (raw.currentStatus as string) ?? "",
    currentLevel: (raw.currentLevel as number) ?? 1,
    totalLevels: (raw.totalLevels as number) ?? 1,
    slaDeadline: (raw.slaDeadline as string) ?? "",
    slaStatus: ((raw.slaStatus as string) ?? "OnTime") as InboxSlaStatus,
    slaDisplay: {
      status: (slaDisplay.status as string) ?? "",
      indicator: (slaDisplay.indicator as string) ?? "none",
      breachDuration: (slaDisplay.breachDuration as string) ?? null,
    },
    escalationStatus: (raw.escalationStatus as string) ?? null,
    moduleData: (raw.moduleData as Record<string, unknown>) ?? {},
    displayMetadata: {
      fields: Array.isArray(displayMetadata.fields) ? displayMetadata.fields : [],
      sections: Array.isArray(displayMetadata.sections) ? displayMetadata.sections : [],
      actions: Array.isArray(displayMetadata.actions) ? displayMetadata.actions : [],
      statusConfig: (displayMetadata.statusConfig as Record<string, InboxStatusConfig>) ?? {},
      formatTemplates: (displayMetadata.formatTemplates as Record<string, unknown>) ?? {},
      attachmentConfig: displayMetadata.attachmentConfig ?? null,
    },
    availableActions: Array.isArray(raw.availableActions)
      ? (raw.availableActions as InboxAvailableAction[])
      : [],
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
      items: Array.isArray(res?.items)
        ? res.items.map((i) => normalizeItem(i as Record<string, unknown>))
        : [],
      pagination: res?.pagination ?? { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
      summary: res?.summary ?? { total: 0, byModule: {} },
      availableFilters: res?.availableFilters ?? [],
      availableSorts: res?.availableSorts ?? [],
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
