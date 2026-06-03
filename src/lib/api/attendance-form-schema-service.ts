import { apiClient } from "./api-client";
import type {
  UdfApiSelectConfig,
  UdfFieldConfig,
  UdfFieldType,
  UdfSchemaField,
} from "./udf-config-service";

const BASE = "/api/v1/attendance-form/schema";
const DEFAULT_SCHEMA_KEY = "default";
const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API === "true";

export type AttendanceFormType = "check-in" | "check-out";

export interface AttendanceFormSchemaDocument {
  projectId: string;
  formType: AttendanceFormType;
  schemaKey: string;
  fields: UdfSchemaField[];
}

export interface SaveAttendanceFormSchemaInput {
  projectId: string;
  schemaKey?: string;
  fields: UdfSchemaField[];
}

const mockStore = new Map<string, AttendanceFormSchemaDocument>();

function mockKey(projectId: string, formType: AttendanceFormType, schemaKey: string): string {
  return `${projectId}:${formType}:${schemaKey}`;
}

function delay(ms = 250): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeFieldType(value: unknown): UdfFieldType {
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
      return "STRING";
  }
}

function normalizeFieldConfig(value: unknown): UdfFieldConfig | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as UdfFieldConfig;
}

function normalizeField(rawValue: unknown, index: number): UdfSchemaField {
  const raw = (rawValue ?? {}) as Record<string, unknown>;
  return {
    fieldKey: String(raw.fieldKey ?? `field_${index + 1}`).trim(),
    label: String(raw.label ?? `Field ${index + 1}`).trim(),
    type: normalizeFieldType(raw.type),
    required: typeof raw.required === "boolean" ? raw.required : false,
    order: typeof raw.order === "number" ? raw.order : index + 1,
    status: typeof raw.status === "boolean" ? raw.status : true,
    summaryKey: typeof raw.summaryKey === "boolean" ? raw.summaryKey : false,
    config: normalizeFieldConfig(raw.config),
  };
}

function normalizeDocument(
  payload: unknown,
  fallback: { projectId: string; formType: AttendanceFormType; schemaKey: string },
): AttendanceFormSchemaDocument | null {
  if (!payload || typeof payload !== "object") return null;
  const raw = payload as Record<string, unknown>;
  const data =
    raw && typeof raw.data === "object" && raw.data !== null
      ? (raw.data as Record<string, unknown>)
      : raw;

  const fieldsRaw = Array.isArray(data.fields) ? data.fields : [];

  return {
    projectId: String(data.projectId ?? fallback.projectId),
    formType: fallback.formType,
    schemaKey: String(data.schemaKey ?? fallback.schemaKey),
    fields: fieldsRaw.map(normalizeField),
  };
}

function sanitizeApiSelectConfig(config: UdfFieldConfig | undefined): UdfFieldConfig | undefined {
  if (!config || typeof config !== "object" || Array.isArray(config)) return config;
  const raw = config as Record<string, unknown>;
  if (!("sourceKey" in raw) && !("labelKey" in raw) && !("valueKey" in raw)) {
    return config;
  }

  const next: UdfApiSelectConfig = {
    sourceKey: String(raw.sourceKey ?? "").trim(),
    labelKey: String(raw.labelKey ?? "").trim(),
    valueKey: String(raw.valueKey ?? "").trim(),
  };

  if (typeof raw.storeFilterMode === "string" && raw.storeFilterMode.trim()) {
    next.storeFilterMode = raw.storeFilterMode.trim();
  }

  return next;
}

function sanitizeField(field: UdfSchemaField, index: number): UdfSchemaField {
  return {
    fieldKey: field.fieldKey.trim(),
    label: field.label.trim(),
    type: field.type,
    required: Boolean(field.required),
    order: field.order ?? index + 1,
    status: field.status ?? true,
    summaryKey: Boolean(field.summaryKey),
    config: field.type === "API_SELECT" ? sanitizeApiSelectConfig(field.config) : field.config,
  };
}

export const attendanceFormSchemaService = {
  async get(
    projectId: string,
    formType: AttendanceFormType,
    schemaKey = DEFAULT_SCHEMA_KEY,
  ): Promise<AttendanceFormSchemaDocument | null> {
    if (USE_MOCK_API) {
      await delay();
      return mockStore.get(mockKey(projectId, formType, schemaKey)) ?? null;
    }

    const search = new URLSearchParams();
    if (schemaKey && schemaKey !== DEFAULT_SCHEMA_KEY) {
      search.set("schemaKey", schemaKey);
    }

    const query = search.toString();
    const raw = await apiClient.get<unknown>(
      `${BASE}/${formType}/${projectId}${query ? `?${query}` : ""}`,
    );
    return normalizeDocument(raw, { projectId, formType, schemaKey });
  },

  async save(
    formType: AttendanceFormType,
    input: SaveAttendanceFormSchemaInput,
  ): Promise<void> {
    const schemaKey = input.schemaKey ?? DEFAULT_SCHEMA_KEY;
    const body = {
      projectId: input.projectId,
      ...(schemaKey !== DEFAULT_SCHEMA_KEY ? { schemaKey } : {}),
      fields: input.fields.map(sanitizeField),
    };

    if (USE_MOCK_API) {
      await delay();
      mockStore.set(mockKey(input.projectId, formType, schemaKey), {
        projectId: input.projectId,
        formType,
        schemaKey,
        fields: body.fields,
      });
      return;
    }

    await apiClient.post<void>(`${BASE}/${formType}`, body);
  },
};
