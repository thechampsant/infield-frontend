"use client";

import { useCallback, useEffect, useState } from "react";
import type { MasterExportKind } from "@/lib/api/master-export-service";
import {
  downloadMasterExport,
  getMasterExportSnapshot,
  masterExportSessionKey,
  startMasterExport,
  subscribeMasterExport,
} from "@/lib/api/master-export-session";
import { isExportJobInProgress } from "@/lib/reports/report-export-job";

export function useMasterExport(projectId: string | undefined, kind: MasterExportKind) {
  const key = projectId ? masterExportSessionKey(projectId, kind) : "";
  const [snapshot, setSnapshot] = useState(() =>
    key ? getMasterExportSnapshot(key) : { job: null, error: null },
  );

  useEffect(() => {
    if (!projectId) {
      setSnapshot({ job: null, error: null });
      return;
    }
    const sessionKey = masterExportSessionKey(projectId, kind);
    setSnapshot(getMasterExportSnapshot(sessionKey));
    return subscribeMasterExport(sessionKey, () => {
      setSnapshot(getMasterExportSnapshot(sessionKey));
    });
  }, [projectId, kind]);

  const startExport = useCallback(async () => {
    if (!projectId) return;
    await startMasterExport(projectId, kind);
  }, [projectId, kind]);

  const downloadReady = useCallback(() => {
    if (!projectId) return;
    downloadMasterExport(masterExportSessionKey(projectId, kind));
  }, [projectId, kind]);

  return {
    startExport,
    preparing: isExportJobInProgress(snapshot.job?.status),
    job: snapshot.job,
    error: snapshot.error,
    downloadReady,
  };
}
