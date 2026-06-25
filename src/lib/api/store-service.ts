/**
 * Store service — wraps /api/v1/stores endpoints.
 * Mirrors the pattern of project-users-service.ts.
 */

import { apiClient } from "./api-client";
import { udfConfigService } from "./udf-config-service";
import type { UDFField } from "@/types/project-admin";
import type { UdfSchemaField } from "./udf-config-service";

const BASE = "/api/v1/stores";

// ─── Response shapes ─────────────────────────────────────────────────────────

export interface StoreRecord {
  backendId: string;
  storeCode: string;
  storeName: string;
  latitude: number;
  longitude: number;
  projectId: string;
  storeType?: string;
  isActive: boolean;
  udfs: Record<string, string | string[]>;
}

interface RawStore {
  _id?: string;
  id?: string;
  storeCode?: string;
  storeName?: string;
  latitude?: number;
  longitude?: number;
  projectId?: string | { _id?: string };
  store_type?: string;
  isActive?: boolean;
  [key: string]: unknown;
}

interface PaginatedStores {
  data?: RawStore[];
  meta?: { total?: number; page?: number; pageSize?: number; totalCount?: number };
}

export interface BulkStoreResult {
  total: number;
  successCount: number;
  invalidCount: number;
  successes: { id: string; storeCode: string }[];
  errors: { row?: string | number; data?: unknown; errors: string[] }[];
}

interface StoreFormFieldsResponse {
  projectId?: string;
  entityType?: string;
  staticFields?: unknown;
  udfFields?: unknown;
}

// ─── Normalizers ─────────────────────────────────────────────────────────────

const KNOWN_CORE_KEYS = new Set([
  '_id', 'id', 'storeCode', 'storeName', 'latitude', 'longitude',
  'projectId', 'store_type', 'isActive', 'createdAt', 'updatedAt',
  'createdBy', 'updatedBy', '__v', 'isDeleted', 'deletedAt', 'deletedBy', 'version',
]);

function extractUdfs(raw: RawStore): Record<string, string | string[]> {
  const udfs: Record<string, string | string[]> = {};
  for (const [key, val] of Object.entries(raw)) {
    if (KNOWN_CORE_KEYS.has(key)) continue;
    if (Array.isArray(val)) {
      udfs[key] = val.map(String);
    } else if (val != null) {
      udfs[key] = String(val);
    }
  }
  return udfs;
}

function normalizeStore(raw: RawStore): StoreRecord {
  const backendId = raw._id ?? raw.id ?? "";
  const projectRef = raw.projectId;
  return {
    backendId: String(backendId),
    storeCode: raw.storeCode ?? "",
    storeName: raw.storeName ?? "",
    latitude: raw.latitude ?? 0,
    longitude: raw.longitude ?? 0,
    projectId: typeof raw.projectId === "string"
      ? raw.projectId
      : projectRef && typeof projectRef === "object"
        ? String(projectRef._id ?? "")
        : "",
    storeType: raw.store_type,
    isActive: raw.isActive !== false,
    udfs: extractUdfs(raw),
  };
}

function normalizeUdfSchemaFields(payload: unknown): UdfSchemaField[] {
  const fields = Array.isArray(payload) ? payload : [];
  return fields.map((item, index) => {
    const f = item as Record<string, unknown>;
    return {
      fieldKey: String(f.fieldKey ?? `field_${index + 1}`),
      label: String(f.label ?? f.fieldKey ?? `Field ${index + 1}`),
      type: String(f.type ?? "STRING").toUpperCase() as UdfSchemaField["type"],
      required: Boolean(f.required),
      status: typeof f.status === "boolean" ? f.status : true,
      order: typeof f.order === "number" ? f.order : index + 1,
      config: f.config && typeof f.config === "object" && !Array.isArray(f.config)
        ? (f.config as Record<string, unknown>)
        : {},
      summaryKey: typeof f.summaryKey === "boolean" ? f.summaryKey : false,
      visibilityRules: Array.isArray(f.visibilityRules)
        ? (f.visibilityRules as UdfSchemaField["visibilityRules"])
        : undefined,
    };
  });
}

function schemaFieldsToRuntimeFields(payload: unknown): UDFField[] {
  const fields = Array.isArray(payload) ? payload : [];

  return fields
    .map((item, index) => {
      const f = item as Record<string, unknown>;
      const typeRaw = String(f.type ?? "STRING").toUpperCase();

      let type: UDFField["type"] | null = "alphanumeric";
      if (typeRaw === "NUMBER") type = "numeric";
      if (typeRaw === "DROPDOWN" || typeRaw === "SELECT" || typeRaw === "API_SELECT" || typeRaw === "CASCADING_SELECT") {
        type = "dropdown";
      }
      if (typeRaw === "DATE" || typeRaw === "BOOLEAN" || typeRaw === "IMAGE" || typeRaw === "FILE") {
        type = null;
      }
      if (!type) return null;

      const config =
        f.config && typeof f.config === "object" && !Array.isArray(f.config)
          ? (f.config as Record<string, unknown>)
          : {};
      const options = Array.isArray(config.options) ? config.options.map(String) : [];
      const idSeed = String(f.fieldKey ?? f.label ?? index + 1);
      const id = Array.from(idSeed).reduce((sum, char) => sum + char.charCodeAt(0), 0);

      const runtimeField: UDFField = {
        id,
        fieldKey: String(f.fieldKey ?? `field_${index + 1}`),
        name: String(f.label ?? f.fieldKey ?? `Field ${index + 1}`),
        type,
        values: options,
        mandatory: Boolean(f.required),
      };

      if (Array.isArray(options) && options.length > 0) {
        runtimeField.optionItems = options.map((option) => ({ label: option, value: option }));
      }

      if (typeRaw === "API_SELECT") {
        runtimeField.sourceKey = String(config.sourceKey ?? "") || undefined;
        runtimeField.labelKey = String(config.labelKey ?? "") || undefined;
        runtimeField.valueKey = String(config.valueKey ?? "") || undefined;
        runtimeField.multiple = Boolean(config.multiple);
      }

      return runtimeField;
    })
    .filter((field): field is UDFField => Boolean(field));
}

// ─── Input types ─────────────────────────────────────────────────────────────

export interface CreateStoreInput {
  projectId: string;
  storeCode: string;
  storeName: string;
  latitude: number;
  longitude: number;
  udfs?: Record<string, string | string[]>;
}

export interface UpdateStoreInput {
  storeCode?: string;
  storeName?: string;
  latitude?: number;
  longitude?: number;
  udfs?: Record<string, string | string[]>;
}

export interface SaveStoreSchemaInput {
  projectId: string;
  fields: UdfSchemaField[];
}

function normalizeStoreSchemaFieldForSave(
  field: UdfSchemaField,
  index: number,
): Record<string, unknown> {
  return {
    fieldKey: field.fieldKey,
    label: field.label,
    type: field.type,
    ...(field.required !== undefined ? { required: field.required } : {}),
    order: field.order ?? index + 1,
    ...(field.status !== undefined ? { status: field.status } : {}),
    ...(field.summaryKey !== undefined ? { summaryKey: field.summaryKey } : {}),
    ...(field.visibilityRules ? { visibilityRules: field.visibilityRules } : {}),
    ...(field.config && typeof field.config === "object" && !Array.isArray(field.config)
      ? { config: field.config }
      : {}),
  };
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const storeService = {
  /** List all active stores for a project (up to 500). */
  async listByProject(projectId: string, limit = 500): Promise<StoreRecord[]> {
    const res = await apiClient.get<PaginatedStores | RawStore[]>(
      `${BASE}?projectId=${encodeURIComponent(projectId)}&limit=${limit}`,
    );
    const rows = Array.isArray(res) ? res : (res.data ?? []);
    return rows.map(normalizeStore);
  },

  /** Get UDF form fields (runtime UDFField[] shape for forms). */
  async getFormFields(projectId: string): Promise<UDFField[]> {
    try {
      const config = await storeService.getFormFieldsConfig(projectId);
      if (config && config.udfFields.length > 0) {
        return schemaFieldsToRuntimeFields(config.udfFields);
      }
    } catch {
      // fall through
    }

    try {
      const res = await apiClient.get<unknown>(
        `${BASE}/form-fields/${encodeURIComponent(projectId)}`,
      );
      const root = res as Record<string, unknown>;
      const payload = (("data" in root ? root.data : res) ?? {}) as Record<string, unknown>;
      const udfFields = payload.udfFields;
      if (Array.isArray(udfFields) && udfFields.length > 0) {
        return schemaFieldsToRuntimeFields(udfFields);
      }
    } catch {
      // fall through
    }

    try {
      const schema = await udfConfigService.getSchema({
        projectId,
        entityType: udfConfigService.entityTypeForScope("store"),
      });
      return schemaFieldsToRuntimeFields(schema?.fields ?? []);
    } catch {
      return [];
    }
  },

  /** Get full UDF schema config (UdfSchemaField[] shape for UDF config modal). */
  async getFormFieldsConfig(projectId: string): Promise<{
    projectId: string;
    entityType: string;
    udfFields: UdfSchemaField[];
    staticFields: unknown;
  } | null> {
    try {
      const res = await apiClient.get<{ data?: StoreFormFieldsResponse } | StoreFormFieldsResponse>(
        `${BASE}/form-fields/${encodeURIComponent(projectId)}`,
      );
      const payload = ("data" in (res as Record<string, unknown>)
        ? (res as { data?: StoreFormFieldsResponse }).data
        : res) as StoreFormFieldsResponse | undefined;
      if (!payload || typeof payload !== "object") return null;

      return {
        projectId: String(payload.projectId ?? projectId),
        entityType: String(payload.entityType ?? "STORE"),
        udfFields: normalizeUdfSchemaFields(payload.udfFields),
        staticFields: payload.staticFields ?? null,
      };
    } catch {
      return null;
    }
  },

  async saveStoreSchema(input: SaveStoreSchemaInput): Promise<void> {
    await apiClient.post(`${BASE}/schema`, {
      projectId: input.projectId,
      fields: input.fields.map(normalizeStoreSchemaFieldForSave),
    });
  },

  /** Create a single store. */
  async create(input: CreateStoreInput): Promise<void> {
    const payload: Record<string, unknown> = {
      projectId: input.projectId,
      storeCode: input.storeCode,
      storeName: input.storeName,
      latitude: input.latitude,
      longitude: input.longitude,
      ...(input.udfs ?? {}),
    };
    await apiClient.post(BASE, payload);
  },

  /** Update an existing store by backend ID. */
  async update(storeId: string, input: UpdateStoreInput): Promise<void> {
    const payload: Record<string, unknown> = {
      ...(input.storeCode !== undefined ? { storeCode: input.storeCode } : {}),
      ...(input.storeName !== undefined ? { storeName: input.storeName } : {}),
      ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
      ...(input.longitude !== undefined ? { longitude: input.longitude } : {}),
      ...(input.udfs ?? {}),
    };
    await apiClient.patch(`${BASE}/${encodeURIComponent(storeId)}`, payload);
  },

  /** Soft-delete a store (sets isActive=false). */
  async delete(storeId: string): Promise<void> {
    await apiClient.delete(`${BASE}/${encodeURIComponent(storeId)}`);
  },

  /** Download dynamic Excel template. */
  async downloadTemplate(projectId: string): Promise<Blob> {
    return apiClient.getBlob(
      `${BASE}/bulk/template?projectId=${encodeURIComponent(projectId)}`,
    );
  },

  /** Bulk upload stores from Excel file. */
  async bulkUpload(projectId: string, file: File): Promise<BulkStoreResult> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("projectId", projectId);
    return apiClient.postFormData<BulkStoreResult>(`${BASE}/bulk/excel`, formData);
  },

  /** Export all active stores as Excel. */
  async exportStores(projectId: string): Promise<Blob> {
    return apiClient.getBlob(
      `${BASE}/bulk/export?projectId=${encodeURIComponent(projectId)}`,
    );
  },
};
