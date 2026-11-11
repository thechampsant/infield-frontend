/**
 * Documents service — API layer for the Documents Upload & Management module.
 *
 * Backend endpoints:
 *   GET    /api/v1/documents-config/modules?projectId=       (get target modules)
 *   POST   /api/v1/documents-config/modules                  (upsert module list)
 *   PATCH  /api/v1/documents-config/modules/:moduleName      (toggle module)
 *   POST   /api/v1/documents/upload                          (multipart upload)
 *   GET    /api/v1/documents?projectId=&fromDate=&toDate=&page=&limit=
 *   PATCH  /api/v1/documents/:id                             (edit one row and assign copies)
 *   PATCH  /api/v1/documents/:id/status                      (toggle status)
 */

import { ApiError, apiClient } from "./api-client";
import { parseYouTubeUrl } from "@/lib/documents";

const CONFIG_BASE = "/api/v1/documents-config";
const DOCUMENTS_BASE = "/api/v1/documents";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type DocumentType = "PDF" | "Excel" | "Word" | "Video" | "Image" | "YouTube";
export type DocumentStatus = "Active" | "Inactive";

export interface DocumentRecord {
  _id: string;
  projectId: string;
  designationId: string;
  title: string;
  category?: string;
  youtubeUrl?: string | null;
  youtubeId?: string;
  youtubeKind?: "video" | "playlist";
  documentType: DocumentType;
  targetModule: string;
  description: string | null;
  fileUrl: string;
  gcsPath: string;
  originalFileName: string;
  fileSize: number;
  acknowledgementRequired?: boolean;
  acknowledgementStatus?: "NotRequired" | "Pending" | "Acknowledged";
  acknowledgedAt?: string | null;
  documentVersion?: number;
  documentGroupId?: string;
  assignmentFamilyId?: string;
  fromDate: string | null;
  toDate: string | null;
  status: DocumentStatus;
  uploadedBy: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DocumentTargetModule {
  name: string;
  isActive: boolean;
}

export interface DocumentTargetModuleConfig {
  _id: string;
  projectId: string;
  modules: DocumentTargetModule[];
}

<<<<<<< HEAD
interface UploadDocumentMetadata {
=======
export interface ResourceCategory {
  name: string;
  documentCount: number;
  isActive: boolean;
}

export interface ResourceCategories {
  projectId: string;
  revision: number;
  categories: ResourceCategory[];
}

export interface SaveResourceCategoriesInput {
  projectId: string;
  revision: number;
  categories: { name: string; originalName?: string; isActive: boolean }[];
}

export interface UploadDocumentInput {
>>>>>>> main
  title: string;
  documentType: DocumentType;
  targetModule: string;
  designationId: string;
  projectId: string;
  description?: string;
  fromDate?: string;
  toDate?: string;
  acknowledgementRequired?: boolean;
}

export type UploadDocumentInput = UploadDocumentMetadata & (
  | { documentType: "YouTube"; youtubeUrl: string; file?: never }
  | { documentType: Exclude<DocumentType, "YouTube">; file: File; youtubeUrl?: never }
);

/** Updates a single designation row; versions and assignments are server-owned. */
export interface UpdateDocumentInput {
  title: string;
  category: string;
  description: string | null;
  fromDate: string | null;
  toDate: string | null;
  acknowledgementRequired: boolean;
  alsoAssignTo: string[];
  file?: File;
  youtubeUrl?: string;
}

export interface DocumentAssignmentsResponse {
  /** Complete set across all pages, including inactive rows. */
  designationIds: string[];
  canAssign: boolean;
}

export interface DocumentAcknowledgementUser {
  userId: string;
  firstName?: string;
  lastName?: string;
  name: string;
  email?: string;
  designationId: string;
  status: "Acknowledged" | "Pending";
  acknowledgedAt: unknown | null;
}

export interface DocumentAcknowledgementReport {
  document: {
    _id: string;
    title: string;
    documentVersion: number;
    documentGroupId: string;
    acknowledgementRequired: boolean;
  };
  summary: {
    totalUsers: number;
    acknowledged: number;
    pending: number;
  };
  users: DocumentAcknowledgementUser[];
}

export interface DocumentsListResponse {
  data: DocumentRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface DocumentsFilterParams {
  projectId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

// ─────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────

export const documentsService = {
  async getCategories(projectId: string): Promise<ResourceCategories> {
    return apiClient.get<ResourceCategories>(`${CONFIG_BASE}/categories?projectId=${encodeURIComponent(projectId)}`);
  },

  async saveCategories(input: SaveResourceCategoriesInput): Promise<ResourceCategories> {
    return apiClient.put<ResourceCategories>(`${CONFIG_BASE}/categories`, input);
  },

  // ─── Target Module Config ────────────────────────────────────

  /**
   * Get the list of target modules for a project.
   * Seeds defaults on first access if none exist.
   */
  async getTargetModules(projectId: string): Promise<DocumentTargetModuleConfig> {
    return apiClient.get<DocumentTargetModuleConfig>(
      `${CONFIG_BASE}/modules?projectId=${encodeURIComponent(projectId)}`,
    );
  },

  /**
   * Create or update the full list of target modules for a project.
   */
  async upsertTargetModules(
    projectId: string,
    modules: DocumentTargetModule[],
  ): Promise<DocumentTargetModuleConfig> {
    return apiClient.post<DocumentTargetModuleConfig>(`${CONFIG_BASE}/modules`, {
      projectId,
      modules,
    });
  },

  /**
   * Toggle a single target module active/inactive.
   */
  async toggleTargetModule(
    projectId: string,
    moduleName: string,
    isActive: boolean,
  ): Promise<DocumentTargetModuleConfig> {
    return apiClient.patch<DocumentTargetModuleConfig>(
      `${CONFIG_BASE}/modules/${encodeURIComponent(moduleName)}`,
      { projectId, isActive },
    );
  },

  // ─── Document Upload ─────────────────────────────────────────

  /**
   * Upload a document (multipart/form-data).
   */
  async uploadDocument(input: UploadDocumentInput): Promise<DocumentRecord> {
    const formData = new FormData();
    if (input.file) formData.append("file", input.file);
    if (input.documentType === "YouTube") {
      const link = parseYouTubeUrl(input.youtubeUrl);
      if (!link) throw new Error("Enter a valid YouTube video or playlist link.");
      formData.append("youtubeUrl", link.url);
      formData.append("youtubeId", link.id);
      formData.append("youtubeKind", link.kind);
    }
    formData.append("title", input.title);
    formData.append("documentType", input.documentType);
    formData.append("targetModule", input.targetModule);
    formData.append("designationId", input.designationId);
    formData.append("projectId", input.projectId);
    if (input.description) {
      formData.append("description", input.description);
    }
    if (input.fromDate) {
      formData.append("fromDate", input.fromDate);
    }
    if (input.toDate) {
      formData.append("toDate", input.toDate);
    }
    formData.append("acknowledgementRequired", String(Boolean(input.acknowledgementRequired)));

    return apiClient.postFormData<DocumentRecord>(`${DOCUMENTS_BASE}/upload`, formData);
  },

  // ─── Document List & Filter ──────────────────────────────────

  /**
   * List documents for a project with optional date-range filters.
   * If no projectId is provided, the backend uses the logged-in user's projectId.
   */
  async listDocuments(params: DocumentsFilterParams): Promise<DocumentsListResponse> {
    const searchParams = new URLSearchParams();
    if (params.projectId) searchParams.append("projectId", params.projectId);
    if (params.fromDate) searchParams.append("fromDate", params.fromDate);
    if (params.toDate) searchParams.append("toDate", params.toDate);
    if (params.page) searchParams.append("page", String(params.page));
    if (params.limit) searchParams.append("limit", String(params.limit));

    return apiClient.get<DocumentsListResponse>(
      `${DOCUMENTS_BASE}?${searchParams.toString()}`,
    );
  },

  /** Assignment families differ from version lineage; let the backend resolve them. */
  async getAssignments(document: Pick<DocumentRecord, "_id" | "designationId">): Promise<DocumentAssignmentsResponse> {
    try {
      const result = await apiClient.get<{ designationIds: string[] }>(
        `${DOCUMENTS_BASE}/${encodeURIComponent(document._id)}/assignments`,
      );
      return { designationIds: result.designationIds, canAssign: true };
    } catch (error) {
      // Older deployments lack this route. Do not infer families from version IDs,
      // titles or shared files, or offer assignments whose uniqueness is unknown.
      if (error instanceof ApiError && error.status === 404) {
        return { designationIds: [document.designationId], canAssign: false };
      }
      throw error;
    }
  },

  /** Atomically update this row and create additional designation rows. */
  async updateDocument(documentId: string, input: UpdateDocumentInput): Promise<DocumentRecord> {
    const endpoint = `${DOCUMENTS_BASE}/${encodeURIComponent(documentId)}`;
    const { file, ...metadata } = input;
    const link = input.youtubeUrl === undefined ? null : parseYouTubeUrl(input.youtubeUrl);
    if (input.youtubeUrl !== undefined && !link) throw new Error("Enter a valid YouTube video or playlist link.");
    const payload = link ? { ...metadata, youtubeUrl: link.url, youtubeId: link.id, youtubeKind: link.kind } : metadata;
    if (!file) return apiClient.patch<DocumentRecord>(endpoint, payload);

    const formData = new FormData();
    formData.append("file", file);
    // JSON retains explicit nulls (clearing fields), booleans and assignment arrays.
    formData.append("metadata", JSON.stringify(payload));
    return apiClient.patchFormData<DocumentRecord>(endpoint, formData);
  },

  // ─── Document Status Toggle ──────────────────────────────────

  /**
   * Toggle document status (Active/Inactive).
   */
  async updateDocumentStatus(
    documentId: string,
    status: DocumentStatus,
  ): Promise<DocumentRecord> {
    return apiClient.patch<DocumentRecord>(
      `${DOCUMENTS_BASE}/${encodeURIComponent(documentId)}/status`,
      { status },
    );
  },

  async getAcknowledgementReport(documentId: string): Promise<DocumentAcknowledgementReport> {
    return apiClient.get<DocumentAcknowledgementReport>(
      `${DOCUMENTS_BASE}/${encodeURIComponent(documentId)}/acknowledgements`,
    );
  },
};
