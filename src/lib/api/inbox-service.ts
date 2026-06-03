/**
 * Inbox service (INF2-1956).
 *
 * Maps to the live Workflow/Inbox API:
 *   GET   /api/v1/inbox/assigned-to-me
 *   GET   /api/v1/inbox/raised-by-me
 *   GET   /api/v1/inbox/{inboxItemId}/details
 *   PATCH /api/v1/inbox/{inboxId}/approve
 *   PATCH /api/v1/inbox/{inboxId}/reject
 *   POST  /api/v1/inbox/bulk-approve
 *   POST  /api/v1/inbox/bulk-reject
 *
 * The inbox is config-driven: request types, the table "type" label, expanded
 * detail fields, attachments, and the available approve/reject actions all come
 * from backend-computed metadata (`displayMetadata`, `attachments`,
 * `availableActions`) rather than hardcoded UI logic.
 *
 * Mirrors the mock/real seam used by `attendance-config.ts`.
 */

import { apiClient } from "./api-client";

const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API === "true";
const BASE = "/api/v1/inbox";

// ─────────────────────────────────────────────────────────────
// Backend DTO types (matching Swagger schemas)
// ─────────────────────────────────────────────────────────────

export type WorkflowStatus =
  | "Pending_Approval"
  | "Approved"
  | "Rejected"
  | "Sent_Back";

export type SlaStatus = "OnTime" | "Warning" | "Breached";

export type AttachmentRenderer =
  | "image-preview"
  | "pdf-viewer"
  | "geo-map"
  | "generic-file";

export interface UserReference {
  userId: string;
  displayName: string;
  designation?: string;
}

export interface AttachmentItem {
  fileName: string;
  uploadDate: string;
  fileSize: number;
  uploader: string;
  mimeType: string;
  url: string;
  renderer: AttachmentRenderer;
}

export interface ApprovalHistoryEntry {
  level: number;
  action: string;
  performedBy: UserReference;
  actionDate: string;
  remarks?: string;
}

export interface ApprovalHistorySummaryEntry {
  level: number;
  action: string;
  approverName: string;
  actionDate: string;
}

/**
 * Loosely-typed metadata bag produced by the backend for dynamic rendering.
 * We intentionally keep it open-ended so future request types render without
 * code changes. The UI reads `fields` (ordered label/value rows) when present.
 */
export interface DisplayMetadata {
  /** Localised label for the request type, e.g. "Travel Claim". */
  typeLabel?: string;
  /** Short summary string shown in the row, when provided. */
  title?: string;
  /** Employee code shown in the Assigned-to-me table. */
  employeeCode?: string;
  /** Location code shown in the Assigned-to-me table. */
  location?: string;
  /** Ordered, config-driven detail rows for the expanded section. */
  fields?: DisplayField[];
  [key: string]: unknown;
}

export interface DisplayField {
  label: string;
  value: string;
  /** Optional emphasis hint, e.g. "missing" renders the value in red. */
  tone?: "default" | "missing" | "muted";
  /** Render the value across the full width (multi-line text like reason). */
  fullWidth?: boolean;
}

/** Computed action available to the current user for an item. */
export interface AvailableAction {
  /** e.g. "approve", "reject", "send-back". */
  action: string;
  label?: string;
}

export interface InboxItemWithMetadata {
  inboxItemId: string;
  module: string;
  requestType: string;
  requestId: string;
  submittedBy: UserReference;
  submittedDate: string;
  currentStatus: WorkflowStatus;
  currentLevel: number;
  totalLevels: number;
  slaDeadline?: string;
  slaStatus?: SlaStatus;
  escalationStatus?: string;
  moduleData: Record<string, unknown>;
  displayMetadata: DisplayMetadata;
  availableActions: AvailableAction[];
}

export interface RaisedByMeItem {
  inboxItemId: string;
  module: string;
  requestType: string;
  requestId: string;
  submittedDate: string;
  currentStatus: WorkflowStatus;
  currentLevel: number;
  totalLevels: number;
  approvalHistorySummary?: ApprovalHistorySummaryEntry[];
  rejectionReason?: string;
  sendBackRemarks?: string;
  moduleData: Record<string, unknown>;
  displayMetadata: DisplayMetadata;
  /** Approver currently expected to action the request (when pending). */
  assignedTo?: UserReference;
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface AssignedToMeSummary {
  total: number;
  byModule: Record<string, number>;
}

export interface RaisedByMeSummary {
  total: number;
  byStatus: Record<string, number>;
}

export interface AssignedToMeResponse {
  items: InboxItemWithMetadata[];
  pagination: PaginationInfo;
  summary: AssignedToMeSummary;
  availableFilters: string[];
  availableSorts: string[];
}

export interface RaisedByMeResponse {
  items: RaisedByMeItem[];
  pagination: PaginationInfo;
  summary: RaisedByMeSummary;
  availableFilters: string[];
  availableSorts: string[];
}

export interface InboxItemDetails {
  inboxItemId: string;
  module: string;
  requestType: string;
  requestId: string;
  submittedBy: UserReference;
  submittedDate: string;
  currentStatus: WorkflowStatus;
  currentLevel: number;
  totalLevels: number;
  slaDeadline?: string;
  slaStatus?: SlaStatus;
  moduleData: Record<string, unknown>;
  displayMetadata: DisplayMetadata;
  approvalHistory: ApprovalHistoryEntry[];
  attachments: AttachmentItem[];
  availableActions: AvailableAction[];
}

export interface BulkActionFailure {
  inboxItemId: string;
  reason: string;
}

export interface BulkActionResponse {
  totalRequested: number;
  succeeded: string[];
  failed: BulkActionFailure[];
}

export type SortBy = "date" | "name";
export type SortDirection = "asc" | "desc";

export interface InboxQuery {
  requestType?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: SortBy;
  sortDirection?: SortDirection;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

export function isPending(status: WorkflowStatus): boolean {
  return status === "Pending_Approval";
}

export function canApprove(item: { availableActions: AvailableAction[] }): boolean {
  return item.availableActions.some((a) => a.action === "approve");
}

export function canReject(item: { availableActions: AvailableAction[] }): boolean {
  return item.availableActions.some((a) => a.action === "reject");
}

function buildQuery(query: InboxQuery): string {
  const params = new URLSearchParams();
  if (query.requestType) params.set("requestType", query.requestType);
  if (query.status) params.set("status", query.status);
  if (query.dateFrom) params.set("dateFrom", query.dateFrom);
  if (query.dateTo) params.set("dateTo", query.dateTo);
  if (query.sortBy) params.set("sortBy", query.sortBy);
  if (query.sortDirection) params.set("sortDirection", query.sortDirection);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

// ─────────────────────────────────────────────────────────────
// Mock data (in-memory) — usable without a backend
// ─────────────────────────────────────────────────────────────

function delay(ms = 350): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function iso(daysAgo: number, hour = 9): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

const APPROVE_REJECT: AvailableAction[] = [
  { action: "approve", label: "Approve" },
  { action: "reject", label: "Reject" },
];

let mockAssigned: InboxItemWithMetadata[] = [
  {
    inboxItemId: "ibx-1001",
    module: "attendance",
    requestType: "regularization",
    requestId: "att-5001",
    submittedBy: { userId: "u-1", displayName: "Ravi Kumar", designation: "In-Store Promoter" },
    submittedDate: iso(0, 8),
    currentStatus: "Pending_Approval",
    currentLevel: 1,
    totalLevels: 2,
    slaStatus: "OnTime",
    moduleData: {},
    displayMetadata: {
      typeLabel: "Attendance",
      employeeCode: "EMP1042",
      location: "BLR-014",
      fields: [
        { label: "Requested", value: "Today, 8:02 AM" },
        { label: "Check-In", value: "09:14 AM" },
        { label: "Check-Out", value: "Missing", tone: "missing" },
        {
          label: "Reason",
          value:
            "Forgot to mark check-out after the evening store closing. Was on duty till 8 PM.",
          fullWidth: true,
        },
      ],
    },
    availableActions: APPROVE_REJECT,
  },
  {
    inboxItemId: "ibx-1002",
    module: "claims",
    requestType: "travel",
    requestId: "clm-7002",
    submittedBy: { userId: "u-2", displayName: "Priya Nair", designation: "Field Executive" },
    submittedDate: iso(0, 10),
    currentStatus: "Pending_Approval",
    currentLevel: 1,
    totalLevels: 1,
    slaStatus: "Warning",
    moduleData: { claimAmount: 1200, claimType: "Travel" },
    displayMetadata: {
      typeLabel: "Claims",
      employeeCode: "EMP2088",
      location: "BLR-002",
      fields: [
        { label: "Requested", value: "Today, 10:05 AM" },
        { label: "Claim Type", value: "Travel" },
        { label: "Amount", value: "₹1,200" },
        { label: "From", value: "Indiranagar" },
        { label: "To", value: "Whitefield" },
        { label: "Distance", value: "18 km" },
        { label: "Remarks", value: "Cab fare for client store audit visit.", fullWidth: true },
      ],
    },
    availableActions: APPROVE_REJECT,
  },
  {
    inboxItemId: "ibx-1003",
    module: "leave",
    requestType: "casual",
    requestId: "lv-3003",
    submittedBy: { userId: "u-3", displayName: "Arjun Mehta", designation: "Team Lead" },
    submittedDate: iso(1, 14),
    currentStatus: "Pending_Approval",
    currentLevel: 1,
    totalLevels: 1,
    slaStatus: "OnTime",
    moduleData: {},
    displayMetadata: {
      typeLabel: "Leave",
      employeeCode: "EMP3120",
      location: "DEL-009",
      fields: [
        { label: "Requested", value: "Yesterday, 2:10 PM" },
        { label: "Leave Type", value: "Casual Leave" },
        { label: "Date Range", value: "12 Jun – 13 Jun (2 days)" },
        { label: "Reason", value: "Family function out of town.", fullWidth: true },
      ],
    },
    // Outside the approver's rights/date-window -> read-only.
    availableActions: [],
  },
  {
    inboxItemId: "ibx-1004",
    module: "claims",
    requestType: "food",
    requestId: "clm-7004",
    submittedBy: { userId: "u-4", displayName: "Sneha Rao", designation: "In-Store Promoter" },
    submittedDate: iso(2, 11),
    currentStatus: "Approved",
    currentLevel: 1,
    totalLevels: 1,
    slaStatus: "OnTime",
    moduleData: { claimAmount: 350, claimType: "Food" },
    displayMetadata: {
      typeLabel: "Claims",
      employeeCode: "EMP4501",
      location: "BLR-014",
      fields: [
        { label: "Requested", value: "2 days ago" },
        { label: "Claim Type", value: "Food" },
        { label: "Amount", value: "₹350" },
        { label: "Decision", value: "Approved", tone: "default" },
      ],
    },
    availableActions: [],
  },
];

let mockRaised: RaisedByMeItem[] = [
  {
    inboxItemId: "ibx-2001",
    module: "claims",
    requestType: "travel",
    requestId: "clm-9001",
    submittedDate: iso(0, 9),
    currentStatus: "Pending_Approval",
    currentLevel: 1,
    totalLevels: 1,
    assignedTo: { userId: "m-1", displayName: "Suresh Mehta", designation: "Area Manager" },
    moduleData: { claimAmount: 2200, claimType: "Travel" },
    displayMetadata: {
      typeLabel: "Claims",
      fields: [
        { label: "Requested", value: "Today, 9:00 AM" },
        { label: "Claim Type", value: "Travel" },
        { label: "Amount", value: "₹2,200" },
        { label: "Your Reason", value: "Outstation travel for regional review.", fullWidth: true },
      ],
    },
  },
  {
    inboxItemId: "ibx-2002",
    module: "attendance",
    requestType: "regularization",
    requestId: "att-9002",
    submittedDate: iso(3, 18),
    currentStatus: "Approved",
    currentLevel: 1,
    totalLevels: 1,
    approvalHistorySummary: [
      { level: 1, action: "Approved", approverName: "Suresh Mehta", actionDate: iso(2, 10) },
    ],
    moduleData: {},
    displayMetadata: {
      typeLabel: "Attendance",
      fields: [
        { label: "Requested", value: "3 days ago" },
        { label: "Check-In", value: "09:30 AM" },
        { label: "Check-Out", value: "06:45 PM" },
        { label: "Your Reason", value: "Network issue while marking attendance.", fullWidth: true },
      ],
    },
  },
  {
    inboxItemId: "ibx-2003",
    module: "claims",
    requestType: "accommodation",
    requestId: "clm-9003",
    submittedDate: iso(5, 12),
    currentStatus: "Rejected",
    currentLevel: 1,
    totalLevels: 1,
    rejectionReason: "Duplicate entry detected. Please raise a fresh claim with corrected details.",
    approvalHistorySummary: [
      { level: 1, action: "Rejected", approverName: "Suresh Mehta", actionDate: iso(4, 16) },
    ],
    moduleData: { claimAmount: 4500, claimType: "Accommodation" },
    displayMetadata: {
      typeLabel: "Claims",
      fields: [
        { label: "Requested", value: "5 days ago" },
        { label: "Claim Type", value: "Accommodation" },
        { label: "Amount", value: "₹4,500" },
        { label: "Your Reason", value: "Hotel stay during 2-day field deployment.", fullWidth: true },
      ],
    },
  },
];

const mockDetails: Record<string, Partial<InboxItemDetails>> = {
  "ibx-1001": {
    attachments: [
      {
        fileName: "checkin-geo.jpg",
        uploadDate: iso(0, 8),
        fileSize: 248000,
        uploader: "Ravi Kumar",
        mimeType: "image/jpeg",
        url: "https://example.com/files/checkin-geo.jpg",
        renderer: "geo-map",
      },
    ],
  },
  "ibx-1002": {
    attachments: [
      {
        fileName: "cab-receipt.pdf",
        uploadDate: iso(0, 10),
        fileSize: 102400,
        uploader: "Priya Nair",
        mimeType: "application/pdf",
        url: "https://example.com/files/cab-receipt.pdf",
        renderer: "pdf-viewer",
      },
    ],
  },
};

function findAssigned(id: string): InboxItemWithMetadata | undefined {
  return mockAssigned.find((i) => i.inboxItemId === id);
}

function findRaised(id: string): RaisedByMeItem | undefined {
  return mockRaised.find((i) => i.inboxItemId === id);
}

function assignedSummary(): AssignedToMeSummary {
  const pending = mockAssigned.filter((i) => isPending(i.currentStatus));
  const byModule: Record<string, number> = {};
  for (const i of pending) byModule[i.module] = (byModule[i.module] ?? 0) + 1;
  return { total: pending.length, byModule };
}

function raisedSummary(): RaisedByMeSummary {
  const byStatus: Record<string, number> = {};
  for (const i of mockRaised) byStatus[i.currentStatus] = (byStatus[i.currentStatus] ?? 0) + 1;
  return { total: mockRaised.length, byStatus };
}

function sortItems<T extends { submittedDate: string; displayMetadata: DisplayMetadata; submittedBy?: UserReference }>(
  items: T[],
  sortBy: SortBy,
  dir: SortDirection,
): T[] {
  const sorted = [...items].sort((a, b) => {
    if (sortBy === "name") {
      const an = a.submittedBy?.displayName ?? a.displayMetadata.title ?? "";
      const bn = b.submittedBy?.displayName ?? b.displayMetadata.title ?? "";
      return an.localeCompare(bn);
    }
    return new Date(a.submittedDate).getTime() - new Date(b.submittedDate).getTime();
  });
  return dir === "desc" ? sorted.reverse() : sorted;
}

function withinDateWindow(dateIso: string, from?: string, to?: string): boolean {
  const t = new Date(dateIso).getTime();
  if (from && t < new Date(from).getTime()) return false;
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    if (t > end.getTime()) return false;
  }
  return true;
}

// ─────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────

export const inboxService = {
  async getAssignedToMe(query: InboxQuery = {}): Promise<AssignedToMeResponse> {
    if (USE_MOCK_API) {
      await delay();
      const sortBy = query.sortBy ?? "date";
      const dir = query.sortDirection ?? "desc";
      let items = mockAssigned.filter((i) =>
        withinDateWindow(i.submittedDate, query.dateFrom, query.dateTo),
      );
      if (query.requestType) items = items.filter((i) => i.requestType === query.requestType);
      if (query.status) items = items.filter((i) => i.currentStatus === query.status);
      items = sortItems(items, sortBy, dir);
      return {
        items,
        pagination: { page: 1, pageSize: items.length, totalItems: items.length, totalPages: 1 },
        summary: assignedSummary(),
        availableFilters: ["requestType", "status", "date"],
        availableSorts: ["date", "name"],
      };
    }
    return apiClient.get<AssignedToMeResponse>(`${BASE}/assigned-to-me${buildQuery(query)}`);
  },

  async getRaisedByMe(query: InboxQuery = {}): Promise<RaisedByMeResponse> {
    if (USE_MOCK_API) {
      await delay();
      const sortBy = query.sortBy ?? "date";
      const dir = query.sortDirection ?? "desc";
      let items = mockRaised.filter((i) =>
        withinDateWindow(i.submittedDate, query.dateFrom, query.dateTo),
      );
      if (query.requestType) items = items.filter((i) => i.requestType === query.requestType);
      if (query.status) items = items.filter((i) => i.currentStatus === query.status);
      items = sortItems(items, sortBy, dir);
      return {
        items,
        pagination: { page: 1, pageSize: items.length, totalItems: items.length, totalPages: 1 },
        summary: raisedSummary(),
        availableFilters: ["requestType", "status", "date"],
        availableSorts: ["date", "name"],
      };
    }
    return apiClient.get<RaisedByMeResponse>(`${BASE}/raised-by-me${buildQuery(query)}`);
  },

  async getDetails(inboxItemId: string): Promise<InboxItemDetails> {
    if (USE_MOCK_API) {
      await delay(250);
      const base = findAssigned(inboxItemId);
      const raised = findRaised(inboxItemId);
      const src = base ?? raised;
      if (!src) throw new Error("Inbox item not found");
      const extra = mockDetails[inboxItemId] ?? {};
      return {
        inboxItemId: src.inboxItemId,
        module: src.module,
        requestType: src.requestType,
        requestId: src.requestId,
        submittedBy:
          base?.submittedBy ?? { userId: "self", displayName: "You" },
        submittedDate: src.submittedDate,
        currentStatus: src.currentStatus,
        currentLevel: src.currentLevel,
        totalLevels: src.totalLevels,
        slaStatus: base?.slaStatus,
        moduleData: src.moduleData,
        displayMetadata: src.displayMetadata,
        approvalHistory: [],
        attachments: extra.attachments ?? [],
        availableActions: base?.availableActions ?? [],
      };
    }
    return apiClient.get<InboxItemDetails>(`${BASE}/${inboxItemId}/details`);
  },

  async approve(inboxItemId: string, remarks?: string): Promise<void> {
    if (USE_MOCK_API) {
      await delay(250);
      const item = findAssigned(inboxItemId);
      if (item) {
        item.currentStatus = "Approved";
        item.availableActions = [];
      }
      return;
    }
    await apiClient.request<void>(`${BASE}/${inboxItemId}/approve`, {
      method: "PATCH",
      body: JSON.stringify({ remarks: remarks ?? "" }),
    });
  },

  async reject(inboxItemId: string, remarks: string): Promise<void> {
    if (USE_MOCK_API) {
      await delay(250);
      const item = findAssigned(inboxItemId);
      if (item) {
        item.currentStatus = "Rejected";
        item.availableActions = [];
      }
      return;
    }
    await apiClient.request<void>(`${BASE}/${inboxItemId}/reject`, {
      method: "PATCH",
      body: JSON.stringify({ remarks }),
    });
  },

  async bulkApprove(inboxItemIds: string[], remarks = ""): Promise<BulkActionResponse> {
    if (USE_MOCK_API) {
      await delay(400);
      const succeeded: string[] = [];
      const failed: BulkActionFailure[] = [];
      for (const id of inboxItemIds) {
        const item = findAssigned(id);
        if (item && isPending(item.currentStatus)) {
          item.currentStatus = "Approved";
          item.availableActions = [];
          succeeded.push(id);
        } else {
          failed.push({ inboxItemId: id, reason: "Request is not in Pending_Approval status" });
        }
      }
      return { totalRequested: inboxItemIds.length, succeeded, failed };
    }
    return apiClient.post<BulkActionResponse>(`${BASE}/bulk-approve`, {
      inboxItemIds,
      remarks,
    });
  },

  async bulkReject(inboxItemIds: string[], remarks: string): Promise<BulkActionResponse> {
    if (USE_MOCK_API) {
      await delay(400);
      const succeeded: string[] = [];
      const failed: BulkActionFailure[] = [];
      for (const id of inboxItemIds) {
        const item = findAssigned(id);
        if (item && isPending(item.currentStatus)) {
          item.currentStatus = "Rejected";
          item.availableActions = [];
          succeeded.push(id);
        } else {
          failed.push({ inboxItemId: id, reason: "Request is not in Pending_Approval status" });
        }
      }
      return { totalRequested: inboxItemIds.length, succeeded, failed };
    }
    return apiClient.post<BulkActionResponse>(`${BASE}/bulk-reject`, {
      inboxItemIds,
      remarks,
    });
  },
};

// Allow tests/dev to reset the in-memory mock between mounts if needed.
export function __resetInboxMock(
  assigned?: InboxItemWithMetadata[],
  raised?: RaisedByMeItem[],
): void {
  if (assigned) mockAssigned = assigned;
  if (raised) mockRaised = raised;
}
