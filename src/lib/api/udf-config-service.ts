/**
 * UDF schema configuration service.
 *
 * Backend guide currently documents:
 *   GET    /api/v1/udf/config/field-types
 *   GET    /api/v1/udf/sources
 *   GET    /api/v1/udf/sources/:key?projectId=...
 *   createOrUpdateSchema({ projectId, entityType, schemaKey?, fields })
 *
 * The guide does not specify public read/write schema endpoints, so this
 * service centralizes the frontend contract assumptions in one place:
 *   GET    /api/v1/udf/schema?projectId=...&entityType=...&schemaKey=...
 *   POST   /api/v1/udf/schema
 *
 * If the backend later exposes different route names, we only need to update
 * this file and keep the rest of the frontend intact.
 */

import { ApiError, apiClient } from "./api-client";
import { unwrapApiData } from "./api-response";

const BASE = "/api/v1/udf";
const DEFAULT_SCHEMA_KEY = "default";

export const UDF_ENTITY_TYPES = {
  user: "User",
  store: "Store",
  product: "Product",
} as const;

export type UdfFieldType =
  | "STRING"
  | "NUMBER"
  | "DATE"
  | "BOOLEAN"
  | "SELECT"
  | "DROPDOWN"
  | "API_SELECT"
  | "CASCADING_SELECT"
  | "IMAGE"
  | "FILE";

export type UdfConfigScope = keyof typeof UDF_ENTITY_TYPES;
export type UdfEntityType = (typeof UDF_ENTITY_TYPES)[UdfConfigScope] | string;
export type UdfImageSource = "Camera" | "Gallery" | "Both";

export interface UdfVisibilityRule {
  dependsOnField: string;
  showWhen: string[];
}

export interface UdfCascadingStaticOption {
  value: string;
  parentValue: string;
}

export interface UdfApiSelectConfig {
  sourceKey: string;
  labelKey: string;
  valueKey: string;
  storeFilterMode?: string;
  filters?: UdfDatasourceFilterConfig;
}

export interface UdfCascadingSelectConfig {
  dependsOn: string;
  options?: UdfCascadingStaticOption[];
  sourceKey?: string;
  valueField?: string;
  parentField?: string;
  filters?: UdfDatasourceFilterConfig;
}

export interface UdfDatasourceFilterConfig {
  mode: string;
  params?: Record<string, unknown>;
}

export interface UdfMediaConfig {
  multiple?: boolean;
  maxCount?: number;
}

export interface UdfImageConfig extends UdfMediaConfig {
  source?: UdfImageSource;
}

export interface UdfFileConfig extends UdfMediaConfig {
  accept?: string[];
}

export interface UdfOptionListConfig {
  options: string[];
}

export type UdfFieldConfig =
  | UdfOptionListConfig
  | UdfApiSelectConfig
  | UdfCascadingSelectConfig
  | UdfImageConfig
  | UdfFileConfig
  | Record<string, unknown>;

export interface UdfSchemaField {
  fieldKey: string;
  label: string;
  type: UdfFieldType;
  config?: UdfFieldConfig;
  required?: boolean;
  order?: number;
  status?: boolean;
  summaryKey?: boolean;
  visibilityRules?: UdfVisibilityRule[];
}

export interface UdfSchemaDocument {
  projectId: string;
  entityType: UdfEntityType;
  schemaKey: string;
  fields: UdfSchemaField[];
}

export interface UdfFieldTypeOption {
  key: UdfFieldType;
  label: string;
}

export interface UdfDataSourceDefinition {
  key: string;
  name: string;
  label?: string;
}

export interface UdfDatasourceFilterMode {
  key: string;
  label: string;
  description?: string;
  isDefault?: boolean;
  requires?: string[];
  paramsSchema?: Record<string, UdfDatasourceFilterParamSchema>;
}

export interface UdfDatasourceFilterParamSchema {
  type?: string;
  label?: string;
  required?: boolean;
  description?: string;
  allowedFieldTypes?: UdfFieldType[] | string[];
  allowedDataSources?: string[];
}

export interface UdfDatasourceFilterModesResponse {
  key: string;
  label: string;
  defaultMode?: string;
  modes: UdfDatasourceFilterMode[];
}

export interface UdfSourcePreviewQuery {
  projectId: string;
  search?: string;
}

export type UdfSourcePreviewItem = Record<string, unknown>;

export interface UdfOptionsRequest {
  entityType: UdfEntityType;
  projectId: string;
  schemaKey: string;
  fieldKey: string;
  currentValues: Record<string, unknown>;
  search?: string;
}

export interface UdfOptionItem {
  label: string;
  value: string;
  parentValue?: string;
}

export interface UdfOptionsResponse {
  fieldKey: string;
  dataSource?: string;
  filterMode?: string;
  options: UdfOptionItem[];
}

function normalizeSourcePreviewItem(item: unknown, index: number): UdfSourcePreviewItem | null {
  if (item && typeof item === "object" && !Array.isArray(item)) {
    return item as Record<string, unknown>;
  }

  if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
    return {
      id: String(item),
      value: item,
      label: String(item),
      order: index + 1,
    };
  }

  return null;
}

function normalizeFilterMode(value: unknown): UdfDatasourceFilterMode | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const key = String(raw.key ?? "").trim();
  if (!key) return null;
  const paramsSchema =
    raw.paramsSchema && typeof raw.paramsSchema === "object" && !Array.isArray(raw.paramsSchema)
      ? (raw.paramsSchema as Record<string, UdfDatasourceFilterParamSchema>)
      : undefined;
  return {
    key,
    label: String(raw.label ?? key).trim(),
    description: String(raw.description ?? "").trim() || undefined,
    isDefault: typeof raw.isDefault === "boolean" ? raw.isDefault : undefined,
    requires: Array.isArray(raw.requires)
      ? raw.requires.map((item) => String(item)).filter(Boolean)
      : undefined,
    paramsSchema,
  };
}

function normalizeFilterModesResponse(
  payload: unknown,
  fallbackKey: string,
): UdfDatasourceFilterModesResponse {
  const data = unwrapApiData(payload);
  const raw = data && typeof data === "object" && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : {};
  const key = String(raw.key ?? fallbackKey).trim();
  const modes = Array.isArray(raw.modes)
    ? raw.modes.map(normalizeFilterMode).filter((mode): mode is UdfDatasourceFilterMode => Boolean(mode))
    : [];
  return {
    key,
    label: String(raw.label ?? key).trim(),
    defaultMode: String(raw.defaultMode ?? "").trim() || undefined,
    modes,
  };
}

function normalizeFieldType(value: unknown): UdfFieldType | null {
  const raw = String(value ?? "").trim().toUpperCase();
  switch (raw) {
    case "STRING":
    case "NUMBER":
    case "DATE":
    case "BOOLEAN":
    case "SELECT":
    case "DROPDOWN":
    case "API_SELECT":
    case "CASCADING_SELECT":
    case "IMAGE":
    case "FILE":
      return raw;
    default:
      return null;
  }
}

function normalizeVisibilityRules(value: unknown): UdfVisibilityRule[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const rules = value
    .map((item) => {
      const raw = item as Record<string, unknown>;
      const dependsOnField = String(raw.dependsOnField ?? "").trim();
      const showWhen = Array.isArray(raw.showWhen)
        ? raw.showWhen.map((entry) => String(entry))
        : [];
      if (!dependsOnField || showWhen.length === 0) return null;
      return { dependsOnField, showWhen };
    })
    .filter((rule): rule is UdfVisibilityRule => Boolean(rule));

  return rules.length > 0 ? rules : undefined;
}

function normalizeFieldConfig(value: unknown): UdfFieldConfig | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function normalizeSchemaField(rawValue: unknown, index: number): UdfSchemaField {
  const raw = (rawValue ?? {}) as Record<string, unknown>;
  const type = normalizeFieldType(raw.type) ?? "STRING";

  return {
    fieldKey: String(raw.fieldKey ?? raw.key ?? `field_${index + 1}`).trim(),
    label: String(raw.label ?? raw.name ?? `Field ${index + 1}`).trim(),
    type,
    config: normalizeFieldConfig(raw.config),
    required: typeof raw.required === "boolean" ? raw.required : undefined,
    order: typeof raw.order === "number" ? raw.order : index + 1,
    status: typeof raw.status === "boolean" ? raw.status : undefined,
    summaryKey:
      typeof raw.summaryKey === "boolean" ? raw.summaryKey : undefined,
    visibilityRules: normalizeVisibilityRules(raw.visibilityRules),
  };
}

function normalizeSchemaDocument(
  payload: unknown,
  fallback: {
    projectId: string;
    entityType: UdfEntityType;
    schemaKey: string;
  },
): UdfSchemaDocument {
  const unwrapped = unwrapApiData(payload) as Record<string, unknown> | undefined;
  const raw = (unwrapped ?? payload ?? {}) as Record<string, unknown>;
  const fieldsRaw = Array.isArray(raw.fields) ? raw.fields : [];

  return {
    projectId: String(raw.projectId ?? fallback.projectId),
    entityType: String(raw.entityType ?? fallback.entityType),
    schemaKey: String(raw.schemaKey ?? fallback.schemaKey),
    fields: fieldsRaw.map(normalizeSchemaField),
  };
}

function buildSchemaQuery(params: {
  projectId: string;
  entityType: UdfEntityType;
  schemaKey?: string;
}): string {
  const search = new URLSearchParams({
    projectId: params.projectId,
    entityType: params.entityType,
    schemaKey: params.schemaKey ?? DEFAULT_SCHEMA_KEY,
  });
  return search.toString();
}

function buildSourcePreviewQuery(params: UdfSourcePreviewQuery): string {
  const search = new URLSearchParams({ projectId: params.projectId });
  if (params.search?.trim()) search.set("search", params.search.trim());
  return search.toString();
}

export const udfConfigService = {
  entityTypeForScope(scope: UdfConfigScope): UdfEntityType {
    return UDF_ENTITY_TYPES[scope];
  },

  async getFieldTypes(): Promise<UdfFieldTypeOption[]> {
    const raw = await apiClient.get<unknown>(`${BASE}/config/field-types`);
    const data = unwrapApiData(raw);
    const values = Array.isArray(data) ? data : [];
    return values
      .map(normalizeFieldType)
      .filter((value): value is UdfFieldType => Boolean(value))
      .map((key) => ({ key, label: key.replaceAll("_", " ") }));
  },

  async getSources(): Promise<UdfDataSourceDefinition[]> {
    const raw = await apiClient.get<unknown>(`${BASE}/sources`);
    const data = unwrapApiData(raw);
    if (!Array.isArray(data)) return [];

    return data
      .map((item) => {
        if (typeof item === "string") {
          const key = item.trim();
          return key ? { key, name: key } : null;
        }
        const source = item as Record<string, unknown>;
        const key = String(source.key ?? "").trim();
        const name = String(source.name ?? source.label ?? key).trim();
        const label = String(source.label ?? name).trim();
        return key ? { key, name, label } : null;
      })
      .filter(
        (item): item is UdfDataSourceDefinition => Boolean(item),
      );
  },

  async getSourceFilterModes(sourceKey: string): Promise<UdfDatasourceFilterModesResponse> {
    const raw = await apiClient.get<unknown>(
      `${BASE}/sources/${encodeURIComponent(sourceKey)}/filter-modes`,
    );
    return normalizeFilterModesResponse(raw, sourceKey);
  },

  async previewSource(
    sourceKey: string,
    query: UdfSourcePreviewQuery,
  ): Promise<UdfSourcePreviewItem[]> {
    const raw = await apiClient.get<unknown>(
      `${BASE}/sources/${encodeURIComponent(sourceKey)}?${buildSourcePreviewQuery(query)}`,
    );
    const data = unwrapApiData(raw);
    if (!Array.isArray(data)) return [];
    return data
      .map(normalizeSourcePreviewItem)
      .filter((item): item is UdfSourcePreviewItem => Boolean(item));
  },

  async getSchema(params: {
    projectId: string;
    entityType: UdfEntityType;
    schemaKey?: string;
  }): Promise<UdfSchemaDocument | null> {
    const schemaKey = params.schemaKey ?? DEFAULT_SCHEMA_KEY;
    try {
      const raw = await apiClient.get<unknown>(
        `${BASE}/schema?${buildSchemaQuery({
          ...params,
          schemaKey,
        })}`,
      );
      return normalizeSchemaDocument(raw, {
        projectId: params.projectId,
        entityType: params.entityType,
        schemaKey,
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  },

  async createOrUpdateSchema(input: UdfSchemaDocument): Promise<UdfSchemaDocument> {
    const raw = await apiClient.post<unknown>(`${BASE}/schema`, {
      projectId: input.projectId,
      entityType: input.entityType,
      schemaKey: input.schemaKey || DEFAULT_SCHEMA_KEY,
      fields: input.fields,
    });
    return normalizeSchemaDocument(raw, {
      projectId: input.projectId,
      entityType: input.entityType,
      schemaKey: input.schemaKey || DEFAULT_SCHEMA_KEY,
    });
  },

  async getOptions(input: UdfOptionsRequest): Promise<UdfOptionsResponse> {
    const raw = await apiClient.post<unknown>(`${BASE}/options`, input);
    const data = unwrapApiData(raw);
    const result = data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {};
    const options: UdfOptionItem[] = Array.isArray(result.options)
      ? result.options
          .map((item): UdfOptionItem | null => {
            if (!item || typeof item !== "object" || Array.isArray(item)) return null;
            const option = item as Record<string, unknown>;
            const normalized: UdfOptionItem = {
              label: String(option.label ?? option.value ?? ""),
              value: String(option.value ?? ""),
            };
            if (option.parentValue !== undefined) {
              normalized.parentValue = String(option.parentValue);
            }
            return normalized;
          })
          .filter((item): item is UdfOptionItem => Boolean(item?.label && item.value))
      : [];
    return {
      fieldKey: String(result.fieldKey ?? input.fieldKey),
      dataSource: String(result.dataSource ?? "").trim() || undefined,
      filterMode: String(result.filterMode ?? "").trim() || undefined,
      options,
    };
  },
};
