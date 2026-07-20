import { apiClient } from "./api-client";
import type { UdfSchemaField } from "./udf-config-service";

const BASE = "/api/v1/sales";

export const SALES_MODULE_KEY = "sales";
export const SALES_INBOX_MODULE_ID = "sales";
export const SALES_REQUEST_TYPE = "sales-entry";

export function salesConfigModuleKey(salesConfigId: string): string {
  return `sales_config_${salesConfigId}`;
}

export type SalesSubmissionStatus =
  | "Pending_Approval"
  | "Finalized"
  | "Rejected"
  | "Auto_Rejected";

export type SalesApprovalLevelRole = "direct_manager" | "designation";

export interface SalesApprovalLevel {
  level: number;
  label: string;
  approverType: SalesApprovalLevelRole;
  approverDesignationId?: string;
  autoRejectDays: number;
}

export interface SalesApprovalWorkflow {
  isEnabled: boolean;
  levels: SalesApprovalLevel[];
}

export interface SalesConfiguration {
  id: string;
  projectId: string;
  name: string;
  applicableDesignations: string[];
  udfSchemaKey?: string;
  productStoreMappingEnabled: boolean;
  zeroSalesEnabled: boolean;
  targetVsAchievementLinked: boolean;
  approvalWorkflow: SalesApprovalWorkflow;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaveSalesConfigurationInput {
  projectId?: string;
  name: string;
  applicableDesignations: string[];
  productStoreMappingEnabled: boolean;
  zeroSalesEnabled: boolean;
  targetVsAchievementLinked: boolean;
  approvalWorkflow: SalesApprovalWorkflow;
}

export interface SalesRuntimeEntry {
  configId: string;
  salesConfigId?: string;
  label: string;
  screen?: string;
  icon?: string;
  meta?: {
    isSales?: boolean;
    salesConfigId?: string;
    projectId?: string;
  };
  settings: {
    productStoreMappingEnabled: boolean;
    zeroSalesEnabled: boolean;
    targetVsAchievementLinked: boolean;
    approvalEnabled: boolean;
    approvalLevels: number;
  };
  form: {
    formName: string;
    udfSchemaKey: string;
    status: "published" | "draft" | string;
  } | null;
}

export type SalesTypeEntry = SalesRuntimeEntry;

export interface SalesFormField {
  fieldKey: string;
  label: string;
  type: string;
  required?: boolean;
  order?: number;
  status?: boolean;
  config?: Record<string, unknown>;
  options?: unknown[];
}

export interface SalesRuntimeForm {
  salesConfigId: string;
  configName: string;
  settings: SalesRuntimeEntry["settings"];
  udfSchemaKey: string;
  staticFields: SalesFormField[];
  udfFields: SalesFormField[];
}

export interface SubmitSalesInput {
  projectId: string;
  salesConfigId: string;
  storeId?: string;
  storeCode?: string;
  salesDate?: string;
  udfFields: Record<string, unknown>;
  location?: {
    lat?: number;
    lng?: number;
    accuracy?: number;
  };
}

export interface SalesSubmission {
  id: string;
  projectId?: string;
  salesConfigId?: string;
  status?: SalesSubmissionStatus | string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface SalesReportParams {
  projectId?: string;
  salesConfigId?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface SalesProductOption {
  _id: string;
  name: string;
  sku: string;
}

export interface SalesUdfSchemaDocument {
  projectId: string;
  schemaKey: string;
  fields: UdfSchemaField[];
}

type RawRecord = Record<string, unknown>;

function record(value: unknown): RawRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as RawRecord)
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function bool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function queryString(params: object): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
    ) {
      query.set(key, String(value));
    }
  });
  return query.toString();
}

function normalizeApprovalLevel(value: unknown, index: number): SalesApprovalLevel {
  const raw = record(value);
  const approverType =
    text(raw.approverType) === "designation" ? "designation" : "direct_manager";
  return {
    level: num(raw.level, index + 1),
    label: text(raw.label) || `Level ${index + 1}`,
    approverType,
    approverDesignationId: text(raw.approverDesignationId) || undefined,
    autoRejectDays: Math.min(30, Math.max(1, num(raw.autoRejectDays, 3))),
  };
}

export function normalizeSalesConfiguration(value: unknown): SalesConfiguration {
  const raw = record(value);
  const workflow = record(raw.approvalWorkflow);
  const levels = Array.isArray(workflow.levels) ? workflow.levels : [];
  return {
    id: text(raw._id) || text(raw.id),
    projectId: text(raw.projectId),
    name: text(raw.name),
    applicableDesignations: Array.isArray(raw.applicableDesignations)
      ? raw.applicableDesignations.filter((item): item is string => typeof item === "string")
      : [],
    udfSchemaKey: text(raw.udfSchemaKey) || undefined,
    productStoreMappingEnabled: bool(raw.productStoreMappingEnabled),
    zeroSalesEnabled: bool(raw.zeroSalesEnabled),
    targetVsAchievementLinked: bool(raw.targetVsAchievementLinked),
    approvalWorkflow: {
      isEnabled: bool(workflow.isEnabled),
      levels: levels.map(normalizeApprovalLevel),
    },
    isActive: bool(raw.isActive, true),
    createdAt: text(raw.createdAt) || undefined,
    updatedAt: text(raw.updatedAt) || undefined,
  };
}

function payload(input: SaveSalesConfigurationInput): Record<string, unknown> {
  return {
    ...(input.projectId ? { projectId: input.projectId } : {}),
    name: input.name,
    applicableDesignations: input.applicableDesignations,
    productStoreMappingEnabled: input.productStoreMappingEnabled,
    zeroSalesEnabled: input.zeroSalesEnabled,
    targetVsAchievementLinked: input.targetVsAchievementLinked,
    approvalWorkflow: {
      isEnabled: input.approvalWorkflow.isEnabled,
      levels: input.approvalWorkflow.isEnabled
        ? input.approvalWorkflow.levels.map((level, index) => ({
            level: index + 1,
            label: level.label,
            approverType: level.approverType,
            ...(level.approverType === "designation"
              ? { approverDesignationId: level.approverDesignationId }
              : {}),
            autoRejectDays: level.autoRejectDays,
          }))
        : [],
    },
  };
}

export const salesConfigService = {
  async activateConfiguration(id: string, projectId: string): Promise<void> {
    await apiClient.put(
      `${BASE}/configurations/${encodeURIComponent(id)}/activate?projectId=${encodeURIComponent(projectId)}`,
      {},
    );
  },

  async deactivateConfiguration(id: string, projectId: string): Promise<void> {
    await apiClient.put(
      `/api/v1/feature-config/${encodeURIComponent(projectId)}/module/${encodeURIComponent(salesConfigModuleKey(id))}`,
      { isActive: false },
    );
  },

  async list(projectId: string): Promise<SalesConfiguration[]> {
    const result = await apiClient.get<unknown[]>(
      `${BASE}/configurations?projectId=${encodeURIComponent(projectId)}`,
    );
    return Array.isArray(result) ? result.map(normalizeSalesConfiguration) : [];
  },

  async get(id: string, projectId: string): Promise<SalesConfiguration> {
    const result = await apiClient.get<unknown>(
      `${BASE}/configurations/${encodeURIComponent(id)}?projectId=${encodeURIComponent(projectId)}`,
    );
    return normalizeSalesConfiguration(result);
  },

  async create(input: SaveSalesConfigurationInput & { projectId: string }): Promise<SalesConfiguration> {
    const result = await apiClient.post<unknown>(`${BASE}/configurations`, payload(input));
    return normalizeSalesConfiguration(result);
  },

  async update(
    id: string,
    projectId: string,
    input: SaveSalesConfigurationInput,
  ): Promise<SalesConfiguration> {
    const result = await apiClient.patch<unknown>(
      `${BASE}/configurations/${encodeURIComponent(id)}?projectId=${encodeURIComponent(projectId)}`,
      payload(input),
    );
    return normalizeSalesConfiguration(result);
  },

  async clone(id: string, projectId: string): Promise<SalesConfiguration> {
    const result = await apiClient.post<unknown>(
      `${BASE}/configurations/${encodeURIComponent(id)}/clone?projectId=${encodeURIComponent(projectId)}`,
    );
    return normalizeSalesConfiguration(result);
  },

  async remove(id: string, projectId: string): Promise<void> {
    await apiClient.delete(
      `${BASE}/configurations/${encodeURIComponent(id)}?projectId=${encodeURIComponent(projectId)}`,
    );
  },

  async getUdfSchema(id: string, projectId: string): Promise<SalesUdfSchemaDocument> {
    const result = await apiClient.get<SalesUdfSchemaDocument>(
      `${BASE}/configurations/${encodeURIComponent(id)}/udf-schema?projectId=${encodeURIComponent(projectId)}`,
    );
    return {
      projectId: result.projectId || projectId,
      schemaKey: result.schemaKey || "",
      fields: Array.isArray(result.fields) ? result.fields : [],
    };
  },

  async saveUdfSchema(
    id: string,
    projectId: string,
    fields: UdfSchemaField[],
  ): Promise<SalesUdfSchemaDocument> {
    const result = await apiClient.post<SalesUdfSchemaDocument>(
      `${BASE}/configurations/${encodeURIComponent(id)}/udf-schema?projectId=${encodeURIComponent(projectId)}`,
      { fields },
    );
    return {
      projectId: result.projectId || projectId,
      schemaKey: result.schemaKey || "",
      fields: Array.isArray(result.fields) ? result.fields : [],
    };
  },

  async listRuntimeEntries(projectId: string): Promise<SalesRuntimeEntry[]> {
    const result = await apiClient.get<SalesRuntimeEntry[]>(
      `${BASE}/runtime/entries?projectId=${encodeURIComponent(projectId)}`,
    );
    return Array.isArray(result) ? result : [];
  },

  async listTypes(): Promise<SalesTypeEntry[]> {
    const result = await apiClient.get<SalesTypeEntry[]>(`${BASE}/types`);
    return Array.isArray(result) ? result : [];
  },

  async getSalesForm(salesConfigId: string, projectId?: string): Promise<SalesRuntimeForm> {
    const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
    const result = await apiClient.get<SalesRuntimeForm>(
      `${BASE}/form/${encodeURIComponent(salesConfigId)}${query}`,
    );
    return {
      ...result,
      staticFields: Array.isArray(result.staticFields) ? result.staticFields : [],
      udfFields: Array.isArray(result.udfFields) ? result.udfFields : [],
    };
  },

  async submitSales(input: SubmitSalesInput): Promise<SalesSubmission> {
    return apiClient.post<SalesSubmission>(`${BASE}/submissions`, input);
  },

  async listMyReports(params: SalesReportParams = {}): Promise<SalesSubmission[]> {
    const query = queryString(params);
    const result = await apiClient.get<SalesSubmission[]>(
      `${BASE}/my-report${query ? `?${query}` : ""}`,
    );
    return Array.isArray(result) ? result : [];
  },

  async getMyReport(salesSubmissionId: string): Promise<SalesSubmission> {
    return apiClient.get<SalesSubmission>(
      `${BASE}/my-report/${encodeURIComponent(salesSubmissionId)}`,
    );
  },

  async listManagerReports(params: SalesReportParams = {}): Promise<SalesSubmission[]> {
    const query = queryString(params);
    const result = await apiClient.get<SalesSubmission[]>(
      `${BASE}/manager-report${query ? `?${query}` : ""}`,
    );
    return Array.isArray(result) ? result : [];
  },

  async getManagerReport(salesSubmissionId: string): Promise<SalesSubmission> {
    return apiClient.get<SalesSubmission>(
      `${BASE}/manager-report/${encodeURIComponent(salesSubmissionId)}`,
    );
  },

  async listProductOptions(params: {
    projectId: string;
    configId: string;
    storeId?: string;
    storeCode?: string;
    search?: string;
  }): Promise<SalesProductOption[]> {
    const query = new URLSearchParams({
      projectId: params.projectId,
      configId: params.configId,
    });
    if (params.storeId) query.set("storeId", params.storeId);
    if (params.storeCode) query.set("storeCode", params.storeCode);
    if (params.search) query.set("search", params.search);
    const result = await apiClient.get<{ products?: SalesProductOption[] }>(
      `${BASE}/runtime/product-options?${query.toString()}`,
    );
    return Array.isArray(result.products) ? result.products : [];
  },
};
