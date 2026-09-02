import { apiClient } from "./api-client";
import type { ExecuteReportResponse } from "./report-config-service";
import type { OrientExportType } from "../orient/orient-report.constants";

const BASE = "/api/v1/reports/orient";

export interface OrientReportParams {
  projectId: string;
  fromDate?: string;
  toDate?: string;
}

export interface OrientExecuteParams extends OrientReportParams {
  exportType: OrientExportType;
  page?: number;
  pageSize?: number;
}

export const orientReportService = {
  /** Load / preview — POST /reports/orient/execute */
  async executeReport(params: OrientExecuteParams): Promise<ExecuteReportResponse> {
    return apiClient.post<ExecuteReportResponse>(`${BASE}/execute`, {
      projectId: params.projectId,
      exportType: params.exportType,
      fromDate: params.fromDate,
      toDate: params.toDate,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 50,
    });
  },

  /** Export Excel — POST /reports/orient/{type} */
  async exportReport(params: OrientExecuteParams): Promise<Blob> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    const token = apiClient.getAccessToken();
    if (token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE}/${params.exportType}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        projectId: params.projectId,
        fromDate: params.fromDate,
        toDate: params.toDate,
      }),
      credentials: "include",
    });

    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText);
      throw new Error(`Orient export failed: ${text || response.statusText}`);
    }

    return response.blob();
  },
};
