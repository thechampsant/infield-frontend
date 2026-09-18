import { apiClient } from "./api-client";

export const MASTER_EXPORT_KINDS = [
  "users",
  "stores",
  "products",
  "user-store-mapping",
  "product-store-mapping",
  "reportee-mapping",
  "pjp",
  "roles",
  "designations",
] as const;

export type MasterExportKind = (typeof MASTER_EXPORT_KINDS)[number];

export type MasterExportJobStatus = "queued" | "running" | "ready" | "failed";

export interface MasterExportJob {
  jobId: string;
  status: MasterExportJobStatus;
  kind: MasterExportKind;
  projectId: string;
  fileName?: string;
  error?: string;
  progress?: string;
  downloadUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EnqueueMasterExportResponse {
  jobId: string;
  status: MasterExportJobStatus;
}

const BASE = "/api/v1/masters";

export const masterExportService = {
  async enqueueJob(
    projectId: string,
    kind: MasterExportKind,
  ): Promise<EnqueueMasterExportResponse> {
    return apiClient.post<EnqueueMasterExportResponse>(`${BASE}/export-jobs`, {
      projectId,
      kind,
    });
  },

  async getJob(jobId: string): Promise<MasterExportJob> {
    return apiClient.get<MasterExportJob>(
      `${BASE}/export-jobs/${encodeURIComponent(jobId)}`,
    );
  },
};
