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
  manualOnly: boolean;
  cronExpression?: string | null;
  timezone?: string | null;
  isActive?: boolean;
}

export interface SyncRun {
  runId: string;
  jobKey: string;
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
}

export interface SyncBatch {
  batchNumber: number;
  status: "completed" | "failed";
  attempts: number;
  succeeded: number;
  failed: number;
  missingUsers: number;
  regularizationPreserved: number;
  retryable: boolean;
  errorSummary?: string | null;
}

export interface SyncRunDetail extends SyncRun {
  batches: SyncBatch[];
}

export interface StartSyncRunResponse {
  runId: string;
  status: "running";
  targetDate: string;
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

  listRuns(projectId: string, jobKey?: string): Promise<SyncRun[]> {
    return apiClient.get<SyncRun[]>(
      `${BASE}/runs?${query(projectId, { jobKey })}`,
    );
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
