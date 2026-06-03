import { ApiError, apiClient } from "./api-client";
import { unwrapApiData } from "./api-response";

const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API === "true";
const BASE = "/api/v1/feature-wizard";

export type FeatureWizardStepStatus = "PENDING" | "COMPLETED";

export interface FeatureWizardStep {
  key: string;
  status: FeatureWizardStepStatus;
  completedAt?: string;
}

export interface FeatureWizardFlow {
  key: string;
  steps: FeatureWizardStep[];
}

export interface FeatureWizardDocument {
  projectId: string;
  version: number;
  flows: FeatureWizardFlow[];
}

function buildDefaultWizard(projectId: string): FeatureWizardDocument {
  return {
    projectId,
    version: 1,
    flows: [
      {
        key: "onboarding",
        steps: [
          { key: "roles_created", status: "PENDING" },
          { key: "designations_created", status: "PENDING" },
          { key: "designation_role_mapped", status: "PENDING" },
          { key: "designation_permission_mapped", status: "PENDING" },
          { key: "user_udf_created", status: "PENDING" },
          { key: "user_created", status: "PENDING" },
        ],
      },
      {
        key: "attendance",
        steps: [
          { key: "attendance_config_created", status: "PENDING" },
          { key: "attendance_form_created", status: "PENDING" },
        ],
      },
      {
        key: "claims",
        steps: [
          { key: "claims_config_created", status: "PENDING" },
          { key: "claims_type_created", status: "PENDING" },
        ],
      },
      {
        key: "store",
        steps: [
          { key: "store_udf_created", status: "PENDING" },
          { key: "stores_created", status: "PENDING" },
          { key: "store_user_mapping_enabled", status: "PENDING" },
        ],
      },
    ],
  };
}

function normalizeWizard(payload: unknown, projectId: string): FeatureWizardDocument {
  const raw = unwrapApiData(payload) as Record<string, unknown>;
  const flows = Array.isArray(raw?.flows) ? raw.flows : [];

  return {
    projectId: String(raw?.projectId ?? projectId),
    version: typeof raw?.version === "number" ? raw.version : 1,
    flows: flows.map((flow) => {
      const record = flow as Record<string, unknown>;
      const steps = Array.isArray(record.steps) ? record.steps : [];
      return {
        key: String(record.key ?? ""),
        steps: steps.map((step) => {
          const value = step as Record<string, unknown>;
          return {
            key: String(value.key ?? ""),
            status: value.status === "COMPLETED" ? "COMPLETED" : "PENDING",
            completedAt:
              typeof value.completedAt === "string" ? value.completedAt : undefined,
          };
        }),
      };
    }),
  };
}

export function getWizardFlow(
  wizard: FeatureWizardDocument | null,
  flowKey: string,
): FeatureWizardFlow | null {
  return wizard?.flows.find((flow) => flow.key === flowKey) ?? null;
}

export function isWizardFlowComplete(
  wizard: FeatureWizardDocument | null,
  flowKey: string,
): boolean {
  const flow = getWizardFlow(wizard, flowKey);
  return Boolean(flow && flow.steps.length > 0 && flow.steps.every((step) => step.status === "COMPLETED"));
}

export const featureWizardService = {
  async getByProject(projectId: string): Promise<FeatureWizardDocument> {
    if (!projectId) {
      return buildDefaultWizard("");
    }

    if (USE_MOCK_API) {
      return buildDefaultWizard(projectId);
    }

    try {
      const raw = await apiClient.get<unknown>(`${BASE}/${projectId}`);
      return normalizeWizard(raw, projectId);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        return buildDefaultWizard(projectId);
      }
      throw err;
    }
  },
};
