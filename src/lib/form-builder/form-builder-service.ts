/**
 * Form Builder service layer.
 * Uses real API via formBuilderApi + mapper, with mock fallback when
 * NEXT_PUBLIC_USE_MOCK_API=true.
 *
 * Key difference from old implementation:
 * - Fields come embedded in config response (via UDF schema)
 * - saveDraft only saves config metadata, NOT fields
 * - Field CRUD uses fieldKey in the URL path
 */

import type { ComponentType, FormConfiguration, FormField } from "./types";
import { formBuilderApi } from "./form-builder-api";
import type { ApiPublishResult } from "./form-builder-api";
import {
  mapApiConfigToFrontend,
  mapApiConfigToFrontendListItem,
  mapUdfFieldToFrontend,
  mapFrontendFieldToUpdatePayload,
  mapSettingsToApiPayload,
  mapConfigToDraftPayload,
  mapFieldsToSaveSchemaPayload,
  frontendComponentTypeToApi,
} from "./form-builder-mapper";
import { MOCK_CONFIGURATIONS, getDefaultFields } from "./mock-data";

// ─── Mock Mode Toggle ─────────────────────────────────────────────────────

const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API === "true";

// ─── Mock In-Memory Store (used only when USE_MOCK_API=true) ──────────────

const STORAGE_KEY_PREFIX = "form-builder-configs";

function getStorageKey(projectId: string): string {
  return `${STORAGE_KEY_PREFIX}-${projectId}`;
}

let inMemoryStore: Map<string, FormConfiguration[]> = new Map();

function delay(ms: number = 75): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadFromStorage(projectId: string): FormConfiguration[] {
  if (inMemoryStore.has(projectId)) {
    return inMemoryStore.get(projectId)!;
  }

  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(getStorageKey(projectId));
      if (stored) {
        const configs = JSON.parse(stored) as FormConfiguration[];
        inMemoryStore.set(projectId, configs);
        return configs;
      }
    } catch {
      // fall through
    }
  }

  const defaults = structuredClone(MOCK_CONFIGURATIONS);
  inMemoryStore.set(projectId, defaults);
  persistToStorage(projectId, defaults);
  return defaults;
}

function persistToStorage(projectId: string, configs: FormConfiguration[]): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(getStorageKey(projectId), JSON.stringify(configs));
    } catch {
      // Quota exceeded — silently fail
    }
  }
}

function findProjectIdForConfig(configId: string): string | null {
  for (const [projectId, configs] of inMemoryStore.entries()) {
    if (configs.some((c) => c.id === configId)) {
      return projectId;
    }
  }
  if (typeof window !== "undefined") {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_KEY_PREFIX)) {
        try {
          const configs = JSON.parse(localStorage.getItem(key)!) as FormConfiguration[];
          if (configs.some((c) => c.id === configId)) {
            const projectId = key.replace(`${STORAGE_KEY_PREFIX}-`, "");
            inMemoryStore.set(projectId, configs);
            return projectId;
          }
        } catch {
          continue;
        }
      }
    }
  }
  return null;
}

// ─── Publish Result Type ──────────────────────────────────────────────────

export interface PublishResult {
  status: "published" | "failed";
  errors: { fieldId: string | null; rule: string; message: string; severity: "error" | "warning" }[];
  warnings: { fieldId: string | null; rule: string; message: string; severity: "error" | "warning" }[];
  publishedAt?: string;
}

// ─── Service ──────────────────────────────────────────────────────────────

export const formBuilderService = {
  /**
   * Get all form configurations for a project (list page).
   * Does NOT fetch fields — returns configs with empty fields array.
   */
  async getConfigurations(projectId: string): Promise<FormConfiguration[]> {
    if (USE_MOCK_API) {
      await delay();
      return structuredClone(loadFromStorage(projectId));
    }

    const apiConfigs = await formBuilderApi.listConfigs(projectId);
    return apiConfigs.map(mapApiConfigToFrontendListItem);
  },

  /**
   * Get a single form configuration by ID (detail/editor page).
   * Fetches BOTH config AND fields, then combines them.
   */
  async getConfiguration(configId: string): Promise<FormConfiguration> {
    if (USE_MOCK_API) {
      await delay();
      const projectId = findProjectIdForConfig(configId);
      if (!projectId) throw new Error(`Configuration not found: ${configId}`);
      const configs = loadFromStorage(projectId);
      const config = configs.find((c) => c.id === configId);
      if (!config) throw new Error(`Configuration not found: ${configId}`);
      return structuredClone(config);
    }

    const [apiConfig, apiFields] = await Promise.all([
      formBuilderApi.getConfig(configId),
      formBuilderApi.getFields(configId),
    ]);
    return mapApiConfigToFrontend(apiConfig, apiFields);
  },

  /**
   * Create a new form configuration.
   * After creation, fetches the auto-generated sample fields.
   */
  async createConfiguration(projectId: string): Promise<FormConfiguration> {
    if (USE_MOCK_API) {
      await delay();
      const configs = loadFromStorage(projectId);
      const now = new Date().toISOString();
      const newConfig: FormConfiguration = {
        id: crypto.randomUUID(),
        name: "Untitled Form",
        designations: [],
        editPermission: "editable",
        editWindow: "custom-hours",
        editWindowHours: 24,
        fields: getDefaultFields(),
        status: "draft",
        createdAt: now,
        updatedAt: now,
      };
      configs.push(newConfig);
      inMemoryStore.set(projectId, configs);
      persistToStorage(projectId, configs);
      return structuredClone(newConfig);
    }

    const apiConfig = await formBuilderApi.createConfig(projectId);
    const apiFields = await formBuilderApi.getFields(apiConfig._id);
    return mapApiConfigToFrontend(apiConfig, apiFields);
  },

  /**
   * Clone a form configuration.
   * After cloning, fetches the fields for the new config.
   */
  async cloneConfiguration(configId: string): Promise<FormConfiguration> {
    if (USE_MOCK_API) {
      await delay();
      const projectId = findProjectIdForConfig(configId);
      if (!projectId) throw new Error(`Configuration not found: ${configId}`);
      const configs = loadFromStorage(projectId);
      const source = configs.find((c) => c.id === configId);
      if (!source) throw new Error(`Configuration not found: ${configId}`);

      const now = new Date().toISOString();
      const cloned: FormConfiguration = {
        ...structuredClone(source),
        id: crypto.randomUUID(),
        name: `${source.name} (Copy)`.slice(0, 100),
        status: "draft",
        createdAt: now,
        updatedAt: now,
        fields: source.fields.map((field) => ({
          ...structuredClone(field),
          id: crypto.randomUUID(),
        })),
      };

      // Fix parent references
      const oldToNewId = new Map<string, string>();
      source.fields.forEach((orig, i) => {
        oldToNewId.set(orig.id, cloned.fields[i].id);
      });
      cloned.fields = cloned.fields.map((field) => ({
        ...field,
        parentId: field.parentId ? (oldToNewId.get(field.parentId) ?? field.parentId) : null,
        visibilityRules: field.visibilityRules.map((rule) => ({
          ...rule,
          id: crypto.randomUUID(),
          sourceFieldId: oldToNewId.get(rule.sourceFieldId) ?? rule.sourceFieldId,
        })),
        requiredRules: field.requiredRules.map((rule) => ({
          ...rule,
          id: crypto.randomUUID(),
          sourceFieldId: oldToNewId.get(rule.sourceFieldId) ?? rule.sourceFieldId,
        })),
        conditionRules: field.conditionRules.map((rule) => ({
          ...rule,
          id: crypto.randomUUID(),
          sourceFieldId: oldToNewId.get(rule.sourceFieldId) ?? rule.sourceFieldId,
        })),
      }));

      configs.push(cloned);
      inMemoryStore.set(projectId, configs);
      persistToStorage(projectId, configs);
      return structuredClone(cloned);
    }

    const apiConfig = await formBuilderApi.cloneConfig(configId);
    const apiFields = await formBuilderApi.getFields(apiConfig._id);
    return mapApiConfigToFrontend(apiConfig, apiFields);
  },

  /**
   * Delete a form configuration.
   */
  async deleteConfiguration(configId: string, projectId?: string): Promise<void> {
    if (USE_MOCK_API) {
      await delay();
      const pid = projectId ?? findProjectIdForConfig(configId);
      if (!pid) throw new Error(`Configuration not found: ${configId}`);
      const configs = loadFromStorage(pid);
      if (configs.length <= 1) {
        throw new Error("Cannot delete the last configuration. At least one configuration is required.");
      }
      const index = configs.findIndex((c) => c.id === configId);
      if (index === -1) throw new Error(`Configuration not found: ${configId}`);
      configs.splice(index, 1);
      inMemoryStore.set(pid, configs);
      persistToStorage(pid, configs);
      return;
    }

    if (!projectId) {
      throw new Error("projectId is required for deleteConfiguration in API mode");
    }
    await formBuilderApi.deleteConfig(configId, projectId);
  },

  /**
   * Update config settings (name, designations, editPermission, editWindow).
   * Calls PATCH /configs/{configId}/settings.
   */
  async updateConfiguration(
    configId: string,
    data: Partial<FormConfiguration>
  ): Promise<FormConfiguration> {
    if (USE_MOCK_API) {
      await delay();
      const projectId = findProjectIdForConfig(configId);
      if (!projectId) throw new Error(`Configuration not found: ${configId}`);
      const configs = loadFromStorage(projectId);
      const index = configs.findIndex((c) => c.id === configId);
      if (index === -1) throw new Error(`Configuration not found: ${configId}`);
      const updated: FormConfiguration = {
        ...configs[index],
        ...data,
        id: configId,
        updatedAt: new Date().toISOString(),
      };
      configs[index] = updated;
      inMemoryStore.set(projectId, configs);
      persistToStorage(projectId, configs);
      return structuredClone(updated);
    }

    const payload = mapSettingsToApiPayload(data);
    const apiConfig = await formBuilderApi.updateSettings(configId, payload);
    const apiFields = await formBuilderApi.getFields(apiConfig._id);
    return mapApiConfigToFrontend(apiConfig, apiFields);
  },

  /**
   * Publish a form configuration.
   */
  async publishConfiguration(configId: string): Promise<PublishResult> {
    if (USE_MOCK_API) {
      await delay();
      const projectId = findProjectIdForConfig(configId);
      if (!projectId) throw new Error(`Configuration not found: ${configId}`);
      const configs = loadFromStorage(projectId);
      const index = configs.findIndex((c) => c.id === configId);
      if (index === -1) throw new Error(`Configuration not found: ${configId}`);
      const now = new Date().toISOString();
      configs[index] = { ...configs[index], status: "published", updatedAt: now };
      inMemoryStore.set(projectId, configs);
      persistToStorage(projectId, configs);
      return { status: "published", errors: [], warnings: [], publishedAt: now };
    }

    const result: ApiPublishResult = await formBuilderApi.publish(configId);
    return {
      status: result.status,
      errors: result.errors,
      warnings: result.warnings,
      publishedAt: result.publishedAt,
    };
  },

  /**
   * Save draft — saves config metadata only (NOT fields).
   * Returns the timestamp of the saved draft.
   */
  async saveDraft(configId: string, metadata: Partial<FormConfiguration>): Promise<string> {
    if (USE_MOCK_API) {
      await delay();
      const projectId = findProjectIdForConfig(configId);
      if (!projectId) throw new Error(`Configuration not found: ${configId}`);
      const configs = loadFromStorage(projectId);
      const index = configs.findIndex((c) => c.id === configId);
      if (index === -1) throw new Error(`Configuration not found: ${configId}`);
      const now = new Date().toISOString();
      configs[index] = {
        ...configs[index],
        ...metadata,
        id: configId,
        updatedAt: now,
      };
      inMemoryStore.set(projectId, configs);
      persistToStorage(projectId, configs);
      return now;
    }

    const payload = mapConfigToDraftPayload(metadata);
    const result = await formBuilderApi.saveDraft(configId, payload);
    return result.lastDraftSavedAt;
  },

  // ─── Field CRUD ─────────────────────────────────────────────────────────

  /**
   * Add a new field to a config.
   */
  async addField(
    configId: string,
    componentType: ComponentType,
    options?: { parentFieldId?: string; insertAtOrder?: number; label?: string }
  ): Promise<FormField> {
    if (USE_MOCK_API) {
      await delay();
      const projectId = findProjectIdForConfig(configId);
      if (!projectId) throw new Error(`Configuration not found: ${configId}`);
      const configs = loadFromStorage(projectId);
      const index = configs.findIndex((c) => c.id === configId);
      if (index === -1) throw new Error(`Configuration not found: ${configId}`);

      const newField: FormField = {
        id: crypto.randomUUID(),
        type: componentType,
        label: options?.label ?? "New Field",
        helpText: "",
        parentId: options?.parentFieldId ?? null,
        order: options?.insertAtOrder ?? configs[index].fields.length,
        visibility: "always",
        visibilityRules: [],
        readOnly: false,
        prefillSource: null,
        prefillField: "",
        prefillCustomValue: "",
        required: "no",
        requiredRules: [],
        typeConfig: {},
        optionsSource: null,
        manualOptions: [],
        excelOptionsCount: 0,
        masterEntity: "",
        masterField: "",
        mappingParentField: "",
        dataSource: null,
        formula: "",
        formulaResultFormat: "number",
        sectionLabel: "",
        addMoreLabel: "",
        addMoreMin: 1,
        addMoreMax: 5,
        toggleOnLabel: "Yes",
        toggleOffLabel: "No",
        conditionAction: "show",
        conditionRules: [],
      };

      configs[index].fields.push(newField);
      configs[index].updatedAt = new Date().toISOString();
      inMemoryStore.set(projectId, configs);
      persistToStorage(projectId, configs);
      return structuredClone(newField);
    }

    const apiField = await formBuilderApi.addField(configId, {
      componentType: frontendComponentTypeToApi(componentType),
      label: options?.label,
      parentFieldId: options?.parentFieldId,
      insertAtOrder: options?.insertAtOrder,
    });
    return mapUdfFieldToFrontend(apiField);
  },

  /**
   * Update a single field in a config.
   * Uses fieldKey in the URL path.
   */
  async updateField(
    configId: string,
    fieldKey: string,
    changes: Partial<FormField>
  ): Promise<FormField> {
    if (USE_MOCK_API) {
      await delay();
      const projectId = findProjectIdForConfig(configId);
      if (!projectId) throw new Error(`Configuration not found: ${configId}`);
      const configs = loadFromStorage(projectId);
      const configIndex = configs.findIndex((c) => c.id === configId);
      if (configIndex === -1) throw new Error(`Configuration not found: ${configId}`);
      const fieldIndex = configs[configIndex].fields.findIndex((f) => f.id === fieldKey);
      if (fieldIndex === -1) throw new Error(`Field not found: ${fieldKey}`);

      const updatedField = { ...configs[configIndex].fields[fieldIndex], ...changes, id: fieldKey };
      configs[configIndex].fields[fieldIndex] = updatedField;
      configs[configIndex].updatedAt = new Date().toISOString();
      inMemoryStore.set(projectId, configs);
      persistToStorage(projectId, configs);
      return structuredClone(updatedField);
    }

    const payload = mapFrontendFieldToUpdatePayload(changes);
    const apiField = await formBuilderApi.updateField(configId, fieldKey, payload);
    return mapUdfFieldToFrontend(apiField);
  },

  /**
   * Delete a field from a config.
   * Uses fieldKey in the URL path.
   */
  async deleteField(configId: string, fieldKey: string): Promise<void> {
    if (USE_MOCK_API) {
      await delay();
      const projectId = findProjectIdForConfig(configId);
      if (!projectId) throw new Error(`Configuration not found: ${configId}`);
      const configs = loadFromStorage(projectId);
      const configIndex = configs.findIndex((c) => c.id === configId);
      if (configIndex === -1) throw new Error(`Configuration not found: ${configId}`);
      configs[configIndex].fields = configs[configIndex].fields.filter((f) => f.id !== fieldKey);
      configs[configIndex].updatedAt = new Date().toISOString();
      inMemoryStore.set(projectId, configs);
      persistToStorage(projectId, configs);
      return;
    }

    const res = await formBuilderApi.deleteField(configId, fieldKey);

    console.log(res);
  },

  /**
   * Duplicate a field within a config.
   * Uses fieldKey in the URL path.
   */
  async duplicateField(configId: string, fieldKey: string): Promise<FormField> {
    if (USE_MOCK_API) {
      await delay();
      const projectId = findProjectIdForConfig(configId);
      if (!projectId) throw new Error(`Configuration not found: ${configId}`);
      const configs = loadFromStorage(projectId);
      const configIndex = configs.findIndex((c) => c.id === configId);
      if (configIndex === -1) throw new Error(`Configuration not found: ${configId}`);
      const sourceField = configs[configIndex].fields.find((f) => f.id === fieldKey);
      if (!sourceField) throw new Error(`Field not found: ${fieldKey}`);

      const duplicated: FormField = {
        ...structuredClone(sourceField),
        id: crypto.randomUUID(),
        label: `${sourceField.label} (Copy)`,
        order: sourceField.order + 1,
      };

      // Shift orders of subsequent fields
      configs[configIndex].fields = configs[configIndex].fields.map((f) =>
        f.order > sourceField.order ? { ...f, order: f.order + 1 } : f
      );
      configs[configIndex].fields.push(duplicated);
      configs[configIndex].updatedAt = new Date().toISOString();
      inMemoryStore.set(projectId, configs);
      persistToStorage(projectId, configs);
      return structuredClone(duplicated);
    }

    const apiField = await formBuilderApi.duplicateField(configId, fieldKey);
    return mapUdfFieldToFrontend(apiField);
  },

  /**
   * Reorder fields within a config.
   */
  async reorderFields(configId: string, fieldIds: string[]): Promise<void> {
    if (USE_MOCK_API) {
      await delay();
      const projectId = findProjectIdForConfig(configId);
      if (!projectId) throw new Error(`Configuration not found: ${configId}`);
      const configs = loadFromStorage(projectId);
      const configIndex = configs.findIndex((c) => c.id === configId);
      if (configIndex === -1) throw new Error(`Configuration not found: ${configId}`);

      // Re-assign order based on the new fieldIds array
      const fieldMap = new Map(configs[configIndex].fields.map((f) => [f.id, f]));
      configs[configIndex].fields = fieldIds
        .map((id, idx) => {
          const field = fieldMap.get(id);
          if (field) return { ...field, order: idx };
          return null;
        })
        .filter((f): f is FormField => f !== null);

      configs[configIndex].updatedAt = new Date().toISOString();
      inMemoryStore.set(projectId, configs);
      persistToStorage(projectId, configs);
      return;
    }

    await formBuilderApi.reorderFields(configId, fieldIds);
  },

  /**
   * Save all fields in bulk via save-schema, then publish the config.
   * Used by "Save & Publish" buttons.
   */
  async saveSchemaAndPublish(configId: string, fields: FormField[]): Promise<PublishResult> {
    if (USE_MOCK_API) {
      await delay();
      return { status: "published", errors: [], warnings: [], publishedAt: new Date().toISOString() };
    }

    // Step 1: Save all fields in bulk
    const schemaPayload = mapFieldsToSaveSchemaPayload(fields);
    await formBuilderApi.saveSchema(configId, schemaPayload);

    // Step 2: Publish
    const result = await formBuilderApi.publish(configId);
    return {
      status: result.status,
      errors: result.errors ?? [],
      warnings: result.warnings ?? [],
      publishedAt: result.publishedAt,
    };
  },

  /**
   * Get the component registry for a project.
   */
  async getComponentRegistry(projectId: string) {
    if (USE_MOCK_API) {
      await delay();
      return null; // Mock doesn't have a registry
    }

    return formBuilderApi.getComponentRegistry(projectId);
  },
};
