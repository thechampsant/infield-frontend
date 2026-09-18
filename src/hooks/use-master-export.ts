"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api/api-client";
import {
  masterExportService,
  type MasterExportJob,
  type MasterExportKind,
} from "@/lib/api/master-export-service";
import {
  isExportJobInProgress,
  shouldAutoDownload,
  triggerSignedUrlDownload,
} from "@/lib/reports/report-export-job";

export function useMasterExport(projectId: string | undefined, kind: MasterExportKind) {
  const [job, setJob] = useState<MasterExportJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sessionCreatedJobIds = useRef(new Set<string>());
  const autoDownloadedJobIds = useRef(new Set<string>());

  const preparing = job ? isExportJobInProgress(job.status) : false;

  useEffect(() => {
    if (!job || !isExportJobInProgress(job.status)) return;
    const timer = window.setInterval(async () => {
      try {
        const next = await masterExportService.getJob(job.jobId);
        setJob(next);
      } catch {
        /* keep last known status */
      }
    }, 2000);
    return () => window.clearInterval(timer);
  }, [job?.jobId, job?.status]);

  useEffect(() => {
    if (!job?.downloadUrl || job.status !== "ready") return;
    if (
      !shouldAutoDownload({
        status: job.status,
        jobId: job.jobId,
        createdThisSession: sessionCreatedJobIds.current.has(job.jobId),
        alreadyDownloaded: autoDownloadedJobIds.current.has(job.jobId),
      })
    ) {
      return;
    }
    autoDownloadedJobIds.current.add(job.jobId);
    triggerSignedUrlDownload(job.downloadUrl, job.fileName);
  }, [job]);

  const startExport = useCallback(async () => {
    if (!projectId) return;
    setError(null);
    try {
      const queued = await masterExportService.enqueueJob(projectId, kind);
      sessionCreatedJobIds.current.add(queued.jobId);
      setJob({
        jobId: queued.jobId,
        status: queued.status,
        kind,
        projectId,
        progress: "Queued",
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const jobId = typeof err.details?.jobId === "string" ? err.details.jobId : undefined;
        if (jobId) {
          sessionCreatedJobIds.current.add(jobId);
          try {
            setJob(await masterExportService.getJob(jobId));
            return;
          } catch {
            /* fall through */
          }
        }
      }
      setError(err instanceof Error ? err.message : "Failed to start export. Please try again.");
    }
  }, [projectId, kind]);

  const downloadReady = useCallback(() => {
    if (!job?.downloadUrl) return;
    triggerSignedUrlDownload(job.downloadUrl, job.fileName);
  }, [job]);

  return { startExport, preparing, job, error, downloadReady };
}
