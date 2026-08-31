/**
 * Project users service — wraps /api/v1/users endpoints.
 */

import { apiClient } from "./api-client";
import {
  clampListPageSize,
  DEFAULT_LIST_PAGE_SIZE,
  MAX_LIST_PAGE_SIZE,
  normalizeListMeta,
  type ListMeta,
  type RawListMeta,
} from "./pagination";
import { udfConfigService } from "./udf-config-service";
import type {
  UDFField,
  ProjectUser,
  UDFValue,
  UserStaticField,
  UserStaticFields,
} from "@/types/project-admin";
import type { UdfSchemaField } from "./udf-config-service";

const BASE = "/api/v1/users";

interface RawUser {
  _id?: string;
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  employeeId?: string;
  designation?: string | { name?: string; roleName?: string };
  status?: string;
  isActive?: boolean;
  udfData?: Record<string, unknown>;
  createdAt?: string;
  doj?: string;
  dateOfJoining?: string;
  dateOfExit?: string;
  reportees?: unknown[];
  [key: string]: unknown;
}

/** Keys that belong to the core user document and should NOT be treated as UDF data */
const KNOWN_USER_KEYS = new Set([
  "_id", "id", "__v", "email", "firstName", "lastName", "phoneNumber",
  "employeeId", "designation", "status", "isActive", "udfData",
  "createdAt", "updatedAt", "doj", "dateOfJoining", "dateOfExit", "reportees",
  "projectId", "accountId", "accountName", "password", "role",
]);

const STORE_IDS_FIELD_KEY = "storeIds";

interface PaginatedUsers {
  data?: RawUser[];
  meta?: RawListMeta;
}

export interface ProjectUserListResult {
  data: ProjectUser[];
  meta: ListMeta;
}

export interface BulkUploadResult {
  total: number;
  successCount: number;
  createdCount?: number;
  updatedCount?: number;
  invalidCount: number;
  successes: { id: string; email: string; employeeId: string; action?: string }[];
  errors: { row?: string | number; data?: unknown; errors: string[] }[];
}

interface UserFormFieldsResponseData {
  projectId?: string;
  entityType?: string;
  staticFields?: unknown;
  udfFields?: unknown;
}

function normalizeStatus(raw: RawUser): "active" | "inactive" {
  if (typeof raw.isActive === "boolean") return raw.isActive ? "active" : "inactive";
  const s = (raw.status ?? "").toUpperCase();
  if (s === "INACTIVE" || s === "DISABLED") return "inactive";
  return "active";
}

function designationLabel(raw: RawUser): { designation: string; role: string } {
  if (typeof raw.designation === "object" && raw.designation) {
    return {
      designation: raw.designation.name ?? "",
      role: raw.designation.roleName ?? "",
    };
  }
  return { designation: String(raw.designation ?? ""), role: "" };
}

function normalizeDateInputValue(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  const isoDateMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoDateMatch) return isoDateMatch[1];

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function normalizeUser(raw: RawUser): ProjectUser {
  const { designation, role } = designationLabel(raw);
  const name = `${raw.firstName ?? ""} ${raw.lastName ?? ""}`.trim() || raw.email || "";
  const backendId = raw._id ?? raw.id ?? "";

  // UDF data may come in a nested udfData field OR spread at root level
  const explicitUdf = raw.udfData;
  const rootLevelUdf: Record<string, unknown> = {};
  for (const key of Object.keys(raw)) {
    if (!KNOWN_USER_KEYS.has(key)) {
      rootLevelUdf[key] = raw[key];
    }
  }
  // Merge: explicit udfData takes precedence if present, otherwise use root-level
  const mergedUdf = (explicitUdf && Object.keys(explicitUdf).length > 0)
    ? { ...rootLevelUdf, ...explicitUdf }
    : rootLevelUdf;

  return {
    backendId,
    id: raw.employeeId ?? backendId,
    name,
    mobile: raw.phoneNumber ?? "",
    email: raw.email ?? "",
    designation,
    role,
    doj:
      normalizeDateInputValue(raw.doj) ||
      normalizeDateInputValue(raw.dateOfJoining) ||
      normalizeDateInputValue(raw.createdAt),
    doe: normalizeDateInputValue(raw.dateOfExit),
    status: normalizeStatus(raw),
    udfs: normalizeUdfData(Object.keys(mergedUdf).length > 0 ? mergedUdf : undefined),
    reporteeIds: normalizeReferenceIds(raw.reportees),
  };
}

function normalizeReferenceIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string" || typeof item === "number") {
        return String(item);
      }
      if (!item || typeof item !== "object" || Array.isArray(item)) return "";
      const reference = item as Record<string, unknown>;
      return String(reference._id ?? reference.id ?? reference.userId ?? "");
    })
    .filter(Boolean);
}

function normalizeUdfData(value: unknown): Record<string, UDFValue> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const entries = Object.entries(value as Record<string, unknown>).map(([key, item]) => {
    if (Array.isArray(item)) {
      return [key, item.map(String)] as const;
    }
    return [key, item == null ? "" : String(item)] as const;
  });
  return Object.fromEntries(entries);
}

function parseFormFields(payload: unknown): UDFField[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;
  const data = (root.data ?? root.fields ?? payload) as unknown;
  if (!Array.isArray(data)) return [];

  return data.map((item, index) => {
    const f = item as Record<string, unknown>;
    const typeRaw = String(f.type ?? f.fieldType ?? "alphanumeric").toLowerCase();
    let type: UDFField["type"] = "alphanumeric";
    if (typeRaw.includes("num")) type = "numeric";
    if (typeRaw.includes("drop") || typeRaw.includes("select")) type = "dropdown";

    const options = f.options ?? f.values ?? f.dropdownValues;
    return {
      id: typeof f.id === "number" ? f.id : index + 1,
      fieldKey: String(f.fieldKey ?? f.key ?? f.name ?? f.label ?? `field_${index + 1}`),
      name: String(f.name ?? f.label ?? f.key ?? `Field ${index + 1}`),
      type,
      values: Array.isArray(options) ? options.map(String) : [],
      mandatory: Boolean(f.mandatory ?? f.required),
    };
  });
}

function schemaFieldsToRuntimeFields(payload: unknown): UDFField[] {
  const fields = Array.isArray(payload) ? payload : [];

  return fields
    .map((item, index) => {
      const f = item as Record<string, unknown>;
      const typeRaw = String(f.type ?? "STRING").toUpperCase();

      // Current add/edit user forms can safely render text, number, and
      // dropdown-like UDFs. Richer types stay configurable in UDF Config and
      // can be surfaced in runtime forms later without blocking schema setup.
      let type: UDFField["type"] | null = "alphanumeric";
      if (typeRaw === "NUMBER") type = "numeric";
      if (
        typeRaw === "DROPDOWN" ||
        typeRaw === "SELECT" ||
        typeRaw === "API_SELECT" ||
        typeRaw === "CASCADING_SELECT"
      ) {
        type = "dropdown";
      }
      if (
        typeRaw === "DATE" ||
        typeRaw === "BOOLEAN" ||
        typeRaw === "IMAGE" ||
        typeRaw === "FILE"
      ) {
        type = null;
      }
      if (!type) return null;

      const config =
        f.config && typeof f.config === "object" && !Array.isArray(f.config)
          ? (f.config as Record<string, unknown>)
          : {};
      const options = Array.isArray(config.options)
        ? config.options.map(String)
        : [];
      const idSeed = String(f.fieldKey ?? f.label ?? index + 1);
      const id = Array.from(idSeed).reduce(
        (sum, char) => sum + char.charCodeAt(0),
        0,
      );

      const runtimeField: UDFField = {
        id,
        fieldKey: String(f.fieldKey ?? `field_${index + 1}`),
        name: String(f.label ?? f.fieldKey ?? `Field ${index + 1}`),
        type,
        values: options,
        mandatory: Boolean(f.required),
      };
      const isStoreIds = runtimeField.fieldKey === STORE_IDS_FIELD_KEY;

      if (Array.isArray(options)) {
        runtimeField.optionItems = options.map((option) => ({
          label: option,
          value: option,
        }));
      }

      if (typeRaw === "DROPDOWN" || typeRaw === "SELECT" || typeRaw === "API_SELECT") {
        runtimeField.multiple = isStoreIds || config.multiple === true;
      }

      if (typeRaw === "API_SELECT") {
        runtimeField.sourceKey = String(config.sourceKey ?? "") || undefined;
        runtimeField.labelKey = String(config.labelKey ?? "") || undefined;
        runtimeField.valueKey = String(config.valueKey ?? "") || undefined;
      }

      return runtimeField;
    })
    .filter((field): field is UDFField => Boolean(field));
}

function normalizeUdfSchemaFields(payload: unknown): UdfSchemaField[] {
  const fields = Array.isArray(payload) ? payload : [];

  return fields.map((item, index) => {
    const field = item as Record<string, unknown>;
    const fieldKey = String(field.fieldKey ?? `field_${index + 1}`);
    const type = String(field.type ?? "STRING").toUpperCase() as UdfSchemaField["type"];
    const config =
      field.config && typeof field.config === "object" && !Array.isArray(field.config)
        ? (field.config as Record<string, unknown>)
        : {};

    return {
      fieldKey,
      label: String(field.label ?? field.fieldKey ?? `Field ${index + 1}`),
      type,
      required: Boolean(field.required),
      status:
        typeof field.status === "boolean" ? field.status : true,
      order:
        typeof field.order === "number" ? field.order : index + 1,
      config:
        type === "API_SELECT" && fieldKey === STORE_IDS_FIELD_KEY
          ? { ...config, multiple: true }
          : config,
      summaryKey:
        typeof field.summaryKey === "boolean" ? field.summaryKey : false,
      includeInProfileView:
        typeof field.includeInProfileView === "boolean" ? field.includeInProfileView : false,
      visibilityRules: Array.isArray(field.visibilityRules)
        ? (field.visibilityRules as UdfSchemaField["visibilityRules"])
        : undefined,
    };
  });
}

function normalizeStaticField(rawValue: unknown, index: number): UserStaticField {
  const field = (rawValue ?? {}) as Record<string, unknown>;
  const config =
    field.config && typeof field.config === "object" && !Array.isArray(field.config)
      ? (field.config as Record<string, unknown>)
      : {};

  return {
    fieldKey: String(field.fieldKey ?? `field_${index + 1}`),
    label: String(field.label ?? field.fieldKey ?? `Field ${index + 1}`),
    type: String(field.type ?? "STRING").toUpperCase(),
    required: Boolean(field.required),
    sourceKey:
      String(config.sourceKey ?? config.dataSource ?? "").trim() || undefined,
    labelKey:
      String(config.labelKey ?? config.labelField ?? "").trim() || undefined,
    valueKey:
      String(config.valueKey ?? config.valueField ?? "").trim() || undefined,
    multiple: Boolean(config.multiple),
  };
}

function normalizeStaticFields(payload: unknown): UserStaticFields {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { create: [], update: [] };
  }

  const fields = payload as Record<string, unknown>;
  const create = Array.isArray(fields.create) ? fields.create : [];
  const update = Array.isArray(fields.update) ? fields.update : [];
  return {
    create: create.map(normalizeStaticField),
    update: update.map(normalizeStaticField),
  };
}

function staticFieldToRuntimeField(
  field: UserStaticField,
  index: number,
): UDFField {
  return {
    id: 100000 + index,
    fieldKey: field.fieldKey,
    name: field.label,
    type: "dropdown",
    values: [],
    sourceKey: field.sourceKey,
    labelKey: field.labelKey,
    valueKey: field.valueKey,
    multiple: field.multiple,
    mandatory: field.required,
  };
}

export interface CreateProjectUserInput {
  projectId: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  designationId: string;
  reportees?: string[];
  doj?: string;
  udfs?: Record<string, UDFValue>;
}

export interface UpdateProjectUserInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  designationId?: string;
  doj?: string;
  reportees?: string[];
  udfs?: Record<string, UDFValue>;
}

export interface SaveUserSchemaInput {
  projectId: string;
  fields: UdfSchemaField[];
}

function normalizeUserSchemaFieldForSave(
  field: UdfSchemaField,
  index: number,
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    fieldKey: field.fieldKey,
    label: field.label,
    type: field.type,
    ...(field.required !== undefined ? { required: field.required } : {}),
    order: field.order ?? index + 1,
    ...(field.status !== undefined ? { status: field.status } : {}),
    ...(field.summaryKey !== undefined ? { summaryKey: field.summaryKey } : {}),
    ...(field.includeInProfileView !== undefined
      ? { includeInProfileView: field.includeInProfileView }
      : {}),
    ...(field.visibilityRules ? { visibilityRules: field.visibilityRules } : {}),
  };

  const config =
    field.config && typeof field.config === "object" && !Array.isArray(field.config)
      ? (field.config as Record<string, unknown>)
      : null;

  if (!config) return base;

  if (field.type === "API_SELECT") {
    return {
      ...base,
      config: {
        ...config,
        multiple:
          field.fieldKey === STORE_IDS_FIELD_KEY ||
          config.multiple === true,
      },
    };
  }

  return {
    ...base,
    config,
  };
}

export const projectUsersService = {
  /** List one page of active users for a project. */
  async listByProject(
    projectId: string,
    page = 1,
    pageSize = DEFAULT_LIST_PAGE_SIZE,
    search?: string,
  ): Promise<ProjectUserListResult> {
    const params = new URLSearchParams({
      projectId,
      page: String(page),
      pageSize: String(clampListPageSize(pageSize)),
    });
    const term = search?.trim();
    if (term) params.set("search", term);
    const res = await apiClient.get<PaginatedUsers | RawUser[]>(
      `${BASE}?${params.toString()}`,
    );
    const rows = Array.isArray(res) ? res : (res.data ?? []);
    return {
      data: rows.map(normalizeUser),
      meta: normalizeListMeta(Array.isArray(res) ? undefined : res.meta, rows.length),
    };
  },

  /** Page through every active user. For pickers and mapping screens only. */
  async listAllByProject(projectId: string): Promise<ProjectUser[]> {
    const firstPage = await projectUsersService.listByProject(
      projectId,
      1,
      MAX_LIST_PAGE_SIZE,
    );
    const users = [...firstPage.data];

    for (let page = firstPage.meta.page + 1; page <= firstPage.meta.totalPages; page += 1) {
      const result = await projectUsersService.listByProject(projectId, page, MAX_LIST_PAGE_SIZE);
      users.push(...result.data);
    }

    return users;
  },

  async getFormFields(projectId: string): Promise<UDFField[]> {
    try {
      const config = await projectUsersService.getFormFieldsConfig(projectId);
      if (config && config.udfFields.length > 0) {
        return schemaFieldsToRuntimeFields(config.udfFields);
      }
    } catch {
      // Fall through to legacy parser / schema-based UDF config.
    }

    try {
      const res = await apiClient.get<unknown>(
        `${BASE}/form-fields/${encodeURIComponent(projectId)}`,
      );
      const parsed = parseFormFields(res);
      if (parsed.length > 0) return parsed;
    } catch {
      // Fall through to schema-based UDF config.
    }

    try {
      const schema = await udfConfigService.getSchema({
        projectId,
        entityType: udfConfigService.entityTypeForScope("user"),
      });
      return schemaFieldsToRuntimeFields(schema?.fields ?? []);
    } catch {
      return [];
    }
  },

  async getFormFieldsConfig(projectId: string): Promise<{
    projectId: string;
    entityType: string;
    udfFields: UdfSchemaField[];
    runtimeUdfFields: UDFField[];
    staticFields: unknown;
    runtimeStaticFields: UserStaticFields;
  } | null> {
    try {
      const res = await apiClient.get<{ data?: UserFormFieldsResponseData } | UserFormFieldsResponseData>(
        `${BASE}/form-fields/${encodeURIComponent(projectId)}`,
      );
      const payload = ("data" in (res as Record<string, unknown>)
        ? (res as { data?: UserFormFieldsResponseData }).data
        : res) as UserFormFieldsResponseData | undefined;
      if (!payload || typeof payload !== "object") return null;

      const staticFields = normalizeStaticFields(payload.staticFields);
      const udfFields = normalizeUdfSchemaFields(payload.udfFields);
      return {
        projectId: String(payload.projectId ?? projectId),
        entityType: String(payload.entityType ?? "USER"),
        udfFields,
        runtimeUdfFields: schemaFieldsToRuntimeFields(payload.udfFields),
        staticFields: payload.staticFields ?? null,
        runtimeStaticFields: staticFields,
      };
    } catch {
      return null;
    }
  },

  async saveUserSchema(input: SaveUserSchemaInput): Promise<void> {
    await apiClient.post(`${BASE}/schema`, {
      projectId: input.projectId,
      fields: input.fields.map(normalizeUserSchemaFieldForSave),
    });
  },

  async create(input: CreateProjectUserInput): Promise<void> {
    const payload: Record<string, unknown> = {
      projectId: input.projectId,
      employeeId: input.employeeId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phoneNumber: input.phoneNumber,
      designation: input.designationId,
      ...(input.doj ? { doj: input.doj } : {}),
      ...(input.udfs ?? {}),
      ...(input.reportees !== undefined ? { reportees: input.reportees } : {}),
    };
    await apiClient.post(BASE, payload);
  },

  async update(userId: string, input: UpdateProjectUserInput): Promise<void> {
    const payload: Record<string, unknown> = {
      ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
      ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.phoneNumber !== undefined ? { phoneNumber: input.phoneNumber } : {}),
      ...(input.designationId !== undefined
        ? { designation: input.designationId }
        : {}),
      ...(input.doj !== undefined
        ? { doj: input.doj }
        : {}),
      ...(input.udfs ?? {}),
      ...(input.reportees !== undefined ? { reportees: input.reportees } : {}),
    };
    await apiClient.patch(`${BASE}/${encodeURIComponent(userId)}`, payload);
  },

  async downloadTemplate(projectId: string): Promise<Blob> {
    return apiClient.getBlob(
      `${BASE}/bulk/template?projectId=${encodeURIComponent(projectId)}`,
    );
  },

  async bulkUpload(projectId: string, file: File): Promise<BulkUploadResult> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("projectId", projectId);
    return apiClient.postFormData<BulkUploadResult>(`${BASE}/bulk/excel`, formData);
  },

  async exportUsers(projectId: string): Promise<Blob> {
    return apiClient.getBlob(
      `${BASE}/bulk/export?projectId=${encodeURIComponent(projectId)}`,
    );
  },
};

export function getRuntimeStaticField(
  fields: UserStaticField[],
  fieldKey: string,
): UDFField | undefined {
  const index = fields.findIndex((field) => field.fieldKey === fieldKey);
  return index >= 0 ? staticFieldToRuntimeField(fields[index], index) : undefined;
}
