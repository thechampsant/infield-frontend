import { ApiError, apiClient } from "./api-client";
import { unwrapApiData } from "./api-response";
import type { UdfFieldConfig, UdfFieldType, UdfSchemaField } from "./udf-config-service";

const BASE = "/api/v1/claims-config";
const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API === "true";

export type ClaimCapType = "fixed" | "conditional" | "no-cap";
export type ClaimApprovalMode = "App" | "Web" | "Both";

export interface ClaimsBackdateConfig {
  isEnabled: boolean;
  allowedDays: number;
}

export interface ClaimConditionalCapCondition {
  conditionField: string;
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "nin";
  conditionValue: string;
  capAmount: number;
  order: number;
}

export interface ClaimConditionalCap {
  defaultCap: number;
  conditions: ClaimConditionalCapCondition[];
}

export interface ClaimApprovalLevel {
  order: number;
  designationId: string;
  mode: ClaimApprovalMode;
}

export interface ClaimApprovalWorkflow {
  isEnabled: boolean;
  levels: ClaimApprovalLevel[];
}

export interface ClaimPerKmRateConfig {
  isEnabled: boolean;
  ratePerKm?: number;
  kmFieldKey?: string;
}

export interface ClaimTypeDefinition {
  id: string;
  name: string;
  isActive: boolean;
  capType: ClaimCapType;
  fixedCap?: number;
  conditionalCap?: ClaimConditionalCap;
  udfSchemaKey: string;
  iconUrl?: string;
  approvalWorkflow?: ClaimApprovalWorkflow;
  perKmRateConfig?: ClaimPerKmRateConfig;
}

export interface ClaimsConfigDocument {
  id: string;
  projectId: string;
  designationId: string;
  isModuleEnabled: boolean;
  backdateConfig?: ClaimsBackdateConfig;
  claimTypes: ClaimTypeDefinition[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ClaimsTemplateDocument {
  id: string;
  projectId: string;
  isTemplate: boolean;
  templateName: string;
  designationId?: string;
  applicableDesignations: string[];
  isModuleEnabled: boolean;
  backdateConfig?: ClaimsBackdateConfig;
  claimTypes: ClaimTypeDefinition[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SaveClaimsConfigInput {
  projectId: string;
  designationId: string;
  isModuleEnabled?: boolean;
  backdateConfig?: ClaimsBackdateConfig;
}

export interface SaveClaimTypeInput {
  projectId: string;
  designationId?: string;
  templateId?: string;
  name: string;
  isActive?: boolean;
  capType: ClaimCapType;
  fixedCap?: number;
  conditionalCap?: ClaimConditionalCap;
  approvalWorkflow?: ClaimApprovalWorkflow;
  iconUrl?: string;
  perKmRateConfig?: ClaimPerKmRateConfig;
}

export interface ClaimTypeCreateResponse {
  claimTypeId: string;
  udfSchemaKey: string;
  config?: ClaimsConfigDocument | ClaimsTemplateDocument;
}

export interface SaveClaimSchemaInput {
  projectId: string;
  schemaKey: string;
  fields: UdfSchemaField[];
}

export interface ClaimSchemaDocument {
  projectId: string;
  schemaKey: string;
  fields: UdfSchemaField[];
}

type RawRecord = Record<string, unknown>;

const mockConfigStore = new Map<string, ClaimsConfigDocument>();
const mockTemplateStore = new Map<string, ClaimsTemplateDocument>();
const mockSchemaStore = new Map<string, ClaimSchemaDocument>();
const mockClaimTypeCounters = new Map<string, number>();
const mockTemplateCounters = new Map<string, number>();

function delay(ms = 250): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function configKey(projectId: string, designationId: string): string {
  return `${projectId}:${designationId}`;
}

function schemaKey(projectId: string, key: string): string {
  return `${projectId}:${key}`;
}

function claimTypeSeq(projectId: string, designationId: string): number {
  const key = configKey(projectId, designationId);
  const next = (mockClaimTypeCounters.get(key) ?? 0) + 1;
  mockClaimTypeCounters.set(key, next);
  return next;
}

function templateSeq(projectId: string): number {
  const next = (mockTemplateCounters.get(projectId) ?? 0) + 1;
  mockTemplateCounters.set(projectId, next);
  return next;
}

function asRecord(value: unknown): RawRecord {
  return (value ?? {}) as RawRecord;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function booleanValue(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeClaimCapType(value: unknown): ClaimCapType {
  const raw = stringValue(value).toLowerCase();
  if (raw === "fixed" || raw === "conditional" || raw === "no-cap") return raw;
  return "fixed";
}

function normalizeFieldType(value: unknown): UdfFieldType {
  const raw = stringValue(value).toUpperCase();
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

function normalizeSchemaField(rawValue: unknown, index: number): UdfSchemaField {
  const raw = asRecord(rawValue);
  return {
    fieldKey: stringValue(raw.fieldKey) || `field_${index + 1}`,
    label: stringValue(raw.label) || `Field ${index + 1}`,
    type: normalizeFieldType(raw.type),
    config: normalizeFieldConfig(raw.config),
    required: booleanValue(raw.required),
    order: numberValue(raw.order) ?? index + 1,
    status: booleanValue(raw.status, true),
    summaryKey: booleanValue(raw.summaryKey),
  };
}

function normalizeBackdateConfig(value: unknown): ClaimsBackdateConfig | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const raw = asRecord(value);
  return {
    isEnabled: booleanValue(raw.isEnabled),
    allowedDays: numberValue(raw.allowedDays) ?? 0,
  };
}

function normalizeConditionalCap(value: unknown): ClaimConditionalCap | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const raw = asRecord(value);
  const conditions = Array.isArray(raw.conditions)
    ? raw.conditions.map((item, index) => {
        const condition = asRecord(item);
        return {
          conditionField: stringValue(condition.conditionField),
          operator: (stringValue(condition.operator) || "eq") as ClaimConditionalCapCondition["operator"],
          conditionValue:
            typeof condition.conditionValue === "string" || typeof condition.conditionValue === "number"
              ? String(condition.conditionValue)
              : "",
          capAmount: numberValue(condition.capAmount) ?? 0,
          order: numberValue(condition.order) ?? index + 1,
        };
      })
    : [];

  return {
    defaultCap: numberValue(raw.defaultCap) ?? 0,
    conditions,
  };
}

function normalizeApprovalWorkflow(value: unknown): ClaimApprovalWorkflow | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const raw = asRecord(value);
  const levels = Array.isArray(raw.levels)
    ? raw.levels.map((item, index) => {
        const level = asRecord(item);
        return {
          order: numberValue(level.order) ?? index + 1,
          designationId: stringValue(level.designationId),
          mode: (stringValue(level.mode) || "Both") as ClaimApprovalMode,
        };
      })
    : [];

  return {
    isEnabled: booleanValue(raw.isEnabled, levels.length > 0),
    levels,
  };
}

function normalizePerKmRateConfig(value: unknown): ClaimPerKmRateConfig | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const raw = asRecord(value);
  const isEnabled = booleanValue(raw.isEnabled);
  if (!isEnabled) return { isEnabled: false };
  return {
    isEnabled: true,
    ratePerKm: numberValue(raw.ratePerKm),
    kmFieldKey: stringValue(raw.kmFieldKey) || undefined,
  };
}

function normalizeClaimType(rawValue: unknown, projectId: string, designationId: string): ClaimTypeDefinition {
  const raw = asRecord(rawValue);
  const id = stringValue(raw._id) || stringValue(raw.id) || stringValue(raw.claimTypeId);
  const name = stringValue(raw.name);
  const schema =
    stringValue(raw.udfSchemaKey) ||
    `${projectId}_${designationId}_${id || name.toLowerCase().replace(/\s+/g, "_")}`;

  return {
    id: id || schema,
    name,
    isActive: booleanValue(raw.isActive, true),
    capType: normalizeClaimCapType(raw.capType),
    fixedCap: numberValue(raw.fixedCap),
    conditionalCap: normalizeConditionalCap(raw.conditionalCap),
    udfSchemaKey: schema,
    iconUrl: stringValue(raw.iconUrl) || undefined,
    approvalWorkflow: normalizeApprovalWorkflow(raw.approvalWorkflow),
    perKmRateConfig: normalizePerKmRateConfig(raw.perKmRateConfig),
  };
}

function normalizeClaimsConfig(
  payload: unknown,
  fallback: { projectId: string; designationId: string },
): ClaimsConfigDocument {
  const data = unwrapApiData(payload) as RawRecord | undefined;
  const raw = asRecord(data ?? payload);
  const claimTypesRaw = Array.isArray(raw.claimTypes) ? raw.claimTypes : [];

  return {
    id: stringValue(raw._id) || stringValue(raw.id) || configKey(fallback.projectId, fallback.designationId),
    projectId: stringValue(raw.projectId) || fallback.projectId,
    designationId: stringValue(raw.designationId) || fallback.designationId,
    isModuleEnabled: booleanValue(raw.isModuleEnabled),
    backdateConfig: normalizeBackdateConfig(raw.backdateConfig),
    claimTypes: claimTypesRaw.map((item) =>
      normalizeClaimType(item, fallback.projectId, fallback.designationId),
    ),
    createdAt: stringValue(raw.createdAt) || undefined,
    updatedAt: stringValue(raw.updatedAt) || undefined,
  };
}

function normalizeClaimsTemplate(
  payload: unknown,
  fallback: { projectId: string },
): ClaimsTemplateDocument {
  const data = unwrapApiData(payload) as RawRecord | undefined;
  const raw = asRecord(data ?? payload);
  const claimTypesRaw = Array.isArray(raw.claimTypes) ? raw.claimTypes : [];
  const isTemplate = booleanValue(raw.isTemplate, true);
  const designationId = stringValue(raw.designationId);
  const applicableDesignations = Array.isArray(raw.applicableDesignations)
    ? raw.applicableDesignations.map((item) => stringValue(item)).filter(Boolean)
    : designationId
      ? [designationId]
      : [];
  const id = stringValue(raw._id) || stringValue(raw.id) || `template_${fallback.projectId}`;
  const ownerId = isTemplate ? id : designationId || id;

  return {
    id,
    projectId: stringValue(raw.projectId) || fallback.projectId,
    isTemplate,
    templateName:
      stringValue(raw.templateName) ||
      (isTemplate ? "Untitled Claims Template" : `Direct - ${designationId || "Designation"}`),
    designationId: designationId || undefined,
    applicableDesignations,
    isModuleEnabled: booleanValue(raw.isModuleEnabled),
    backdateConfig: normalizeBackdateConfig(raw.backdateConfig),
    claimTypes: claimTypesRaw.map((item) =>
      normalizeClaimType(item, fallback.projectId, ownerId),
    ),
    createdAt: stringValue(raw.createdAt) || undefined,
    updatedAt: stringValue(raw.updatedAt) || undefined,
  };
}

function normalizeClaimSchema(
  payload: unknown,
  fallback: { projectId: string; schemaKey: string },
): ClaimSchemaDocument | null {
  if (!payload || typeof payload !== "object") return null;
  const data = unwrapApiData(payload) as RawRecord | undefined;
  const raw = asRecord(data ?? payload);
  const fieldsRaw = Array.isArray(raw.fields) ? raw.fields : [];
  return {
    projectId: stringValue(raw.projectId) || fallback.projectId,
    schemaKey: stringValue(raw.schemaKey) || fallback.schemaKey,
    fields: fieldsRaw.map(normalizeSchemaField),
  };
}

function sanitizeSchemaField(field: UdfSchemaField, index: number): UdfSchemaField {
  return {
    fieldKey: field.fieldKey.trim(),
    label: field.label.trim(),
    type: field.type,
    config: field.config,
    required: Boolean(field.required),
    order: index + 1,
    status: field.status ?? true,
    summaryKey: Boolean(field.summaryKey),
  };
}

function buildConfigQuery(params: { projectId: string; designationId: string }): string {
  const search = new URLSearchParams({
    projectId: params.projectId,
    designationId: params.designationId,
  });
  return search.toString();
}

function buildSchemaQuery(params: { projectId: string; schemaKey: string }): string {
  const search = new URLSearchParams({
    projectId: params.projectId,
    schemaKey: params.schemaKey,
  });
  return search.toString();
}

function buildTemplateListQuery(projectId: string): string {
  const search = new URLSearchParams({ projectId });
  return search.toString();
}

function ensureMockConfig(input: SaveClaimsConfigInput): ClaimsConfigDocument {
  const key = configKey(input.projectId, input.designationId);
  const existing = mockConfigStore.get(key);
  const next: ClaimsConfigDocument = {
    id: existing?.id ?? key,
    projectId: input.projectId,
    designationId: input.designationId,
    isModuleEnabled: Boolean(input.isModuleEnabled),
    backdateConfig: input.backdateConfig,
    claimTypes: existing?.claimTypes ?? [],
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockConfigStore.set(key, next);
  return next;
}

function ensureMockTemplate(input: {
  projectId: string;
  templateName: string;
  applicableDesignations: string[];
  isModuleEnabled?: boolean;
  backdateConfig?: ClaimsBackdateConfig;
}): ClaimsTemplateDocument {
  const templateId = `template_${templateSeq(input.projectId)}`;
  const next: ClaimsTemplateDocument = {
    id: templateId,
    projectId: input.projectId,
    isTemplate: true,
    templateName: input.templateName.trim() || "Untitled Claims Template",
    applicableDesignations: input.applicableDesignations,
    isModuleEnabled: Boolean(input.isModuleEnabled),
    backdateConfig: input.backdateConfig,
    claimTypes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockTemplateStore.set(templateId, next);
  return next;
}

function upsertMockTemplate(template: ClaimsTemplateDocument): ClaimsTemplateDocument {
  const next = { ...template, updatedAt: new Date().toISOString() };
  mockTemplateStore.set(template.id, next);
  return next;
}

export const claimsConfigService = {
  async listTemplates(projectId: string): Promise<ClaimsTemplateDocument[]> {
    if (!projectId) return [];

    if (USE_MOCK_API) {
      await delay();
      return Array.from(mockTemplateStore.values()).filter((item) => item.projectId === projectId);
    }

    const raw = await apiClient.get<unknown[]>(`${BASE}/templates?${buildTemplateListQuery(projectId)}`);
    return (Array.isArray(raw) ? raw : []).map((item) =>
      normalizeClaimsTemplate(item, { projectId }),
    );
  },

  async listAllConfigs(projectId: string): Promise<ClaimsTemplateDocument[]> {
    if (!projectId) return [];

    if (USE_MOCK_API) {
      await delay();
      const templates = Array.from(mockTemplateStore.values()).filter((item) => item.projectId === projectId);
      const directConfigs = Array.from(mockConfigStore.values())
        .filter((item) => item.projectId === projectId)
        .map((config): ClaimsTemplateDocument => ({
          ...config,
          isTemplate: false,
          templateName: `Direct - ${config.designationId}`,
          applicableDesignations: [config.designationId],
        }));
      return [...templates, ...directConfigs];
    }

    const raw = await apiClient.get<unknown[]>(`${BASE}/all?${buildTemplateListQuery(projectId)}`);
    return (Array.isArray(raw) ? raw : []).map((item) =>
      normalizeClaimsTemplate(item, { projectId }),
    );
  },

  async getTemplate(projectId: string, templateId: string): Promise<ClaimsTemplateDocument | null> {
    if (!projectId || !templateId) return null;

    if (USE_MOCK_API) {
      await delay();
      return mockTemplateStore.get(templateId) ?? null;
    }

    try {
      const raw = await apiClient.get<unknown>(`${BASE}/templates/${encodeURIComponent(templateId)}`);
      return normalizeClaimsTemplate(raw, { projectId });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  },

  async createTemplate(input: {
    projectId: string;
    templateName: string;
    applicableDesignations: string[];
    isModuleEnabled?: boolean;
    backdateConfig?: ClaimsBackdateConfig;
  }): Promise<ClaimsTemplateDocument> {
    if (USE_MOCK_API) {
      await delay();
      return ensureMockTemplate(input);
    }

    const raw = await apiClient.post<unknown>(`${BASE}/template`, input);
    return normalizeClaimsTemplate(raw, { projectId: input.projectId });
  },

  async updateTemplate(
    projectId: string,
    templateId: string,
    patch: {
      templateName?: string;
      isModuleEnabled?: boolean;
      backdateConfig?: ClaimsBackdateConfig;
    },
  ): Promise<ClaimsTemplateDocument> {
    if (USE_MOCK_API) {
      await delay();
      const current = mockTemplateStore.get(templateId);
      if (!current) {
        throw new ApiError(404, "NOT_FOUND", undefined, "Template not found");
      }
      return upsertMockTemplate({
        ...current,
        templateName: patch.templateName?.trim() || current.templateName,
        isModuleEnabled: patch.isModuleEnabled ?? current.isModuleEnabled,
        backdateConfig: patch.backdateConfig ?? current.backdateConfig,
      });
    }

    const raw = await apiClient.patch<unknown>(
      `${BASE}/templates/${encodeURIComponent(templateId)}`,
      patch,
    );
    return normalizeClaimsTemplate(raw, { projectId });
  },

  async addDesignationToTemplate(
    projectId: string,
    templateId: string,
    designationId: string,
  ): Promise<ClaimsTemplateDocument> {
    if (USE_MOCK_API) {
      await delay();
      const current = mockTemplateStore.get(templateId);
      if (!current) {
        throw new ApiError(404, "NOT_FOUND", undefined, "Template not found");
      }
      const applicableDesignations = Array.from(new Set([...current.applicableDesignations, designationId]));
      return upsertMockTemplate({ ...current, applicableDesignations });
    }

    const raw = await apiClient.post<unknown>(
      `${BASE}/templates/${encodeURIComponent(templateId)}/add-designation`,
      { designationId },
    );
    return normalizeClaimsTemplate(raw, { projectId });
  },

  async removeDesignationFromTemplate(
    projectId: string,
    templateId: string,
    designationId: string,
  ): Promise<ClaimsTemplateDocument> {
    if (USE_MOCK_API) {
      await delay();
      const current = mockTemplateStore.get(templateId);
      if (!current) {
        throw new ApiError(404, "NOT_FOUND", undefined, "Template not found");
      }
      return upsertMockTemplate({
        ...current,
        applicableDesignations: current.applicableDesignations.filter((item) => item !== designationId),
      });
    }

    const raw = await apiClient.post<unknown>(
      `${BASE}/templates/${encodeURIComponent(templateId)}/remove-designation`,
      { designationId },
    );
    return normalizeClaimsTemplate(raw, { projectId });
  },

  async cloneTemplate(projectId: string, template: ClaimsTemplateDocument): Promise<ClaimsTemplateDocument> {
    if (USE_MOCK_API) {
      await delay();
      const cloned = await this.createTemplate({
        projectId,
        templateName: `${template.templateName} Copy`,
        applicableDesignations: template.applicableDesignations,
        isModuleEnabled: template.isModuleEnabled,
        backdateConfig: template.backdateConfig,
      });

      if (template.claimTypes.length > 0) {
        const next = {
          ...cloned,
          claimTypes: template.claimTypes.map((claimType, index) => {
            const id = `claim_type_${claimTypeSeq(projectId, cloned.id)}_${index + 1}`;
            return {
              ...claimType,
              id,
              udfSchemaKey: `${projectId}_${cloned.id}_${id}`,
            };
          }),
        };
        mockTemplateStore.set(next.id, next);
        return next;
      }

      return cloned;
    }

    // Real API: call the backend deep-clone endpoint
    const raw = await apiClient.post<unknown>(
      `${BASE}/clone/${encodeURIComponent(template.id)}`,
      {},
    );
    return normalizeClaimsTemplate(raw, { projectId });
  },

  async deleteTemplate(templateId: string): Promise<void> {
    if (USE_MOCK_API) {
      await delay();
      mockTemplateStore.delete(templateId);
      return;
    }

    throw new ApiError(
      501,
      "NOT_IMPLEMENTED",
      undefined,
      "Template delete is not supported by the current claims-config API.",
    );
  },

  async getConfig(projectId: string, designationId: string): Promise<ClaimsConfigDocument | null> {
    if (!projectId || !designationId) return null;

    if (USE_MOCK_API) {
      await delay();
      return mockConfigStore.get(configKey(projectId, designationId)) ?? null;
    }

    try {
      const raw = await apiClient.get<unknown>(`${BASE}?${buildConfigQuery({ projectId, designationId })}`);
      return normalizeClaimsConfig(raw, { projectId, designationId });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  },

  async saveConfig(input: SaveClaimsConfigInput): Promise<ClaimsConfigDocument> {
    if (USE_MOCK_API) {
      await delay();
      return ensureMockConfig(input);
    }

    const raw = await apiClient.post<unknown>(BASE, input);
    return normalizeClaimsConfig(raw, {
      projectId: input.projectId,
      designationId: input.designationId,
    });
  },

  async createDirectConfig(input: SaveClaimsConfigInput): Promise<ClaimsConfigDocument> {
    // Direct config uses the same endpoint as saveConfig
    return this.saveConfig(input);
  },

  async createClaimType(input: SaveClaimTypeInput): Promise<ClaimTypeCreateResponse> {
    if (USE_MOCK_API) {
      await delay();
      const ownerId = input.templateId ?? input.designationId ?? "";
      const id = `claim_type_${claimTypeSeq(input.projectId, ownerId)}`;
      const udfSchemaKey = `${input.projectId}_${ownerId}_${id}`;
      const nextClaimType: ClaimTypeDefinition = {
        id,
        name: input.name.trim(),
        isActive: input.isActive ?? true,
        capType: input.capType,
        fixedCap: input.fixedCap,
        conditionalCap: input.conditionalCap,
        udfSchemaKey,
        iconUrl: input.iconUrl?.trim() || undefined,
        approvalWorkflow: input.approvalWorkflow,
        perKmRateConfig: input.perKmRateConfig,
      };

      if (input.templateId) {
        const template = mockTemplateStore.get(input.templateId);
        if (!template) {
          throw new ApiError(404, "NOT_FOUND", undefined, "Template not found");
        }
        const nextTemplate = {
          ...template,
          claimTypes: [...template.claimTypes, nextClaimType],
          updatedAt: new Date().toISOString(),
        };
        mockTemplateStore.set(input.templateId, nextTemplate);
        return {
          claimTypeId: id,
          udfSchemaKey,
          config: nextTemplate,
        };
      }

      const config = ensureMockConfig(input as SaveClaimsConfigInput & SaveClaimTypeInput);
      const next = {
        ...config,
        claimTypes: [...config.claimTypes, nextClaimType],
        updatedAt: new Date().toISOString(),
      };
      mockConfigStore.set(configKey(input.projectId, input.designationId ?? ""), next);
      return {
        claimTypeId: id,
        udfSchemaKey,
        config: next,
      };
    }

    const raw = await apiClient.post<unknown>(`${BASE}/claim-type`, input);
    const data = asRecord(unwrapApiData(raw));
    return {
      claimTypeId: stringValue(data.claimTypeId) || "",
      udfSchemaKey: stringValue(data.udfSchemaKey) || "",
      config: data.config ? normalizeClaimsTemplate(data.config, { projectId: input.projectId }) : undefined,
    };
  },

  async updateClaimType(
    claimTypeId: string,
    input: SaveClaimTypeInput,
  ): Promise<ClaimsConfigDocument> {
    if (USE_MOCK_API) {
      await delay();
      if (input.templateId) {
        const template = mockTemplateStore.get(input.templateId);
        if (!template) {
          throw new ApiError(404, "NOT_FOUND", undefined, "Template not found");
        }
        const nextTemplate = {
          ...template,
          claimTypes: template.claimTypes.map((claimType) =>
            claimType.id === claimTypeId
              ? {
                  ...claimType,
                  name: input.name.trim(),
                  isActive: input.isActive ?? true,
                  capType: input.capType,
                  fixedCap: input.fixedCap,
                  conditionalCap: input.conditionalCap,
                  iconUrl: input.iconUrl?.trim() || undefined,
                  approvalWorkflow: input.approvalWorkflow,
                  perKmRateConfig: input.perKmRateConfig,
                }
              : claimType,
          ),
          updatedAt: new Date().toISOString(),
        };
        mockTemplateStore.set(input.templateId, nextTemplate);
        return {
          id: nextTemplate.id,
          projectId: nextTemplate.projectId,
          designationId: nextTemplate.applicableDesignations[0] ?? "",
          isModuleEnabled: nextTemplate.isModuleEnabled,
          backdateConfig: nextTemplate.backdateConfig,
          claimTypes: nextTemplate.claimTypes,
          createdAt: nextTemplate.createdAt,
          updatedAt: nextTemplate.updatedAt,
        };
      }

      const config = ensureMockConfig(input as SaveClaimsConfigInput & SaveClaimTypeInput);
      const next = {
        ...config,
        claimTypes: config.claimTypes.map((claimType) =>
          claimType.id === claimTypeId
            ? {
                ...claimType,
                name: input.name.trim(),
                isActive: input.isActive ?? true,
                capType: input.capType,
                fixedCap: input.fixedCap,
                conditionalCap: input.conditionalCap,
                iconUrl: input.iconUrl?.trim() || undefined,
                approvalWorkflow: input.approvalWorkflow,
                perKmRateConfig: input.perKmRateConfig,
              }
            : claimType,
        ),
        updatedAt: new Date().toISOString(),
      };
      mockConfigStore.set(configKey(input.projectId, input.designationId ?? ""), next);
      return next;
    }

    // Separate query params from body
    const { projectId, designationId, templateId, ...bodyPayload } = input;
    
    // Build query string — for templates, pass templateId as designationId
    // (the backend service accepts either a designationId or a templateId in that param)
    const queryParams = new URLSearchParams();
    queryParams.append('projectId', projectId);
    const idForQuery = templateId || designationId;
    if (idForQuery) {
      queryParams.append('designationId', idForQuery);
    }
    
    const raw = await apiClient.patch<unknown>(
      `${BASE}/claim-type/${encodeURIComponent(claimTypeId)}?${queryParams.toString()}`,
      bodyPayload,
    );
    return normalizeClaimsConfig(raw, {
      projectId: input.projectId,
      designationId: input.designationId ?? "",
    });
  },

  async deleteClaimType(
    claimTypeId: string,
    projectId: string,
    designationIdOrTemplateId: string,
  ): Promise<void> {
    if (USE_MOCK_API) {
      await delay();
      // Remove from mock stores
      for (const [, template] of mockTemplateStore) {
        template.claimTypes = template.claimTypes.filter((ct) => ct.id !== claimTypeId);
      }
      for (const [, config] of mockConfigStore) {
        config.claimTypes = config.claimTypes.filter((ct) => ct.id !== claimTypeId);
      }
      return;
    }

    const queryParams = new URLSearchParams();
    queryParams.append("projectId", projectId);
    queryParams.append("designationId", designationIdOrTemplateId);

    await apiClient.delete<void>(
      `${BASE}/claim-type/${encodeURIComponent(claimTypeId)}?${queryParams.toString()}`,
    );
  },

  async getUdfSchema(projectId: string, schemaKeyValue: string): Promise<ClaimSchemaDocument | null> {
    if (!projectId || !schemaKeyValue) return null;

    if (USE_MOCK_API) {
      await delay();
      return mockSchemaStore.get(schemaKey(projectId, schemaKeyValue)) ?? null;
    }

    try {
      const raw = await apiClient.get<unknown>(
        `${BASE}/udf-schema?${buildSchemaQuery({ projectId, schemaKey: schemaKeyValue })}`,
      );
      return normalizeClaimSchema(raw, { projectId, schemaKey: schemaKeyValue });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  },

  async saveUdfSchema(input: SaveClaimSchemaInput): Promise<void> {
    const body = {
      projectId: input.projectId,
      schemaKey: input.schemaKey,
      fields: input.fields.map(sanitizeSchemaField),
    };

    if (USE_MOCK_API) {
      await delay();
      mockSchemaStore.set(schemaKey(input.projectId, input.schemaKey), {
        projectId: input.projectId,
        schemaKey: input.schemaKey,
        fields: body.fields,
      });
      return;
    }

    await apiClient.post<void>(`${BASE}/udf-schema`, body);
  },
};
