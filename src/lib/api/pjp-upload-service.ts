/**
 * PJP (Permanent Journey Plan) upload service.
 *
 * Endpoints:
 *   GET  /api/v1/visit-config/pjp/template?projectId=X  → Excel template
 *   POST /api/v1/visit-config/pjp/upload-excel           → Bulk upload (FormData)
 *   GET  /api/v1/visit-config/pjp/export?projectId=X    → Export current PJP
 */

import { apiClient } from "./api-client";

const PJP_BASE = "/api/v1/visit-config/pjp";

export interface PjpUploadError {
  row: number;
  employeeId?: string;
  storeCode?: string;
  errors: string[];
}

export interface PjpUploadResult {
  total: number;
  inserted: number;
  rejected: number;
  errors: PjpUploadError[];
}

export const pjpUploadService = {
  /** Download the PJP upload Excel template. */
  async downloadTemplate(projectId: string): Promise<Blob> {
    return apiClient.getBlob(
      `${PJP_BASE}/template?projectId=${encodeURIComponent(projectId)}`,
    );
  },

  /** Upload PJP Excel file (replaces existing entries for same user+date). */
  async bulkUpload(projectId: string, file: File): Promise<PjpUploadResult> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("projectId", projectId);
    return apiClient.postFormData<PjpUploadResult>(
      `${PJP_BASE}/upload-excel`,
      formData,
    );
  },

  /** Export current PJP data as Excel. */
  async exportPjp(projectId: string): Promise<Blob> {
    return apiClient.getBlob(
      `${PJP_BASE}/export?projectId=${encodeURIComponent(projectId)}`,
    );
  },
};
