import { apiClient } from "./api-client";

// Browser API calls go through the existing Next.js `/api/*` rewrite. The
// backend controller's route is `/integration-sync` beneath the app's v1 API
// prefix, consistent with the other frontend API services.
const BASE = "/api/v1/integration-sync";

export type SyncRunStatus =
  | "running"
  | "completed"
  | "partial_failed"
  | "failed"
  | "abandoned";

export interface SyncJob {
  projectId: string;
  jobKey: string;
  name?: string | null;
  manualOnly: boolean;
  cronExpression?: string | null;
  timezone?: string | null;
  isActive?: boolean;
}

export interface SyncRun {
  runId: string;
  jobKey: string;
  jobName?: string | null;
  projectId: string;
  trigger: "manual" | "cron";
  targetDate?: string | null;
  status: SyncRunStatus;
  startedAt?: string | null;
  completedAt?: string | null;
  total: number;
  completed: number;
  succeeded: number;
  failed: number;
  errorSummary?: string | null;
  configSnapshot?: {
    name?: string | null;
  };
}

export interface SyncUserOutcome {
  identifier: string;
  status: "succeeded" | "failed" | "regularization_preserved";
  reason?: string | null;
}

export interface SyncBatch {
  batchNumber: number;
  status: "running" | "completed" | "failed";
  attempts: number;
  succeeded: number;
  failed: number;
  missingUsers: number;
  regularizationPreserved: number;
  retryable: boolean;
  errorSummary?: string | null;
  userOutcomes: SyncUserOutcome[];
}

export interface SyncRunDetail extends SyncRun {
  batches: SyncBatch[];
}

export interface StartSyncRunResponse {
  runId: string;
  status: "running";
  targetDate: string;
}

export interface SyncRunPageMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface SyncRunPage {
  data: SyncRun[];
  meta: SyncRunPageMeta;
}

function normalizeRunPage(value: SyncRunPage | SyncRun[], page: number, limit: number): SyncRunPage {
  const fallbackMeta: SyncRunPageMeta = {
    page,
    limit,
    totalCount: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  };
  if (Array.isArray(value)) {
    return {
      data: value,
      meta: {
        ...fallbackMeta,
        totalCount: value.length,
      },
    };
  }
  const data = Array.isArray(value?.data) ? value.data : [];
  return {
    data,
    meta: value?.meta
      ? { ...fallbackMeta, ...value.meta }
      : { ...fallbackMeta, totalCount: data.length },
  };
}

function query(projectId: string, extra?: Record<string, string | undefined>) {
  const params = new URLSearchParams({ projectId });
  Object.entries(extra ?? {}).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return params.toString();
}

export const integrationSyncService = {
  listJobs(projectId: string): Promise<SyncJob[]> {
    return apiClient.get<SyncJob[]>(`${BASE}/jobs?${query(projectId)}`);
  },

  async listRuns(
    projectId: string,
    options: { jobKey?: string; page?: number; limit?: number } = {},
  ): Promise<SyncRunPage> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 5;
    // Pagination metadata is flattened onto the standard API envelope by the
    // backend response helper. Use getRaw so apiClient's normal data unwrap
    // does not discard that outer `meta` field.
    const response = await apiClient.getRaw<SyncRunPage | SyncRun[]>(
      `${BASE}/runs?${query(projectId, {
        jobKey: options.jobKey,
        page: String(page),
        limit: String(limit),
      })}`,
    );
    return normalizeRunPage(response, page, limit);
  },

  getRun(runId: string, projectId: string): Promise<SyncRunDetail> {
    return apiClient.get<SyncRunDetail>(
      `${BASE}/runs/${encodeURIComponent(runId)}?${query(projectId)}`,
    );
  },

  startRun(
    jobKey: string,
    projectId: string,
    targetDate?: string,
  ): Promise<StartSyncRunResponse> {
    return apiClient.post<StartSyncRunResponse>(
      `${BASE}/jobs/${encodeURIComponent(jobKey)}/run`,
      targetDate ? { projectId, targetDate } : { projectId },
    );
  },
};

const jobAvailabilityCache = new Map<string, { value: boolean; expiresAt: number }>();
const JOB_AVAILABILITY_TTL_MS = 60_000;

/** A successful empty result is cached; errors deliberately are not. */
export async function projectHasVisibleSyncJobs(projectId: string): Promise<boolean> {
  const cached = jobAvailabilityCache.get(projectId);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const value = (await integrationSyncService.listJobs(projectId)).length > 0;
  jobAvailabilityCache.set(projectId, {
    value,
    expiresAt: Date.now() + JOB_AVAILABILITY_TTL_MS,
  });
  return value;
}
