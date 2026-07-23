/**
 * User-Reportee Mapping bulk upload service.
 *
 * Provides template download, export, and bulk upload functionality
 * for assigning reportees to managers via Excel.
 *
 * Routes:
 *   GET  /api/v1/users/bulk/reportee-template?projectId=...
 *   GET  /api/v1/users/bulk/reportee-export?projectId=...
 *   POST /api/v1/users/bulk/reportee-excel  (multipart: file + projectId)
 */

import { apiClient } from "./api-client";

const USERS_BASE = "/api/v1/users";

export interface ReporteeBulkMappingResult {
  total: number;
  successCount: number;
  invalidCount: number;
  errors: { row: number | string; managerEmployeeId?: string; errors: string[] }[];
}

export const userReporteeMappingService = {
  /** Download Excel template for bulk reportee mapping upload. */
  async downloadTemplate(projectId: string): Promise<Blob> {
    return apiClient.getBlob(
      `${USERS_BASE}/bulk/reportee-template?projectId=${encodeURIComponent(projectId)}`,
    );
  },

  /** Export current reportee mapping as Excel. */
  async exportMapping(projectId: string): Promise<Blob> {
    return apiClient.getBlob(
      `${USERS_BASE}/bulk/reportee-export?projectId=${encodeURIComponent(projectId)}`,
    );
  },

  /** Bulk upload reportee mappings from Excel file. */
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
