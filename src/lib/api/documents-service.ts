/**
 * Documents service — API layer for the Documents Upload & Management module.
 *
 * Backend endpoints:
 *   GET    /api/v1/documents-config/modules?projectId=       (get target modules)
 *   POST   /api/v1/documents-config/modules                  (upsert module list)
 *   PATCH  /api/v1/documents-config/modules/:moduleName      (toggle module)
 *   POST   /api/v1/documents/upload                          (multipart upload)
 *   GET    /api/v1/documents?projectId=&fromDate=&toDate=&page=&limit=
 *   PATCH  /api/v1/documents/:id/status                      (toggle status)
 */

import { apiClient } from "./api-client";

const CONFIG_BASE = "/api/v1/documents-config";
const DOCUMENTS_BASE = "/api/v1/documents";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type DocumentType = "PDF" | "Excel" | "Word" | "Video" | "Image";
export type DocumentStatus = "Active" | "Inactive";

export interface DocumentRecord {
  _id: string;
  projectId: string;
  designationId: string;
  title: string;
  documentType: DocumentType;
  targetModule: string;
  description: string | null;
  fileUrl: string;
  gcsPath: string;
  originalFileName: string;
  fileSize: number;
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

export interface UploadDocumentInput {
  title: string;
  documentType: DocumentType;
  targetModule: string;
  designationId: string;
  projectId: string;
  description?: string;
  fromDate?: string;
  toDate?: string;
  file: File;
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
    formData.append("file", input.file);
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
};
