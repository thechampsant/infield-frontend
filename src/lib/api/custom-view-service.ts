import { apiClient } from "./api-client";

const BASE = "/api/v1/custom-view/configurations";

export type CustomViewTaggingLogic = "loginid" | "storecode";
export type CustomViewStatus = "draft" | "active" | "paused";
export type CustomViewColumnNodeType = "column" | "group";
export type CustomViewColumnValueType = "string" | "number" | "date";

export interface CustomViewColumnNode {
  type: CustomViewColumnNodeType;
  key: string;
  label: string;
  locked?: boolean;
  valueType?: CustomViewColumnValueType;
  children?: CustomViewColumnNode[];
}

export interface CustomViewConfiguration {
  id: string;
  projectId: string;
  designationId: string;
  designationName: string;
  designationCode: string;
  name: string;
  taggingLogic: CustomViewTaggingLogic;
  columnStructure: CustomViewColumnNode[];
  columnCount: number;
  status: CustomViewStatus;
  latestPeriodMonth: number | null;
  latestPeriodYear: number | null;
  latestFileName: string | null;
  latestFileSize: number | null;
  latestRowCount: number;
  latestUploadedAt: string | null;
  updatedAt: string | null;
  createdAt: string | null;
}

export interface CustomViewUploadResult {
  fileName: string;
  fileSize: number;
  rowCount: number;
}

export interface CustomViewListPage {
  items: CustomViewConfiguration[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateCustomViewInput {
  projectId: string;
  designationId: string;
  name: string;
  taggingLogic: CustomViewTaggingLogic;
  columnStructure?: CustomViewColumnNode[];
}

export interface UpdateCustomViewInput {
  name?: string;
  taggingLogic?: CustomViewTaggingLogic;
  columnStructure?: CustomViewColumnNode[];
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeColumn(raw: unknown): CustomViewColumnNode {
  const item = record(raw);
  const children = Array.isArray(item.children) ? item.children.map(normalizeColumn) : undefined;
  return {
    type: item.type === "group" ? "group" : "column",
    key: asString(item.key),
    label: asString(item.label),
    locked: item.locked === true,
    valueType:
      item.valueType === "number" || item.valueType === "date" ? item.valueType : "string",
    children,
  };
}

function normalizeConfig(raw: unknown): CustomViewConfiguration {
  const item = record(raw);
  return {
    id: asString(item.id || item._id),
    projectId: asString(item.projectId),
    designationId: asString(item.designationId),
    designationName: asString(item.designationName),
    designationCode: asString(item.designationCode),
    name: asString(item.name),
    taggingLogic: item.taggingLogic === "storecode" ? "storecode" : "loginid",
    columnStructure: Array.isArray(item.columnStructure)
      ? item.columnStructure.map(normalizeColumn)
      : [],
    columnCount: asNumber(item.columnCount),
    status:
      item.status === "paused" || item.status === "active" || item.status === "draft"
        ? item.status
        : "draft",
    latestPeriodMonth: item.latestPeriodMonth == null ? null : asNumber(item.latestPeriodMonth),
    latestPeriodYear: item.latestPeriodYear == null ? null : asNumber(item.latestPeriodYear),
    latestFileName: item.latestFileName == null ? null : asString(item.latestFileName),
    latestFileSize: item.latestFileSize == null ? null : asNumber(item.latestFileSize),
    latestRowCount: asNumber(item.latestRowCount),
    latestUploadedAt: item.latestUploadedAt ? asString(item.latestUploadedAt) : null,
    updatedAt: item.updatedAt ? asString(item.updatedAt) : null,
    createdAt: item.createdAt ? asString(item.createdAt) : null,
  };
}

function qs(projectId: string, extra?: Record<string, string | number>): string {
  const params = new URLSearchParams({ projectId });
  if (extra) {
    Object.entries(extra).forEach(([key, value]) => params.set(key, String(value)));
  }
  return params.toString();
}

export const customViewService = {
  async list(projectId: string, designationId?: string): Promise<CustomViewConfiguration[]> {
    const query = qs(projectId, designationId ? { designationId } : undefined);
    const result = await apiClient.get<unknown>(`${BASE}?${query}`);
    return Array.isArray(result) ? result.map(normalizeConfig) : [];
  },

  async listPage(
    projectId: string,
    options: {
      page: number;
      limit?: number;
      status?: CustomViewStatus | "all";
      designationId?: string;
    },
  ): Promise<CustomViewListPage> {
    const extra: Record<string, string | number> = {
      page: options.page,
      limit: options.limit ?? 20,
    };
    if (options.designationId) extra.designationId = options.designationId;
    if (options.status && options.status !== "all") extra.status = options.status;
    const result = await apiClient.get<unknown>(`${BASE}?${qs(projectId, extra)}`);
    const payload = record(result);
    const items = Array.isArray(payload.items) ? payload.items.map(normalizeConfig) : [];
    return {
      items,
      total: asNumber(payload.total),
      page: asNumber(payload.page, options.page),
      limit: asNumber(payload.limit, options.limit ?? 20),
    };
  },

  async get(projectId: string, id: string): Promise<CustomViewConfiguration> {
    const result = await apiClient.get<unknown>(`${BASE}/${encodeURIComponent(id)}?${qs(projectId)}`);
    return normalizeConfig(result);
  },

  async create(input: CreateCustomViewInput): Promise<CustomViewConfiguration> {
    const result = await apiClient.post<unknown>(BASE, input);
    return normalizeConfig(result);
  },

  async update(
    projectId: string,
    id: string,
    input: UpdateCustomViewInput,
  ): Promise<CustomViewConfiguration> {
    const result = await apiClient.patch<unknown>(
      `${BASE}/${encodeURIComponent(id)}?${qs(projectId)}`,
      input,
    );
    return normalizeConfig(result);
  },

  async bulkSave(
    projectId: string,
    designationId: string,
    views: Array<{
      id?: string;
      name: string;
      taggingLogic: CustomViewTaggingLogic;
      columnStructure?: CustomViewColumnNode[];
    }>,
  ): Promise<CustomViewConfiguration[]> {
    const result = await apiClient.post<unknown>(`${BASE}/bulk-save`, {
      projectId,
      designationId,
      views,
    });
    return Array.isArray(result) ? result.map(normalizeConfig) : [];
  },

  async pause(projectId: string, id: string): Promise<CustomViewConfiguration> {
    const result = await apiClient.post<unknown>(
      `${BASE}/${encodeURIComponent(id)}/pause?${qs(projectId)}`,
    );
    return normalizeConfig(result);
  },

  async resume(projectId: string, id: string): Promise<CustomViewConfiguration> {
    const result = await apiClient.post<unknown>(
      `${BASE}/${encodeURIComponent(id)}/resume?${qs(projectId)}`,
    );
    return normalizeConfig(result);
  },

  async remove(projectId: string, id: string): Promise<void> {
    await apiClient.delete(`${BASE}/${encodeURIComponent(id)}?${qs(projectId)}`);
  },

  downloadTemplate(projectId: string, id: string, month: number, year: number): Promise<Blob> {
    return apiClient.getBlob(
      `${BASE}/${encodeURIComponent(id)}/template?${qs(projectId, { month, year })}`,
    );
  },

  downloadData(projectId: string, id: string, month: number, year: number): Promise<Blob> {
    return apiClient.getBlob(
      `${BASE}/${encodeURIComponent(id)}/export?${qs(projectId, { month, year })}`,
    );
  },

  async upload(
    projectId: string,
    id: string,
    month: number,
    year: number,
    file: File,
  ): Promise<CustomViewUploadResult> {
    const formData = new FormData();
    formData.append("file", file);
    const result = await apiClient.postFormData<unknown>(
      `${BASE}/${encodeURIComponent(id)}/upload?${qs(projectId, { month, year })}`,
      formData,
    );
    const item = record(result);
    return {
      fileName: asString(item.fileName),
      fileSize: asNumber(item.fileSize),
      rowCount: asNumber(item.rowCount),
    };
  },
};
