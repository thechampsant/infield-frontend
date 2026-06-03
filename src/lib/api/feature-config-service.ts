/**
 * Feature config API — project module enablement (GET only in OpenAPI today).
 */

import { ApiError, apiClient } from "./api-client";
import { unwrapApiData } from "./api-response";
import {
  PROJECT_MODULE_CATALOG,
  type ProjectModuleDefinition,
} from "@/lib/project-admin/module-catalog";

const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API === "true";
const BASE = "/api/v1/feature-config";

export interface FeatureModuleStatus {
  key: string;
  isActive: boolean;
  activatedAt?: string;
  updatedAt?: string;
  moduleIconUrl?: string;
}

export interface FeatureConfigDto {
  projectId: string;
  modules: FeatureModuleStatus[];
}

export interface ProjectModuleState {
  definition: ProjectModuleDefinition;
  enabled: boolean;
}

function buildDefaultConfig(projectId: string): FeatureConfigDto {
  return {
    projectId,
    modules: PROJECT_MODULE_CATALOG.map((m) => ({
      key: m.id,
      isActive: m.comingSoon ? false : m.defaultEnabled,
    })),
  };
}

function mergeCatalogWithConfig(config: FeatureConfigDto): ProjectModuleState[] {
  const byKey = new Map(
    (config.modules ?? []).map((m) => [m.key, m.isActive] as const),
  );

  return PROJECT_MODULE_CATALOG.map((definition) => {
    const fromApi = byKey.get(definition.id);
    const enabled = definition.comingSoon
      ? false
      : (fromApi ?? definition.defaultEnabled);
    return { definition, enabled };
  });
}

export const featureConfigService = {
  async getRawByProject(projectId: string): Promise<FeatureConfigDto> {
    if (!projectId) {
      return buildDefaultConfig("");
    }

    if (USE_MOCK_API) {
      return buildDefaultConfig(projectId);
    }

    try {
      const raw = await apiClient.get<unknown>(`${BASE}/${projectId}`);
      const data = unwrapApiData(raw) as FeatureConfigDto;
      return {
        projectId: data.projectId ?? projectId,
        modules: Array.isArray(data.modules) ? data.modules : [],
      };
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        return buildDefaultConfig(projectId);
      }
      throw err;
    }
  },

  async getByProject(projectId: string): Promise<ProjectModuleState[]> {
    const config = await this.getRawByProject(projectId);
    return mergeCatalogWithConfig(config);
  },
};
