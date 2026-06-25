import { apiClient } from "./api-client";

const BASE = "/api/v1/reports";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ReportDataSource {
  sourceKey: string;
  displayName: string;
  collectionName: string;
  featureKey: string | null;
  entityType: string;
}

export interface ReportFieldMetadata {
  fieldKey: string;
  displayName: string;
  fieldType: string; // 'TXT' | 'NUM' | 'DATE' | 'BOOL' | 'IMAGE' | 'LOCATION'
  source: "schema" | "udf";
}

export interface ReportSelectedColumn {
  fieldKey: string;
  sourceKey: string;
  headerName: string;
  order: number;
  fieldType: string;
}

export interface ReportCalculatedField {
  fieldName: string;
  formula: string;
  dataType: "number" | "text" | "date" | "boolean";
  order: number;
}

export interface ReportFilter {
  fieldKey: string;
  sourceKey: string;
  fieldType: string;
  controlType: "dropdown" | "date-range" | "numeric-range" | "toggle" | "text-search";
  order: number;
}

export interface ReportOutputSettings {
  fileFormat: "xls" | "csv";
  exportBehaviour: "direct" | "load-then-export";
}

export interface ReportJoinConfig {
  joinType: "left" | "right" | "inner";
  primaryKeyField: string;
  secondaryKeyField: string;
}

export interface ReportDataScope {
  activeUsers?: string[];
  inactiveUsers?: string[];
  activeStores?: string[];
  inactiveStores?: string[];
}

export interface ReportConfigDocument {
  _id?: string;
  id?: string;
  projectId: string;
  reportName: string;
  description?: string;
  accessRoles: string[];
  primarySource: { sourceKey: string; collectionName: string };
  secondarySource?: { sourceKey: string; collectionName: string } | null;
  joinConfig?: ReportJoinConfig | null;
  dataScope: ReportDataScope;
  selectedColumns: ReportSelectedColumn[];
  calculatedFields: ReportCalculatedField[];
  filters: ReportFilter[];
  outputSettings: ReportOutputSettings;
  status: "draft" | "published" | "inactive";
  createdBy?: string;
  favorites?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateReportConfigInput {
  projectId: string;
  reportName: string;
  description?: string;
  accessRoles: string[];
  primarySource: { sourceKey: string; collectionName: string };
  secondarySource?: { sourceKey: string; collectionName: string } | null;
  joinConfig?: ReportJoinConfig | null;
  dataScope: ReportDataScope;
  selectedColumns: ReportSelectedColumn[];
  calculatedFields: ReportCalculatedField[];
  filters: ReportFilter[];
  outputSettings: ReportOutputSettings;
  status: "draft" | "published";
}

export interface UpdateReportConfigInput extends Partial<CreateReportConfigInput> {}

export interface ExecuteReportParams {
  reportId: string;
  filters?: Record<string, unknown>;
  page?: number;
  pageSize?: number;
  fromDate?: string;
  toDate?: string;
}

export interface ExecuteReportResponse {
  data: Record<string, unknown>[];
  columns: { key: string; type: string }[];
  meta: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
  // Legacy flat fields (backwards compat)
  totalCount?: number;
  page?: number;
  pageSize?: number;
}

export interface ExportReportParams {
  reportId: string;
  filters?: Record<string, unknown>;
  format?: "xls" | "csv";
  fromDate?: string;
  toDate?: string;
}

export interface PreviewReportParams {
  reportId: string;
  filters?: Record<string, unknown>;
}

// ─── Service ────────────────────────────────────────────────────────────────

export const reportConfigService = {
  /** Get all data sources available for the current project */
  async getDataSources(projectId: string): Promise<ReportDataSource[]> {
    return apiClient.get<ReportDataSource[]>(
      `${BASE}/data-sources?projectId=${encodeURIComponent(projectId)}`,
    );
  },

  /** Get fields for a specific data source */
  async getSourceFields(sourceKey: string, projectId: string): Promise<ReportFieldMetadata[]> {
    return apiClient.get<ReportFieldMetadata[]>(
      `${BASE}/data-sources/${encodeURIComponent(sourceKey)}/fields?projectId=${encodeURIComponent(projectId)}`,
    );
  },

  /** Create a new report configuration */
  async createConfig(data: CreateReportConfigInput): Promise<ReportConfigDocument> {
    return apiClient.post<ReportConfigDocument>(`${BASE}/config`, data);
  },

  /** Update an existing report configuration */
  async updateConfig(reportId: string, data: UpdateReportConfigInput): Promise<ReportConfigDocument> {
    return apiClient.patch<ReportConfigDocument>(
      `${BASE}/config/${encodeURIComponent(reportId)}`,
      data,
    );
  },

  /** Get a single report configuration by ID */
  async getConfig(reportId: string): Promise<ReportConfigDocument> {
    return apiClient.get<ReportConfigDocument>(
      `${BASE}/config/${encodeURIComponent(reportId)}`,
    );
  },

  /** List all report configurations accessible to the current user */
  async listConfigs(projectId: string): Promise<ReportConfigDocument[]> {
    return apiClient.get<ReportConfigDocument[]>(
      `${BASE}/config?projectId=${encodeURIComponent(projectId)}`,
    );
  },

  /** Soft-delete a report configuration */
  async deleteConfig(reportId: string): Promise<void> {
    return apiClient.delete<void>(
      `${BASE}/config/${encodeURIComponent(reportId)}`,
    );
  },

  /** Toggle favorite status for a report */
  async toggleFavorite(reportId: string): Promise<{ isFavorite: boolean }> {
    return apiClient.post<{ isFavorite: boolean }>(
      `${BASE}/config/${encodeURIComponent(reportId)}/favorite`,
    );
  },

  /** Execute a report and get paginated results */
  async executeReport(params: ExecuteReportParams): Promise<ExecuteReportResponse> {
    return apiClient.post<ExecuteReportResponse>(`${BASE}/engine/execute`, params);
  },

  /** Export a report as a file download (returns a Blob) */
  async exportReport(params: ExportReportParams): Promise<Blob> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    const token = apiClient.getAccessToken();
    if (token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE}/engine/export`, {
      method: "POST",
      headers,
      body: JSON.stringify(params),
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    return response.blob();
  },

  /** Preview a report (max 20 rows) */
  async previewReport(params: PreviewReportParams): Promise<ExecuteReportResponse> {
    return apiClient.post<ExecuteReportResponse>(`${BASE}/engine/preview`, params);
  },
};
