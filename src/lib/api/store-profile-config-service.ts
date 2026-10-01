import { apiClient } from "./api-client";

const BASE = "/api/v1/store-profile";

/** Catalog id for the Module Configuration card. */
export const STORE_PROFILE_MODULE_KEY = "store-profile";

/** Per-config feature-config key. Mirrors salesConfigModuleKey. */
export function storeProfileConfigModuleKey(configId: string): string {
  return `store_profile_config_${configId}`;
}

export type StoreProfileFieldSource = "STATIC" | "UDF";

/** A Store Master field available for selection. */
export interface StoreProfileFieldOption {
  fieldKey: string;
  label: string;
  type: string;
  source: StoreProfileFieldSource;
  required: boolean;
}

/** A field the admin has selected. Array position is the order. */
export interface StoreProfileField {
  fieldKey: string;
  headerName: string;
  fieldType: string;
  source: StoreProfileFieldSource;
  order: number;
}

export interface StoreProfileConfiguration {
  id: string;
  projectId: string;
  name: string;
  applicableDesignations: string[];
  selectedFields: StoreProfileField[];
  isEnabled: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaveStoreProfileConfigurationInput {
  projectId?: string;
  name: string;
  applicableDesignations: string[];
  selectedFields: StoreProfileField[];
}

type RawRecord = Record<string, unknown>;

function record(value: unknown): RawRecord {
  return value && typeof value === "object" ? (value as RawRecord) : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function bool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function source(value: unknown): StoreProfileFieldSource {
  return String(value).toUpperCase() === "UDF" ? "UDF" : "STATIC";
}

/**
 * Normalizes the stored field list so that ARRAY POSITION is authoritative in
 * the UI: sort by whatever `order` arrived, then re-index 1..n. Everything
 * downstream (drag reorder, move buttons, save) relies on that invariant.
 *
 * Tolerates a bare string[] of field keys as well as objects.
 */
export function normalizeStoreProfileFields(value: unknown): StoreProfileField[] {
  const rows = Array.isArray(value) ? value : [];

  return rows
    .map((item, index) => {
      if (typeof item === "string") {
        return {
          fieldKey: item,
          headerName: item,
          fieldType: "STRING",
          source: "UDF" as StoreProfileFieldSource,
          order: index + 1,
        };
      }
      const raw = record(item);
      const rawOrder = Number(raw.order);
      return {
        fieldKey: text(raw.fieldKey),
        headerName: text(raw.headerName) || text(raw.label) || text(raw.fieldKey),
        fieldType: text(raw.fieldType) || text(raw.type) || "STRING",
        source: source(raw.source),
        // Missing / non-numeric order sorts last but stays stable by position.
        order: Number.isFinite(rawOrder) && rawOrder > 0 ? rawOrder : Number.MAX_SAFE_INTEGER - rows.length + index,
      };
    })
    .filter((field) => field.fieldKey.length > 0)
    .sort((a, b) => a.order - b.order)
    .map((field, index) => ({ ...field, order: index + 1 }));
}

export function normalizeStoreProfileConfiguration(value: unknown): StoreProfileConfiguration {
  const raw = record(value);
  return {
    id: text(raw._id) || text(raw.id),
    projectId: text(raw.projectId),
    name: text(raw.name),
    applicableDesignations: Array.isArray(raw.applicableDesignations)
      // Filter BEFORE stringifying: String(null) is the truthy "null", which a
      // trailing .filter(Boolean) would happily send back as a designation id.
      ? raw.applicableDesignations
          .filter((id) => id !== null && id !== undefined)
          .map((id) => String(id))
          .filter((id) => id.length > 0)
      : [],
    selectedFields: normalizeStoreProfileFields(raw.selectedFields),
    isEnabled: bool(raw.isEnabled, false),
    isActive: bool(raw.isActive, true),
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : undefined,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : undefined,
  };
}

export function normalizeStoreProfileFieldOption(value: unknown): StoreProfileFieldOption {
  const raw = record(value);
  return {
    fieldKey: text(raw.fieldKey),
    label: text(raw.label) || text(raw.fieldKey),
    type: text(raw.type) || "STRING",
    source: source(raw.source),
    required: bool(raw.required, false),
  };
}

/**
 * Stamps contiguous 1-based order from array position, discarding whatever the
 * caller supplied. Exported so it is testable without importing the page.
 */
export function buildStoreProfilePayload(
  input: SaveStoreProfileConfigurationInput,
): Record<string, unknown> {
  return {
    ...(input.projectId ? { projectId: input.projectId } : {}),
    name: input.name.trim(),
    applicableDesignations: input.applicableDesignations,
    selectedFields: input.selectedFields.map((field, index) => ({
      fieldKey: field.fieldKey,
      order: index + 1,
    })),
  };
}

function withProject(path: string, projectId: string): string {
  return `${path}?projectId=${encodeURIComponent(projectId)}`;
}

export const storeProfileConfigService = {
  async list(projectId: string): Promise<StoreProfileConfiguration[]> {
    const result = await apiClient.get<unknown>(withProject(`${BASE}/configurations`, projectId));
    return Array.isArray(result) ? result.map(normalizeStoreProfileConfiguration) : [];
  },

  async get(id: string, projectId: string): Promise<StoreProfileConfiguration> {
    const result = await apiClient.get<unknown>(
      withProject(`${BASE}/configurations/${encodeURIComponent(id)}`, projectId),
    );
    return normalizeStoreProfileConfiguration(result);
  },

  /** Every Store Master field an admin may put on the profile tab. */
  async getFieldCatalogue(projectId: string): Promise<StoreProfileFieldOption[]> {
    const result = await apiClient.get<unknown>(
      withProject(`${BASE}/configurations/field-catalogue`, projectId),
    );
    const fields = record(result).fields;
    return Array.isArray(fields) ? fields.map(normalizeStoreProfileFieldOption) : [];
  },

  async create(
    input: SaveStoreProfileConfigurationInput & { projectId: string },
  ): Promise<StoreProfileConfiguration> {
    const result = await apiClient.post<unknown>(
      `${BASE}/configurations`,
      buildStoreProfilePayload(input),
    );
    return normalizeStoreProfileConfiguration(result);
  },

  async update(
    id: string,
    projectId: string,
    input: SaveStoreProfileConfigurationInput,
  ): Promise<StoreProfileConfiguration> {
    const result = await apiClient.patch<unknown>(
      withProject(`${BASE}/configurations/${encodeURIComponent(id)}`, projectId),
      buildStoreProfilePayload({ ...input, projectId: undefined }),
    );
    return normalizeStoreProfileConfiguration(result);
  },

  async clone(id: string, projectId: string): Promise<StoreProfileConfiguration> {
    const result = await apiClient.post<unknown>(
      withProject(`${BASE}/configurations/${encodeURIComponent(id)}/clone`, projectId),
    );
    return normalizeStoreProfileConfiguration(result);
  },

  async remove(id: string, projectId: string): Promise<void> {
    await apiClient.delete(withProject(`${BASE}/configurations/${encodeURIComponent(id)}`, projectId));
  },

  async activateConfiguration(id: string, projectId: string): Promise<void> {
    await apiClient.put(
      withProject(`${BASE}/configurations/${encodeURIComponent(id)}/activate`, projectId),
      {},
    );
  },

  /** Disabling routes through feature-config, as Sales does. */
  async deactivateConfiguration(id: string, projectId: string): Promise<void> {
    await apiClient.put(
      `/api/v1/feature-config/${encodeURIComponent(projectId)}/module/${encodeURIComponent(
        storeProfileConfigModuleKey(id),
      )}`,
      { isActive: false },
    );
  },
};
