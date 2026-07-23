import { apiClient } from "./api-client";
import type { SalesConfiguration } from "./sales-config-service";
import type { UdfSchemaField } from "./udf-config-service";

const BASE = "/api/v1/stock";

export const STOCK_MODULE_KEY = "stock";

export type StockTrackingLevel = "user" | "store" | "user_store";

export type StockTypeBehavior =
  | "ADD"
  | "DEDUCT"
  | "OPENING"
  | "CLOSING_RECONCILIATION"
  | "ADJUSTMENT_ADD"
  | "ADJUSTMENT_DEDUCT";

export type StockApprovalLevelRole = "direct_manager" | "designation";

export interface StockFieldMapping {
  groupFieldKey?: string;
  fieldKey: string;
}

export interface StockApprovalLevel {
  level: number;
  label: string;
  approverType: StockApprovalLevelRole;
  approverDesignationId?: string;
  autoRejectDays: number;
}

export interface StockApprovalWorkflow {
  isEnabled: boolean;
  levels: StockApprovalLevel[];
}

export interface StockConfiguration {
  id: string;
  projectId: string;
  name: string;
  applicableDesignations: string[];
  udfSchemaKey?: string;
  trackingLevel: StockTrackingLevel;
  fieldMappings: {
    product?: StockFieldMapping;
    quantity?: StockFieldMapping;
  };
  approvalWorkflow: StockApprovalWorkflow;
  salesLinkages: StockSalesLinkage[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaveStockConfigurationInput {
  projectId?: string;
  name: string;
  applicableDesignations: string[];
  trackingLevel: StockTrackingLevel;
  fieldMappings: {
    product?: StockFieldMapping;
    quantity?: StockFieldMapping;
  };
  approvalWorkflow: StockApprovalWorkflow;
}

export interface StockType {
  id: string;
  name: string;
  behavior: StockTypeBehavior;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaveStockTypeInput {
  name: string;
  behavior: StockTypeBehavior;
}

export interface StockSalesLinkage {
  id: string;
  salesConfigId: string;
  salesConfigName?: string;
  product?: StockFieldMapping;
  quantity?: StockFieldMapping;
  createdAt?: string;
}

export interface SaveStockSalesLinkageInput {
  salesConfigId: string;
  product: StockFieldMapping;
  quantity: StockFieldMapping;
}

export interface StockUdfSchemaDocument {
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

function normalizeTrackingLevel(value: unknown): StockTrackingLevel {
  return value === "user" || value === "user_store" ? value : "store";
}

function normalizeBehavior(value: unknown): StockTypeBehavior {
  const allowed: StockTypeBehavior[] = [
    "ADD",
    "DEDUCT",
    "OPENING",
    "CLOSING_RECONCILIATION",
    "ADJUSTMENT_ADD",
    "ADJUSTMENT_DEDUCT",
  ];
  return allowed.includes(value as StockTypeBehavior)
    ? (value as StockTypeBehavior)
    : "ADD";
}

function normalizeFieldMapping(value: unknown): StockFieldMapping | undefined {
  const raw = record(value);
  const fieldKey = text(raw.fieldKey);
  if (!fieldKey) return undefined;
  return {
    ...(text(raw.groupFieldKey) ? { groupFieldKey: text(raw.groupFieldKey) } : {}),
    fieldKey,
  };
}

function normalizeApprovalLevel(value: unknown, index: number): StockApprovalLevel {
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

function normalizeSalesLinkage(value: unknown): StockSalesLinkage {
  const raw = record(value);
  const salesConfig = record(raw.salesConfig);
  return {
    id: text(raw._id) || text(raw.id) || text(raw.salesConfigId),
    salesConfigId: text(raw.salesConfigId) || text(salesConfig._id) || text(salesConfig.id),
    salesConfigName: text(raw.salesConfigName) || text(salesConfig.name) || undefined,
    product: normalizeFieldMapping(raw.product),
    quantity: normalizeFieldMapping(raw.quantity),
    createdAt: text(raw.createdAt) || undefined,
  };
}

export function normalizeStockConfiguration(value: unknown): StockConfiguration {
  const raw = record(value);
  const workflow = record(raw.approvalWorkflow);
  const levels = Array.isArray(workflow.levels) ? workflow.levels : [];
  const mappings = record(raw.fieldMappings);
  const linkages = Array.isArray(raw.salesLinkages)
    ? raw.salesLinkages
    : Array.isArray(raw.linkedSalesConfigurations)
      ? raw.linkedSalesConfigurations
      : [];

  return {
    id: text(raw._id) || text(raw.id),
    projectId: text(raw.projectId),
    name: text(raw.name),
    applicableDesignations: Array.isArray(raw.applicableDesignations)
      ? raw.applicableDesignations.filter((item): item is string => typeof item === "string")
      : [],
    udfSchemaKey: text(raw.udfSchemaKey) || undefined,
    trackingLevel: normalizeTrackingLevel(raw.trackingLevel),
    fieldMappings: {
      product: normalizeFieldMapping(mappings.product),
      quantity: normalizeFieldMapping(mappings.quantity),
    },
    approvalWorkflow: {
      isEnabled: bool(workflow.isEnabled),
      levels: levels.map(normalizeApprovalLevel),
    },
    salesLinkages: linkages.map(normalizeSalesLinkage),
    isActive: bool(raw.isActive),
    createdAt: text(raw.createdAt) || undefined,
    updatedAt: text(raw.updatedAt) || undefined,
  };
}

export function normalizeStockType(value: unknown): StockType {
  const raw = record(value);
  return {
    id: text(raw._id) || text(raw.id),
    name: text(raw.name),
    behavior: normalizeBehavior(raw.behavior),
    isActive: bool(raw.isActive, true),
    createdAt: text(raw.createdAt) || undefined,
    updatedAt: text(raw.updatedAt) || undefined,
  };
}

function payload(input: SaveStockConfigurationInput): Record<string, unknown> {
  return {
    ...(input.projectId ? { projectId: input.projectId } : {}),
    name: input.name,
    applicableDesignations: input.applicableDesignations,
    trackingLevel: input.trackingLevel,
    fieldMappings: input.fieldMappings,
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

export const stockConfigService = {
  async list(projectId: string): Promise<StockConfiguration[]> {
    const result = await apiClient.get<unknown[]>(
      `${BASE}/configurations?projectId=${encodeURIComponent(projectId)}`,
    );
    return Array.isArray(result) ? result.map(normalizeStockConfiguration) : [];
  },

  async get(id: string, projectId: string): Promise<StockConfiguration> {
    const result = await apiClient.get<unknown>(
      `${BASE}/configurations/${encodeURIComponent(id)}?projectId=${encodeURIComponent(projectId)}`,
    );
    return normalizeStockConfiguration(result);
  },

  async create(input: SaveStockConfigurationInput & { projectId: string }): Promise<StockConfiguration> {
    const result = await apiClient.post<unknown>(`${BASE}/configurations`, payload(input));
    return normalizeStockConfiguration(result);
  },

  async update(
    id: string,
    projectId: string,
    input: SaveStockConfigurationInput,
  ): Promise<StockConfiguration> {
    const result = await apiClient.patch<unknown>(
      `${BASE}/configurations/${encodeURIComponent(id)}?projectId=${encodeURIComponent(projectId)}`,
      payload(input),
    );
    return normalizeStockConfiguration(result);
  },

  async clone(id: string, projectId: string): Promise<StockConfiguration> {
    const result = await apiClient.post<unknown>(
      `${BASE}/configurations/${encodeURIComponent(id)}/clone?projectId=${encodeURIComponent(projectId)}`,
    );
    return normalizeStockConfiguration(result);
  },

  async remove(id: string, projectId: string): Promise<void> {
    await apiClient.delete(
      `${BASE}/configurations/${encodeURIComponent(id)}?projectId=${encodeURIComponent(projectId)}`,
    );
  },

  async activate(id: string, projectId: string): Promise<void> {
    await apiClient.put(
      `${BASE}/configurations/${encodeURIComponent(id)}/activate?projectId=${encodeURIComponent(projectId)}`,
      {},
    );
  },

  async getUdfSchema(id: string, projectId: string): Promise<StockUdfSchemaDocument> {
    const result = await apiClient.get<StockUdfSchemaDocument>(
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
  ): Promise<StockUdfSchemaDocument> {
    const result = await apiClient.post<StockUdfSchemaDocument>(
      `${BASE}/configurations/${encodeURIComponent(id)}/udf-schema?projectId=${encodeURIComponent(projectId)}`,
      { fields },
    );
    return {
      projectId: result.projectId || projectId,
      schemaKey: result.schemaKey || "",
      fields: Array.isArray(result.fields) ? result.fields : [],
    };
  },

  async listStockTypes(configId: string, projectId: string): Promise<StockType[]> {
    const result = await apiClient.get<unknown[]>(
      `${BASE}/configurations/${encodeURIComponent(configId)}/stock-types?projectId=${encodeURIComponent(projectId)}`,
    );
    return Array.isArray(result) ? result.map(normalizeStockType) : [];
  },

  async createStockType(
    configId: string,
    projectId: string,
    input: SaveStockTypeInput,
  ): Promise<StockType> {
    const result = await apiClient.post<unknown>(
      `${BASE}/configurations/${encodeURIComponent(configId)}/stock-types?projectId=${encodeURIComponent(projectId)}`,
      input,
    );
    return normalizeStockType(result);
  },

  async updateStockType(
    configId: string,
    projectId: string,
    stockTypeId: string,
    input: SaveStockTypeInput,
  ): Promise<StockType> {
    const result = await apiClient.patch<unknown>(
      `${BASE}/configurations/${encodeURIComponent(configId)}/stock-types/${encodeURIComponent(stockTypeId)}?projectId=${encodeURIComponent(projectId)}`,
      input,
    );
    return normalizeStockType(result);
  },

  async deactivateStockType(
    configId: string,
    projectId: string,
    stockTypeId: string,
  ): Promise<void> {
    await apiClient.delete(
      `${BASE}/configurations/${encodeURIComponent(configId)}/stock-types/${encodeURIComponent(stockTypeId)}?projectId=${encodeURIComponent(projectId)}`,
    );
  },

  async linkSalesConfiguration(
    configId: string,
    projectId: string,
    input: SaveStockSalesLinkageInput,
  ): Promise<StockSalesLinkage> {
    const result = await apiClient.post<unknown>(
      `${BASE}/configurations/${encodeURIComponent(configId)}/sales-linkages?projectId=${encodeURIComponent(projectId)}`,
      input,
    );
    return normalizeSalesLinkage(result);
  },

  async unlinkSalesConfiguration(
    configId: string,
    projectId: string,
    salesConfigId: string,
  ): Promise<void> {
    await apiClient.delete(
      `${BASE}/configurations/${encodeURIComponent(configId)}/sales-linkages/${encodeURIComponent(salesConfigId)}?projectId=${encodeURIComponent(projectId)}`,
    );
  },

  async listLinkableSalesConfigurations(projectId: string): Promise<SalesConfiguration[]> {
    const result = await apiClient.get<unknown[]>(
      `/api/v1/sales/configurations?projectId=${encodeURIComponent(projectId)}`,
    );
    const { normalizeSalesConfiguration } = await import("./sales-config-service");
    return Array.isArray(result) ? result.map(normalizeSalesConfiguration) : [];
  },
};
