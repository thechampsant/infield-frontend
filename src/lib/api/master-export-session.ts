import { ApiError } from "./api-client";
import {
  masterExportService,
  type MasterExportJob,
  type MasterExportKind,
} from "./master-export-service";
import {
  isExportJobInProgress,
  shouldAutoDownload,
  triggerSignedUrlDownload,
} from "@/lib/reports/report-export-job";

export interface MasterExportSnapshot {
  job: MasterExportJob | null;
  error: string | null;
}

interface MasterExportSession {
  job: MasterExportJob | null;
  error: string | null;
  createdThisSession: boolean;
  alreadyDownloaded: boolean;
  hydrated: boolean;
  pollTimer: ReturnType<typeof setInterval> | null;
  pollInFlight: boolean;
  listeners: Set<() => void>;
}

const POLL_MS = 2000;
const sessions = new Map<string, MasterExportSession>();

export function masterExportSessionKey(projectId: string, kind: MasterExportKind): string {
  return `${projectId}:${kind}`;
}

function storageKey(key: string): string {
  return `whynest.master-export.${key}`;
}

function getOrCreate(key: string): MasterExportSession {
  let session = sessions.get(key);
  if (!session) {
    session = {
      job: null,
      error: null,
      createdThisSession: false,
      alreadyDownloaded: false,
      hydrated: false,
      pollTimer: null,
      pollInFlight: false,
      listeners: new Set(),
    };
    sessions.set(key, session);
  }
  return session;
}

function notify(session: MasterExportSession): void {
  session.listeners.forEach((listener) => listener());
}

function readPersisted(key: string): {
  jobId: string;
  createdThisSession: boolean;
  alreadyDownloaded: boolean;
} | null {
  try {
    if (typeof sessionStorage === "undefined") return null;
    const raw = sessionStorage.getItem(storageKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      jobId?: string;
      createdThisSession?: boolean;
      alreadyDownloaded?: boolean;
    };
    if (!parsed.jobId) return null;
    return {
      jobId: parsed.jobId,
      createdThisSession: Boolean(parsed.createdThisSession),
      alreadyDownloaded: Boolean(parsed.alreadyDownloaded),
    };
  } catch {
    return null;
  }
}

function clearPersisted(key: string): void {
  try {
    if (typeof sessionStorage === "undefined") return;
    sessionStorage.removeItem(storageKey(key));
  } catch {
    /* private mode / quota */
  }
}

function persist(key: string, session: MasterExportSession): void {
  try {
    if (typeof sessionStorage === "undefined") return;
    if (!session.job) {
      clearPersisted(key);
      return;
    }
    sessionStorage.setItem(
      storageKey(key),
      JSON.stringify({
        jobId: session.job.jobId,
        createdThisSession: session.createdThisSession,
        alreadyDownloaded: session.alreadyDownloaded,
      }),
    );
  } catch {
    /* private mode / quota */
  }
}

function maybeAutoDownload(session: MasterExportSession): void {
  const job = session.job;
  if (!job?.downloadUrl) return;
  if (
    !shouldAutoDownload({
      status: job.status,
      jobId: job.jobId,
      createdThisSession: session.createdThisSession,
      alreadyDownloaded: session.alreadyDownloaded,
    })
  ) {
    return;
  }
  session.alreadyDownloaded = true;
  triggerSignedUrlDownload(job.downloadUrl, job.fileName);
}

function stopPoll(session: MasterExportSession): void {
  if (session.pollTimer == null) return;
  clearInterval(session.pollTimer);
  session.pollTimer = null;
}

async function tick(key: string, session: MasterExportSession): Promise<void> {
  if (!session.job || session.pollInFlight) return;
  session.pollInFlight = true;
  try {
    const next = await masterExportService.getJob(session.job.jobId);
    session.job = next;
    maybeAutoDownload(session);
    persist(key, session);
    notify(session);
    if (!isExportJobInProgress(next.status)) {
      stopPoll(session);
    }
  } catch {
    /* keep last known status */
  } finally {
    session.pollInFlight = false;
  }
}

function startPoll(key: string, session: MasterExportSession): void {
  if (session.pollTimer != null) return;
  if (!session.job || !isExportJobInProgress(session.job.status)) return;
  session.pollTimer = setInterval(() => {
    void tick(key, session);
  }, POLL_MS);
}

async function hydrate(key: string, session: MasterExportSession): Promise<void> {
  if (session.job) {
    if (isExportJobInProgress(session.job.status)) startPoll(key, session);
    return;
  }
  const saved = readPersisted(key);
  if (!saved) return;
  session.createdThisSession = saved.createdThisSession;
  session.alreadyDownloaded = saved.alreadyDownloaded;
  try {
    const job = await masterExportService.getJob(saved.jobId);
    if (session.job) return;
    session.job = job;
    maybeAutoDownload(session);
    persist(key, session);
    notify(session);
    if (isExportJobInProgress(job.status)) startPoll(key, session);
  } catch {
    clearPersisted(key);
  }
}

export function getMasterExportSnapshot(key: string): MasterExportSnapshot {
  const session = getOrCreate(key);
  return { job: session.job, error: session.error };
}

export function subscribeMasterExport(key: string, listener: () => void): () => void {
  const session = getOrCreate(key);
  session.listeners.add(listener);
  if (!session.hydrated) {
    session.hydrated = true;
    void hydrate(key, session);
  } else if (session.job && isExportJobInProgress(session.job.status)) {
    startPoll(key, session);
  }
  return () => {
    session.listeners.delete(listener);
  };
}

export async function startMasterExport(
  projectId: string,
  kind: MasterExportKind,
): Promise<void> {
  const key = masterExportSessionKey(projectId, kind);
  const session = getOrCreate(key);
  session.hydrated = true;
  session.error = null;
  notify(session);

  try {
    const queued = await masterExportService.enqueueJob(projectId, kind);
    session.createdThisSession = true;
    session.alreadyDownloaded = false;
    session.job = {
      jobId: queued.jobId,
      status: queued.status,
      kind,
      projectId,
      progress: "Queued",
    };
    persist(key, session);
    notify(session);
    startPoll(key, session);
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      const jobId = typeof err.details?.jobId === "string" ? err.details.jobId : undefined;
      if (jobId) {
        session.createdThisSession = true;
        try {
          session.job = await masterExportService.getJob(jobId);
          maybeAutoDownload(session);
          persist(key, session);
          notify(session);
          if (isExportJobInProgress(session.job.status)) startPoll(key, session);
          return;
        } catch {
          /* fall through */
        }
      }
    }
    session.error = err instanceof Error ? err.message : "Failed to start export. Please try again.";
    notify(session);
  }
}

export function downloadMasterExport(key: string): void {
  const session = getOrCreate(key);
  if (!session.job?.downloadUrl) return;
  session.alreadyDownloaded = true;
  persist(key, session);
  triggerSignedUrlDownload(session.job.downloadUrl, session.job.fileName);
}

export function resetMasterExportSessionsForTests(): void {
  for (const session of sessions.values()) {
    stopPoll(session);
  }
  sessions.clear();
}
