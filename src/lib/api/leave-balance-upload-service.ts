/**
 * Leave Balance uploader service.
 *
 * Endpoints:
 *   GET  /api/v1/leave-balances/bulk/template?projectId=X → Excel template
 *        (employeeId + one column per configured leave type short code)
 *   POST /api/v1/leave-balances/bulk/excel?projectId=X    → Bulk upload (FormData)
 *
 * Export Current goes through master export jobs with kind "leave-balance".
 */

import { apiClient } from "./api-client";

const LEAVE_BALANCE_BASE = "/api/v1/leave-balances/bulk";

export interface LeaveBalanceUploadRowIssue {
  row: number;
  employeeId?: string;
  errors?: string[];
  warnings?: string[];
}

export interface LeaveBalanceUploadResult {
  uploadId: string;
  /** Data rows in the file. */
  total: number;
  /** Rows with no errors. */
  successCount: number;
  /** Rows with at least one error (other cells in the row may still be applied). */
  invalidCount: number;
  updatedCells: number;
  unchangedCells: number;
  failedCells: number;
  errors: LeaveBalanceUploadRowIssue[];
  warnings: LeaveBalanceUploadRowIssue[];
  auditId?: string;
  hasErrorLog?: boolean;
}

export const leaveBalanceUploadService = {
  /** Download the Leave Balance upload template for the project's configured leave types. */
  async downloadTemplate(projectId: string): Promise<Blob> {
    return apiClient.getBlob(
      `${LEAVE_BALANCE_BASE}/template?projectId=${encodeURIComponent(projectId)}`,
    );
  },

  /** Upload balances; each filled cell replaces that leave balance, blank cells are unchanged. */
  async bulkUpload(projectId: string, file: File): Promise<LeaveBalanceUploadResult> {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.postFormData<LeaveBalanceUploadResult>(
      `${LEAVE_BALANCE_BASE}/excel?projectId=${encodeURIComponent(projectId)}`,
      formData,
    );
  },
};
