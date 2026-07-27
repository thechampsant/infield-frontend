import { apiClient } from "./api-client";

const BASE = "/api/v1/target-vs-achievement";

export const TARGET_VS_ACHIEVEMENT_MODULE_KEY = "target_vs_achievement";

export function targetVsAchievementConfigModuleKey(configId: string): string {
  return `target_vs_achievement_config_${configId}`;
}

export type TargetBasis = "value" | "volume";
export type TargetAssignmentScope = "store" | "user";
export type TargetPeriodType = "monthly" | "quarterly" | "custom";

export interface TargetFieldReference {
  fieldKey: string;
  label: string;
  groupFieldKey?: string;
  type?: string;
}

export interface TargetProductSplit {
  enabled: boolean;
  productFieldKey?: string;
  productFieldLabel?: string;
  productFieldIsUdf?: boolean;
}

export interface TargetFocusConfig {
  enabled: boolean;
  autoDerived?: boolean;
  skuAutoDerived?: boolean;
}

export interface TargetPeriodConfig {
  type: TargetPeriodType;
  fiscalYearStartMonth?: number;
}

export interface TargetVsAchievementConfiguration {
  id: string;
  projectId: string;
  name: string;
  salesConfigId: string;
  salesConfigName?: string;
  applicableDesignations: string[];
  targetBasis: TargetBasis;
  assignmentScope: TargetAssignmentScope;
  productSplit: TargetProductSplit;
  focus: TargetFocusConfig;
  period: TargetPeriodConfig;
  achievementField?: TargetFieldReference;
  salesProductField?: TargetFieldReference;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaveTargetVsAchievementInput {
  projectId?: string;
  name: string;
  salesConfigId: string;
  applicableDesignations: string[];
  targetBasis: TargetBasis;
  assignmentScope: TargetAssignmentScope;
  productSplit: TargetProductSplit;
  focus: TargetFocusConfig;
  period: TargetPeriodConfig;
  achievementField: TargetFieldReference;
  salesProductField?: TargetFieldReference;
}

export interface TargetFieldOption extends TargetFieldReference {
  value: string;
  isUdf?: boolean;
}

export interface TargetSalesFieldOptions {
  achievementFields: TargetFieldOption[];
  productFields: TargetFieldOption[];
}

export interface TargetUploadError {
  row: number;
  data?: Record<string, unknown>;
  errors: string[];
}

export interface TargetUploadSummary {
  total: number;
  inserted: number;
  overwritten: number;
  rejected: number;
  unchanged: number;
  errors: TargetUploadError[];
}

export interface TargetUploadedRow {
  id: string;
  raw: Record<string, unknown>;
}

export interface TargetRowsMeta {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface TargetRowsResponse {
  data: TargetUploadedRow[];
  meta: TargetRowsMeta;
}

export interface ListTargetRowsParams {
  projectId: string;
  page?: number;
  pageSize?: number;
  periodKey?: string;
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

function normalizeTargetBasis(value: unknown): TargetBasis {
  return value === "volume" ? "volume" : "value";
}

function normalizeAssignmentScope(value: unknown): TargetAssignmentScope {
  return value === "user" ? "user" : "store";
}

function normalizePeriodType(value: unknown): TargetPeriodType {
  return value === "quarterly" || value === "custom" ? value : "monthly";
}

function normalizeFieldReference(value: unknown): TargetFieldReference | undefined {
  const directText = text(value);
  if (directText) {
    return { fieldKey: directText, label: directText };
  }
  const raw = record(value);
  const nestedMapping = record(raw.mapping);
  const nestedField = record(raw.field);
  const nestedUdf = record(raw.udf);
  const nestedSource = record(raw.sourceField);
  const fieldKey =
    text(nestedMapping.fieldKey) ||
    text(nestedMapping.key) ||
    text(nestedMapping.value) ||
    text(nestedMapping.name) ||
    text(raw.fieldKey) ||
    text(raw.key) ||
    text(raw.value) ||
    text(raw.id) ||
    text(raw._id) ||
    text(raw.name) ||
    text(raw.fieldName) ||
    text(raw.columnName) ||
    text(raw.udfKey) ||
    text(nestedField.fieldKey) ||
    text(nestedField.key) ||
    text(nestedField.value) ||
    text(nestedField.name) ||
    text(nestedUdf.fieldKey) ||
    text(nestedUdf.key) ||
    text(nestedUdf.name) ||
    text(nestedSource.fieldKey) ||
    text(nestedSource.key) ||
    text(nestedSource.name);
  if (!fieldKey) return undefined;
  const label =
    text(nestedMapping.label) ||
    text(nestedMapping.displayName) ||
    text(nestedMapping.fieldLabel) ||
    text(nestedMapping.name) ||
    text(raw.label) ||
    text(raw.displayName) ||
    text(raw.fieldLabel) ||
    text(raw.title) ||
    text(raw.name) ||
    text(raw.fieldName) ||
    text(raw.columnName) ||
    text(nestedField.label) ||
    text(nestedField.displayName) ||
    text(nestedField.fieldLabel) ||
    text(nestedField.title) ||
    text(nestedField.name) ||
    text(nestedUdf.label) ||
    text(nestedUdf.displayName) ||
    text(nestedUdf.name) ||
    text(nestedSource.label) ||
    text(nestedSource.displayName) ||
    text(nestedSource.name) ||
    fieldKey;
  const groupFieldKey =
    text(nestedMapping.groupFieldKey) ||
    text(nestedMapping.groupKey) ||
    text(nestedMapping.repeatableGroupKey) ||
    text(nestedMapping.repeatableGroupId) ||
    text(raw.groupFieldKey) ||
    text(raw.groupKey) ||
    text(raw.repeatableGroupKey) ||
    text(raw.repeatableGroupId) ||
    text(nestedField.groupFieldKey) ||
    text(nestedField.groupKey) ||
    text(nestedField.repeatableGroupKey) ||
    text(nestedSource.groupFieldKey);
  return {
    fieldKey,
    label,
    ...(groupFieldKey ? { groupFieldKey } : {}),
    ...(text(raw.type) || text(raw.fieldType) || text(raw.dataType) || text(nestedField.type) || text(nestedField.fieldType)
      ? { type: text(raw.type) || text(raw.fieldType) || text(raw.dataType) || text(nestedField.type) || text(nestedField.fieldType) }
      : {}),
  };
}

function normalizeFieldOption(value: unknown): TargetFieldOption {
  const raw = record(value);
  const field = normalizeFieldReference(raw) ?? { fieldKey: "", label: "" };
  const valueKey = field.groupFieldKey
    ? `${field.groupFieldKey}::${field.fieldKey}`
    : field.fieldKey;
  return {
    ...field,
    value: text(raw.value) || valueKey,
    isUdf: bool(raw.isUdf) || bool(raw.productFieldIsUdf) || bool(raw.isUDF) || bool(raw.udf),
  };
}

function normalizeProductSplit(value: unknown): TargetProductSplit {
  const raw = record(value);
  return {
    enabled: bool(raw.enabled),
    productFieldKey: text(raw.productFieldKey) || undefined,
    productFieldLabel: text(raw.productFieldLabel) || undefined,
    productFieldIsUdf: bool(raw.productFieldIsUdf),
  };
}

function normalizeFocus(value: unknown): TargetFocusConfig {
  const raw = record(value);
  const autoDerived = bool(raw.autoDerived) || bool(raw.skuAutoDerived);
  return {
    enabled: bool(raw.enabled),
    autoDerived,
    skuAutoDerived: autoDerived,
  };
}

function normalizePeriod(value: unknown): TargetPeriodConfig {
  const raw = record(value);
  return {
    type: normalizePeriodType(raw.type),
    fiscalYearStartMonth: Math.min(12, Math.max(1, num(raw.fiscalYearStartMonth, 4))),
  };
}

export function normalizeTargetVsAchievementConfiguration(
  value: unknown,
): TargetVsAchievementConfiguration {
  const raw = record(value);
  const salesConfig = record(raw.salesConfig);
  const salesConfiguration = record(raw.salesConfiguration);
  const salesConfigId = record(raw.salesConfigId);
  return {
    id: text(raw._id) || text(raw.id),
    projectId: text(raw.projectId),
    name: text(raw.name),
    salesConfigId:
      text(raw.salesConfigId) ||
      text(salesConfigId._id) ||
      text(salesConfigId.id) ||
      text(salesConfig._id) ||
      text(salesConfig.id) ||
      text(salesConfiguration._id) ||
      text(salesConfiguration.id),
    salesConfigName:
      text(raw.salesConfigName) ||
      text(salesConfig.name) ||
      text(salesConfiguration.name) ||
      text(salesConfigId.name) ||
      undefined,
    applicableDesignations: Array.isArray(raw.applicableDesignations)
      ? raw.applicableDesignations.filter((item): item is string => typeof item === "string")
      : [],
    targetBasis: normalizeTargetBasis(raw.targetBasis),
    assignmentScope: normalizeAssignmentScope(raw.assignmentScope),
    productSplit: normalizeProductSplit(raw.productSplit),
    focus: normalizeFocus(raw.focus),
    period: normalizePeriod(raw.period),
    achievementField: normalizeFieldReference(raw.achievementField),
    salesProductField: normalizeFieldReference(raw.salesProductField),
    isActive: bool(raw.isActive),
    createdAt: text(raw.createdAt) || undefined,
    updatedAt: text(raw.updatedAt) || undefined,
  };
}

function payload(input: SaveTargetVsAchievementInput): Record<string, unknown> {
  return {
    ...(input.projectId ? { projectId: input.projectId } : {}),
    name: input.name,
    salesConfigId: input.salesConfigId,
    applicableDesignations: input.applicableDesignations,
    targetBasis: input.targetBasis,
    assignmentScope: input.assignmentScope,
    productSplit: input.productSplit,
    focus: input.focus,
    period: input.period,
    achievementField: input.achievementField,
    ...(input.salesProductField ? { salesProductField: input.salesProductField } : {}),
  };
}

function normalizeUploadSummary(value: unknown): TargetUploadSummary {
  const raw = record(value);
  const errors = Array.isArray(raw.errors) ? raw.errors : [];
  return {
    total: num(raw.total, 0),
    inserted: num(raw.inserted, 0),
    overwritten: num(raw.overwritten, 0),
    rejected: num(raw.rejected, 0),
    unchanged: num(raw.unchanged, 0),
    errors: errors.map((item) => {
      const error = record(item);
      return {
        row: num(error.row, 0),
        data: record(error.data),
        errors: Array.isArray(error.errors)
          ? error.errors.map((entry) => String(entry))
          : [text(error.message) || "Invalid row"],
      };
    }),
  };
}

function normalizeUploadedRow(value: unknown): TargetUploadedRow {
  const raw = record(value);
  const id = text(raw._id) || text(raw.id);
  return {
    id: id || JSON.stringify(raw),
    raw,
  };
}

function normalizeRowsMeta(value: unknown): TargetRowsMeta {
  const raw = record(value);
  return {
    page: num(raw.page, 1),
    pageSize: num(raw.pageSize, 50),
    totalCount: num(raw.totalCount, 0),
    totalPages: num(raw.totalPages, 0),
  };
}

function normalizeRowsResponse(value: unknown): TargetRowsResponse {
  if (Array.isArray(value)) {
    return {
      data: value.map(normalizeUploadedRow),
      meta: {
        page: 1,
        pageSize: 50,
        totalCount: value.length,
        totalPages: value.length > 0 ? 1 : 0,
      },
    };
  }
  const raw = record(value);
  const data = Array.isArray(raw.data) ? raw.data : [];
  return {
    data: data.map(normalizeUploadedRow),
    meta: normalizeRowsMeta(raw.meta),
  };
}

function rowsQuery(params: ListTargetRowsParams): string {
  const query = new URLSearchParams({
    projectId: params.projectId,
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 50),
  });
  if (params.periodKey?.trim()) query.set("periodKey", params.periodKey.trim());
  return query.toString();
}

export const targetVsAchievementService = {
  async list(projectId: string): Promise<TargetVsAchievementConfiguration[]> {
    const result = await apiClient.get<unknown[]>(
      `${BASE}/configurations?projectId=${encodeURIComponent(projectId)}`,
    );
    return Array.isArray(result)
      ? result.map(normalizeTargetVsAchievementConfiguration)
      : [];
  },

  async get(id: string, projectId: string): Promise<TargetVsAchievementConfiguration> {
    const result = await apiClient.get<unknown>(
      `${BASE}/configurations/${encodeURIComponent(id)}?projectId=${encodeURIComponent(projectId)}`,
    );
    return normalizeTargetVsAchievementConfiguration(result);
  },

  async create(
    input: SaveTargetVsAchievementInput & { projectId: string },
  ): Promise<TargetVsAchievementConfiguration> {
    const result = await apiClient.post<unknown>(`${BASE}/configurations`, payload(input));
    return normalizeTargetVsAchievementConfiguration(result);
  },

  async update(
    id: string,
    projectId: string,
    input: SaveTargetVsAchievementInput,
  ): Promise<TargetVsAchievementConfiguration> {
    const result = await apiClient.patch<unknown>(
      `${BASE}/configurations/${encodeURIComponent(id)}?projectId=${encodeURIComponent(projectId)}`,
      payload(input),
    );
    return normalizeTargetVsAchievementConfiguration(result);
  },

  async clone(id: string, projectId: string): Promise<TargetVsAchievementConfiguration> {
    const result = await apiClient.post<unknown>(
      `${BASE}/configurations/${encodeURIComponent(id)}/clone?projectId=${encodeURIComponent(projectId)}`,
    );
    return normalizeTargetVsAchievementConfiguration(result);
  },

  async remove(id: string, projectId: string): Promise<void> {
    await apiClient.delete(
      `${BASE}/configurations/${encodeURIComponent(id)}?projectId=${encodeURIComponent(projectId)}`,
    );
  },

  async setActive(id: string, projectId: string, isActive: boolean): Promise<void> {
    await apiClient.put(
      `/api/v1/feature-config/${encodeURIComponent(projectId)}/module/${encodeURIComponent(targetVsAchievementConfigModuleKey(id))}`,
      { isActive },
    );
  },

  async getSalesFieldOptions(
    projectId: string,
    salesConfigId: string,
  ): Promise<TargetSalesFieldOptions> {
    const result = await apiClient.get<unknown>(
      `${BASE}/configurations/sales-field-options?projectId=${encodeURIComponent(projectId)}&salesConfigId=${encodeURIComponent(salesConfigId)}`,
    );
    const raw = record(result);
    const achievementFields = Array.isArray(raw.achievementFields)
      ? raw.achievementFields
      : Array.isArray(raw.allowedAchievementFields)
        ? raw.allowedAchievementFields
        : Array.isArray(raw.fields)
          ? raw.fields
          : [];
    const productFields = Array.isArray(raw.productFields)
      ? raw.productFields
      : Array.isArray(raw.salesProductFields)
        ? raw.salesProductFields
        : [];
    return {
      achievementFields: achievementFields.map(normalizeFieldOption),
      productFields: productFields.map(normalizeFieldOption),
    };
  },

  async getProductFieldOptions(projectId: string): Promise<TargetFieldOption[]> {
    const result = await apiClient.get<unknown>(
      `${BASE}/configurations/product-field-options?projectId=${encodeURIComponent(projectId)}`,
    );
    const raw = Array.isArray(result) ? result : record(result).fields;
    return Array.isArray(raw) ? raw.map(normalizeFieldOption) : [];
  },

  downloadTargetTemplate(id: string, projectId: string): Promise<Blob> {
    return apiClient.getBlob(
      `${BASE}/configurations/${encodeURIComponent(id)}/target-template?projectId=${encodeURIComponent(projectId)}`,
    );
  },

  downloadFocusTemplate(id: string, projectId: string): Promise<Blob> {
    return apiClient.getBlob(
      `${BASE}/configurations/${encodeURIComponent(id)}/focus-template?projectId=${encodeURIComponent(projectId)}`,
    );
  },

  async uploadTarget(id: string, projectId: string, file: File): Promise<TargetUploadSummary> {
    const formData = new FormData();
    formData.append("file", file);
    const result = await apiClient.postFormData<unknown>(
      `${BASE}/configurations/${encodeURIComponent(id)}/target-upload?projectId=${encodeURIComponent(projectId)}`,
      formData,
    );
    return normalizeUploadSummary(result);
  },

  async uploadFocus(id: string, projectId: string, file: File): Promise<TargetUploadSummary> {
    const formData = new FormData();
    formData.append("file", file);
    const result = await apiClient.postFormData<unknown>(
      `${BASE}/configurations/${encodeURIComponent(id)}/focus-upload?projectId=${encodeURIComponent(projectId)}`,
      formData,
    );
    return normalizeUploadSummary(result);
  },

  async listTargetRows(id: string, params: ListTargetRowsParams): Promise<TargetRowsResponse> {
    const result = await apiClient.getRaw<unknown>(
      `${BASE}/configurations/${encodeURIComponent(id)}/targets?${rowsQuery(params)}`,
    );
    return normalizeRowsResponse(result);
  },

  async listFocusTargetRows(id: string, params: ListTargetRowsParams): Promise<TargetRowsResponse> {
    const result = await apiClient.getRaw<unknown>(
      `${BASE}/configurations/${encodeURIComponent(id)}/focus-targets?${rowsQuery(params)}`,
    );
    return normalizeRowsResponse(result);
  },
};
