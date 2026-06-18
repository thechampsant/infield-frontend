/**
 * Form Builder API client — matches actual backend contract.
 */
import { apiClient } from "@/lib/api/api-client";

const BASE = "/api/v1/form-builder/configs";

// ─── API Types matching backend exactly ───────────────────────────────────

export interface ApiFormConfig {
  _id: string;
  projectId: string;
  name: string;
  status: "draft" | "published" | "archived";
  applicableDesignations: string[];
  editPermission: "editable" | "locked";
  editWindow?: "until_checkout" | "custom_hours" | "manager_approval";
  editWindowHours?: number;
  udfSchemaKey: string;
  parentConfigId?: string;
  publishedAt?: string;
  lastDraftSavedAt?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  // Fields come embedded in the config response (via UDF schema)
  fields?: ApiUdfField[];
}

export interface ApiUdfField {
  fieldKey: string;
  label: string;
  type: string; // e.g. "SHORT_TEXT", "PARAGRAPH", etc.
  config: Record<string, any>; // All field-specific configuration
  required: boolean;
  order: number;
  status: boolean;
  visibilityRules?: { dependsOnField: string; showWhen: any[] }[];
}

export interface ApiComponentEntry {
  key: string;
  displayName: string;
  category: string;
  defaultProperties: Record<string, any>;
}

export interface ApiComponentRegistry {
  core: ApiComponentEntry[];
  advanced: ApiComponentEntry[];
  layout: ApiComponentEntry[];
}

export interface ApiValidationDetail {
  fieldId: string | null;
  rule: string;
  message: string;
  severity: "error" | "warning";
}

export interface ApiPublishResult {
  status: "published" | "failed";
  errors: ApiValidationDetail[];
  warnings: ApiValidationDetail[];
  publishedAt?: string;
}

// ─── Request Payloads ─────────────────────────────────────────────────────

export interface UpdateSettingsPayload {
  name?: string;
  applicableDesignations?: string[];
  editPermission?: "editable" | "locked";
  editWindow?: "until_checkout" | "custom_hours" | "manager_approval";
  editWindowHours?: number;
}

export interface SaveDraftPayload {
  name?: string;
  applicableDesignations?: string[];
  editPermission?: string;
  editWindow?: string;
  editWindowHours?: number;
}

export interface AddFieldPayload {
  componentType: string;
  label?: string;
  parentFieldId?: string;
  insertAtOrder?: number;
}

export interface UpdateFieldPayload {
  label?: string;
  helpText?: string;
  content?: string;
  onLabel?: string;
  offLabel?: string;
  visibilityMode?: "always" | "conditional";
  visibilityRules?: { dependsOnFieldId: string; operator: string; value?: string }[];
  preFill?: { sourceType: string; sourceField: string } | null;
  isReadOnly?: boolean;
  validation?: Record<string, any>;
  options?: string[] | Record<string, any>;
  values?: string[];
  dataSource?: Record<string, any>;
  formula?: Record<string, any>;
  conditionGroups?: Record<string, any>[];
  buttonLabel?: string;
  minEntries?: number;
  maxEntries?: number;
}

export interface ReorderFieldsPayload {
  fieldIds: string[];
}

// ─── API Service ──────────────────────────────────────────────────────────

export const formBuilderApi = {
  // Component Registry
  getComponentRegistry(projectId: string): Promise<ApiComponentRegistry> {
    return apiClient.get<ApiComponentRegistry>(
      `${BASE}/component-registry?projectId=${encodeURIComponent(projectId)}`
    );
  },

  // Configs
  listConfigs(projectId: string): Promise<ApiFormConfig[]> {
    return apiClient.get<ApiFormConfig[]>(`${BASE}?projectId=${encodeURIComponent(projectId)}`);
  },

  createConfig(projectId: string): Promise<ApiFormConfig> {
    return apiClient.post<ApiFormConfig>(`${BASE}?projectId=${encodeURIComponent(projectId)}`);
  },

  getConfig(configId: string): Promise<ApiFormConfig> {
    return apiClient.get<ApiFormConfig>(`${BASE}/${encodeURIComponent(configId)}`);
  },

  cloneConfig(configId: string): Promise<ApiFormConfig> {
    return apiClient.post<ApiFormConfig>(`${BASE}/${encodeURIComponent(configId)}/clone`);
  },

  deleteConfig(configId: string, projectId: string): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(
      `${BASE}/${encodeURIComponent(configId)}?projectId=${encodeURIComponent(projectId)}`
    );
  },

  updateSettings(configId: string, payload: UpdateSettingsPayload): Promise<ApiFormConfig> {
    return apiClient.patch<ApiFormConfig>(
      `${BASE}/${encodeURIComponent(configId)}/settings`,
      payload
    );
  },

  saveDraft(configId: string, payload: SaveDraftPayload): Promise<{ lastDraftSavedAt: string }> {
    return apiClient.patch<{ lastDraftSavedAt: string }>(
      `${BASE}/${encodeURIComponent(configId)}/draft`,
      payload
    );
  },

  publish(configId: string): Promise<ApiPublishResult> {
    return apiClient.post<ApiPublishResult>(`${BASE}/${encodeURIComponent(configId)}/publish`);
  },

  editPublished(configId: string): Promise<ApiFormConfig> {
    return apiClient.post<ApiFormConfig>(`${BASE}/${encodeURIComponent(configId)}/edit-published`);
  },

  // Fields
  getFields(configId: string): Promise<ApiUdfField[]> {
    return apiClient.get<ApiUdfField[]>(`${BASE}/${encodeURIComponent(configId)}/fields`);
  },

  addField(configId: string, payload: AddFieldPayload): Promise<ApiUdfField> {
    return apiClient.post<ApiUdfField>(`${BASE}/${encodeURIComponent(configId)}/fields`, payload);
  },

  updateField(configId: string, fieldKey: string, payload: UpdateFieldPayload): Promise<ApiUdfField> {
    return apiClient.patch<ApiUdfField>(
      `${BASE}/${encodeURIComponent(configId)}/fields/${encodeURIComponent(fieldKey)}`,
      payload
    );
  },

  deleteField(configId: string, fieldKey: string): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(
      `${BASE}/${encodeURIComponent(configId)}/fields/${encodeURIComponent(fieldKey)}`
    );
  },

  duplicateField(configId: string, fieldKey: string): Promise<ApiUdfField> {
    return apiClient.post<ApiUdfField>(
      `${BASE}/${encodeURIComponent(configId)}/fields/${encodeURIComponent(fieldKey)}/duplicate`
    );
  },

  reorderFields(configId: string, fieldIds: string[]): Promise<{ success: boolean }> {
    return apiClient.patch<{ success: boolean }>(
      `${BASE}/${encodeURIComponent(configId)}/fields/reorder`,
      { fieldIds }
    );
  },

  saveSchema(configId: string, fields: any[]): Promise<any> {
    return apiClient.post<any>(
      `${BASE}/${encodeURIComponent(configId)}/fields/save-schema`,
      { fields }
    );
  },
};
