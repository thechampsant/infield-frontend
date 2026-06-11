import { ApiError, apiClient } from "./api-client";
import type { UdfSchemaField } from "./udf-config-service";

const BASE = "/api/v1/visit-config";

export type VisitType = "direct" | "store";
export type StoreMappingMode = "direct_store" | "pjp" | null;
export type VisitConfigStatus = "draft" | "published";

export interface StoreDetail {
  id: string;
  code: string;
  name: string;
  latitude?: number;
  longitude?: number;
}

export interface StoresForTypeResponse {
  storeType: string;
  stores: StoreDetail[];
  fieldSet?: {
    udfSchemaKey: string;
    fields: UdfSchemaField[];
  };
}

export interface JourneyTabDocument {
  tabId: string;
  name: string;
  order: number;
  isMandatory: boolean;
  isGeoFenced: boolean;
  isActive: boolean;
  isRequiredForAdvancement: boolean;
  udfSchemaKey: string;
}

export interface LandingFieldSet {
  udfSchemaKey: string;
}

export interface VisitConfigDocument {
  id: string;
  projectId: string;
  designationId: string;
  isModuleEnabled: boolean;
  mandatoryCheckIn: boolean;
  visitType: VisitType;
  storeMappingMode: StoreMappingMode;
  allowAllMappedStores: boolean;
  geoFenceConfig: { radius: number };
  reimbursementConfig: {
    isEnabled: boolean;
    multiplicationFactor: number;
    perKmRate: number;
  };
  distanceConfig: {
    fromLocationType: string;
    toLocationType: string;
    calculationMethod: string;
  };
  landingPageConfig: {
    udfSchemaKey: string;
    storeTypeToggle: {
      enabled: boolean;
      defaultMode: "pjp_only" | "all_mapped";
      pjpLabel: string;
      allStoresLabel: string;
    };
    fieldSets: {
      pjp_only?: LandingFieldSet;
      all_mapped?: LandingFieldSet;
    };
  };
  journeyTabs: JourneyTabDocument[];
  status: VisitConfigStatus;
  lastSavedAt: string;
}

export interface UpsertVisitConfigInput {
  projectId: string;
  designationId: string;
  designationIds?: string[];
  isModuleEnabled?: boolean;
  mandatoryCheckIn?: boolean;
  visitType?: VisitType;
  storeMappingMode?: StoreMappingMode;
  allowAllMappedStores?: boolean;
  geoFenceConfig?: { radius: number };
  reimbursementConfig?: {
    isEnabled: boolean;
    multiplicationFactor: number;
    perKmRate: number;
  };
  distanceConfig?: {
    fromLocationType: string;
    toLocationType: string;
    calculationMethod: string;
  };
  landingPageConfig?: {
    udfSchemaKey?: string;
    storeTypeToggle?: {
      enabled: boolean;
      defaultMode: "pjp_only" | "all_mapped";
      pjpLabel: string;
      allStoresLabel: string;
    };
    fieldSets?: {
      pjp_only?: { udfSchemaKey?: string; fields?: UdfSchemaField[] };
      all_mapped?: { udfSchemaKey?: string; fields?: UdfSchemaField[] };
    };
  };
  status?: VisitConfigStatus;
}

type Raw = Record<string, unknown>;

function record(value: unknown): Raw {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Raw)
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function bool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function normalizeVisitConfig(
  value: unknown,
  fallback: { projectId: string; designationId: string },
): VisitConfigDocument {
  const raw = record(value);
  const geo = record(raw.geoFenceConfig);
  const reimbursement = record(raw.reimbursementConfig);
  const distance = record(raw.distanceConfig);
  const landing = record(raw.landingPageConfig);
  const toggle = record(landing.storeTypeToggle);
  const fieldSets = record(landing.fieldSets);
  const pjp = record(fieldSets.pjp_only);
  const allMapped = record(fieldSets.all_mapped);
  const projectId = text(raw.projectId) || fallback.projectId;
  const designationId = text(raw.designationId) || fallback.designationId;
  const isPjpStoreConfig =
    text(raw.visitType) === "store" && text(raw.storeMappingMode) === "pjp";

  return {
    id: text(raw._id) || text(raw.id),
    projectId,
    designationId,
    isModuleEnabled: bool(raw.isModuleEnabled),
    mandatoryCheckIn: bool(raw.mandatoryCheckIn),
    visitType: text(raw.visitType) === "store" ? "store" : "direct",
    storeMappingMode:
      text(raw.storeMappingMode) === "pjp"
        ? "pjp"
        : text(raw.storeMappingMode) === "direct_store"
          ? "direct_store"
          : null,
    allowAllMappedStores: bool(raw.allowAllMappedStores),
    geoFenceConfig: { radius: num(geo.radius, 200) },
    reimbursementConfig: {
      isEnabled: bool(reimbursement.isEnabled),
      multiplicationFactor: num(reimbursement.multiplicationFactor, 1),
      perKmRate: num(reimbursement.perKmRate),
    },
    distanceConfig: {
      fromLocationType: text(distance.fromLocationType),
      toLocationType: text(distance.toLocationType),
      calculationMethod: text(distance.calculationMethod),
    },
    landingPageConfig: {
      udfSchemaKey: text(landing.udfSchemaKey),
      storeTypeToggle: {
        enabled: bool(toggle.enabled),
        defaultMode: text(toggle.defaultMode) === "all_mapped" ? "all_mapped" : "pjp_only",
        pjpLabel: text(toggle.pjpLabel) || "PJP Today",
        allStoresLabel: text(toggle.allStoresLabel) || "All Stores",
      },
      fieldSets: {
        ...(text(pjp.udfSchemaKey) || isPjpStoreConfig
          ? {
              pjp_only: {
                udfSchemaKey:
                  text(pjp.udfSchemaKey) ||
                  `${projectId}_${designationId}_landing_page_pjp`,
              },
            }
          : {}),
        ...(text(allMapped.udfSchemaKey) || isPjpStoreConfig
          ? {
              all_mapped: {
                udfSchemaKey:
                  text(allMapped.udfSchemaKey) ||
                  `${projectId}_${designationId}_landing_page_all_mapped`,
              },
            }
          : {}),
      },
    },
    journeyTabs: (Array.isArray(raw.journeyTabs) ? raw.journeyTabs : []).map(
      (item, index) => {
        const tab = record(item);
        return {
          tabId: text(tab._id) || text(tab.tabId),
          name: text(tab.name),
          order: num(tab.order, index + 1),
          isMandatory: bool(tab.isMandatory),
          isGeoFenced: bool(tab.isGeoFenced),
          isActive: bool(tab.isActive, true),
          isRequiredForAdvancement: bool(tab.isRequiredForAdvancement),
          udfSchemaKey: text(tab.udfSchemaKey),
        };
      },
    ),
    status: text(raw.status) === "published" ? "published" : "draft",
    lastSavedAt: text(raw.lastSavedAt),
  };
}

export interface VisitSessionConfig {
  data: {
    isModuleEnabled: boolean;
    currentVisitId?: string;
  };
  visitConfig: {
    isModuleEnabled: boolean;
    visitType: "direct" | "store";
    storeMappingMode: StoreMappingMode;
    allowAllMappedStores: boolean;
    geoFenceConfig?: { radius: number };
    availableStores?: string[];
  };
  landingPageConfig: {
    udfSchemaKey: string;
    fields: UdfSchemaField[];
    storeTypeToggle?: {
      enabled: boolean;
      defaultMode: "pjp_only" | "all_mapped";
      pjpLabel: string;
      allStoresLabel: string;
    };
    fieldSets?: {
      pjp_only?: {
        udfSchemaKey: string;
        fields: UdfSchemaField[];
      };
      all_mapped?: {
        udfSchemaKey: string;
        fields: UdfSchemaField[];
      };
    };
  };
  journeyTabs: Array<{
    tabId: string;
    name: string;
    order: number;
    isMandatory: boolean;
    isRequiredForAdvancement: boolean;
    fields: UdfSchemaField[];
  }>;
}

export const visitConfigService = {
  async getSessionConfig(
    projectId: string,
    designationId: string,
    storeFilterMode?: "pjp_only" | "all_mapped" | "direct_store" | "config_default",
  ): Promise<VisitSessionConfig> {
    const query = new URLSearchParams({
      projectId,
      designationId,
      ...(storeFilterMode ? { storeFilterMode } : {}),
    });
    return apiClient.get<VisitSessionConfig>(`${BASE}/session-config?${query}`);
  },

  async getConfig(projectId: string, designationId: string) {
    const query = new URLSearchParams({ projectId, designationId });
    try {
      const value = await apiClient.get<unknown>(`${BASE}?${query}`);
      return normalizeVisitConfig(value, { projectId, designationId });
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  },

  async save(input: UpsertVisitConfigInput, draft = false) {
    const value = await apiClient.post<unknown>(
      draft ? `${BASE}/draft` : BASE,
      input,
    );
    return normalizeVisitConfig(value, {
      projectId: input.projectId,
      designationId: input.designationId,
    });
  },

  async softDelete(projectId: string, designationId: string) {
    const query = new URLSearchParams({ projectId, designationId });
    await apiClient.delete(`${BASE}?${query}`);
  },

  async getUdfSchema(projectId: string, schemaKey: string) {
    if (!projectId || !schemaKey) return null;
    const query = new URLSearchParams({ projectId, schemaKey });
    try {
      const value = record(
        await apiClient.get<unknown>(`${BASE}/udf-schema?${query}`),
      );
      const fields = Array.isArray(value.fields) ? value.fields : [];
      return {
        projectId: text(value.projectId) || projectId,
        schemaKey: text(value.schemaKey) || schemaKey,
        fields: fields.map((item, index) => {
          const field = record(item);
          const type = text(field.type).toUpperCase();
          return {
            fieldKey: text(field.fieldKey) || `field_${index + 1}`,
            label: text(field.label) || `Field ${index + 1}`,
            type: ([
              "STRING",
              "NUMBER",
              "DATE",
              "BOOLEAN",
              "SELECT",
              "DROPDOWN",
              "API_SELECT",
              "CASCADING_SELECT",
              "IMAGE",
              "FILE",
            ].includes(type) ? type : "STRING") as UdfSchemaField["type"],
            config: record(field.config),
            required: bool(field.required),
            order: num(field.order, index + 1),
            status: bool(field.status, true),
            summaryKey: bool(field.summaryKey),
            visibilityRules: Array.isArray(field.visibilityRules)
              ? (field.visibilityRules as UdfSchemaField["visibilityRules"])
              : undefined,
          };
        }),
      };
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  },

  async addTab(input: {
    projectId: string;
    designationId: string;
    name: string;
    isMandatory?: boolean;
    isGeoFenced?: boolean;
  }) {
    return apiClient.post<{ tabId: string; udfSchemaKey: string; order: number }>(
      `${BASE}/tab`,
      input,
    );
  },

  async updateTab(
    tabId: string,
    projectId: string,
    designationId: string,
    input: Partial<Pick<JourneyTabDocument, "name" | "order" | "isMandatory" | "isGeoFenced" | "isActive" | "isRequiredForAdvancement">>,
  ) {
    const query = new URLSearchParams({ projectId, designationId });
    const value = await apiClient.patch<unknown>(
      `${BASE}/tab/${encodeURIComponent(tabId)}?${query}`,
      input,
    );
    return normalizeVisitConfig(value, { projectId, designationId });
  },

  async reorderTabs(
    projectId: string,
    designationId: string,
    tabs: JourneyTabDocument[],
  ) {
    const value = await apiClient.post<unknown>(`${BASE}/tab/reorder`, {
      projectId,
      designationId,
      tabOrders: tabs.map((tab, index) => ({
        tabId: tab.tabId,
        order: index + 1,
      })),
    });
    return normalizeVisitConfig(value, { projectId, designationId });
  },

  async deactivateTab(tabId: string, projectId: string, designationId: string) {
    await apiClient.request(`${BASE}/tab/${encodeURIComponent(tabId)}/deactivate`, {
      method: "DELETE",
      body: JSON.stringify({ projectId, designationId }),
    });
  },

  async cloneTab(tabId: string, projectId: string, designationId: string) {
    return apiClient.post<{ newTabId: string; udfSchemaKey: string }>(
      `${BASE}/tab/${encodeURIComponent(tabId)}/clone`,
      { projectId, designationId },
    );
  },

  async publishTab(
    tabId: string,
    projectId: string,
    designationId: string,
    fields: UdfSchemaField[],
  ) {
    return apiClient.post<{ schemaKey: string; fieldCount: number }>(
      `${BASE}/form-builder/${encodeURIComponent(tabId)}/publish`,
      { projectId, designationId, fields },
    );
  },

  async publishLanding(
    projectId: string,
    designationId: string,
    fields: UdfSchemaField[],
  ) {
    return apiClient.post<{ schemaKey: string; fieldCount: number }>(
      `${BASE}/landing-page/publish`,
      { projectId, designationId, fields },
    );
  },

  async getStoresForType(
    projectId: string,
    designationId: string,
    storeType: "pjp_only" | "all_mapped" | "direct_store",
  ): Promise<StoresForTypeResponse> {
    const data = await apiClient.post<unknown>(`${BASE}/landing-page/stores`, {
      projectId,
      designationId,
      storeType,
    });
    const raw = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
    const stores = Array.isArray(raw.stores) ? raw.stores : [];
    return {
      storeType: typeof raw.storeType === "string" ? raw.storeType : storeType,
      stores: stores.map((s: Record<string, unknown>) => ({
        id: String(s.id ?? ""),
        code: String(s.code ?? ""),
        name: String(s.name ?? ""),
        latitude: typeof s.latitude === "number" ? s.latitude : undefined,
        longitude: typeof s.longitude === "number" ? s.longitude : undefined,
      })),
      fieldSet:
        raw.fieldSet && typeof raw.fieldSet === "object"
          ? (() => {
              const fieldSet = record(raw.fieldSet);
              const fields = Array.isArray(fieldSet.fields) ? fieldSet.fields : [];
              return {
                udfSchemaKey: text(fieldSet.udfSchemaKey),
                fields: fields.map((item, index) => {
                  const field = record(item);
                  const type = text(field.type).toUpperCase();
                  return {
                    fieldKey: text(field.fieldKey) || `field_${index + 1}`,
                    label: text(field.label) || `Field ${index + 1}`,
                    type: ([
                      "STRING", "NUMBER", "DATE", "BOOLEAN", "SELECT",
                      "DROPDOWN", "API_SELECT", "CASCADING_SELECT", "IMAGE", "FILE",
                    ].includes(type) ? type : "STRING") as UdfSchemaField["type"],
                    config: record(field.config),
                    required: bool(field.required),
                    order: num(field.order, index + 1),
                    status: bool(field.status, true),
                    summaryKey: bool(field.summaryKey),
                    visibilityRules: Array.isArray(field.visibilityRules)
                      ? (field.visibilityRules as UdfSchemaField["visibilityRules"])
                      : undefined,
                  };
                }),
              };
            })()
          : undefined,
    };
  },
};
