import { ApiError } from "./api-client";
import { reportConfigService } from "./report-config-service";
import {
  isExportJobInProgress,
  shouldAutoDownload,
  triggerSignedUrlDownload,
  type ReportExportJob,
} from "@/lib/reports/report-export-job";

export interface ReportExportSnapshot {
  job: ReportExportJob | null;
  error: string | null;
}

interface ReportExportSession {
  job: ReportExportJob | null;
  error: string | null;
  createdThisSession: boolean;
  alreadyDownloaded: boolean;
  hydrated: boolean;
  pollTimer: ReturnType<typeof setInterval> | null;
  pollInFlight: boolean;
  listeners: Set<() => void>;
}

const POLL_MS = 1000;
const sessions = new Map<string, ReportExportSession>();

export function reportExportSessionKey(projectId: string, reportId: string): string {
  return `${projectId}:${reportId}`;
}

function storageKey(key: string): string {
  return `whynest.report-export.${key}`;
}

function getOrCreate(key: string): ReportExportSession {
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

function notify(session: ReportExportSession): void {
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

function persist(key: string, session: ReportExportSession): void {
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

function maybeAutoDownload(session: ReportExportSession): void {
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

function stopPoll(session: ReportExportSession): void {
  if (session.pollTimer == null) return;
  clearInterval(session.pollTimer);
  session.pollTimer = null;
}

async function tick(key: string, session: ReportExportSession): Promise<void> {
  if (!session.job || session.pollInFlight) return;
  session.pollInFlight = true;
  try {
    const next = await reportConfigService.getExportJob(session.job.jobId);
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

function startPoll(key: string, session: ReportExportSession): void {
  if (session.pollTimer != null) return;
  if (!session.job || !isExportJobInProgress(session.job.status)) return;
  session.pollTimer = setInterval(() => {
    void tick(key, session);
  }, POLL_MS);
}

async function hydrate(
  key: string,
  session: ReportExportSession,
  reportId: string,
): Promise<void> {
  if (session.job) {
    if (isExportJobInProgress(session.job.status)) startPoll(key, session);
    return;
  }
  const saved = readPersisted(key);
  if (saved) {
    session.createdThisSession = saved.createdThisSession;
    session.alreadyDownloaded = saved.alreadyDownloaded;
    try {
      const job = await reportConfigService.getExportJob(saved.jobId);
      if (session.job) return;
      session.job = job;
      maybeAutoDownload(session);
      persist(key, session);
      notify(session);
      if (isExportJobInProgress(job.status)) startPoll(key, session);
      return;
    } catch {
      clearPersisted(key);
    }
  }

  try {
    const latest = await reportConfigService.getLatestExportJob(reportId);
    if (session.job || !latest) return;
    session.job = latest;
    notify(session);
    if (isExportJobInProgress(latest.status)) startPoll(key, session);
  } catch {
    /* no prior job */
  }
}

export function getReportExportSnapshot(key: string): ReportExportSnapshot {
  const session = getOrCreate(key);
  return { job: session.job, error: session.error };
}

export function subscribeReportExport(
  key: string,
  reportId: string,
  listener: () => void,
): () => void {
  const session = getOrCreate(key);
  session.listeners.add(listener);
  if (!session.hydrated) {
    session.hydrated = true;
    void hydrate(key, session, reportId);
  } else if (session.job && isExportJobInProgress(session.job.status)) {
    startPoll(key, session);
  }
  return () => {
    session.listeners.delete(listener);
  };
}

export async function startReportExport(args: {
  projectId: string;
  reportId: string;
  filters: Record<string, unknown>;
  format: "xls" | "csv";
  fromDate?: string;
  toDate?: string;
  estimatedTotal?: number;
}): Promise<void> {
  const key = reportExportSessionKey(args.projectId, args.reportId);
  const session = getOrCreate(key);
  session.hydrated = true;
  session.error = null;
  notify(session);

  try {
    const queued = await reportConfigService.enqueueExportJob({
      reportId: args.reportId,
      filters: args.filters,
      format: args.format,
      fromDate: args.fromDate,
      toDate: args.toDate,
      projectId: args.projectId,
      estimatedTotal: args.estimatedTotal,
    });
    session.createdThisSession = true;
    session.alreadyDownloaded = false;
    session.job = {
      jobId: queued.jobId,
      status: queued.status,
      reportId: args.reportId,
      format: args.format,
      fromDate: args.fromDate,
      toDate: args.toDate,
      progress: args.estimatedTotal
        ? `Generating Excel… 0 / ${args.estimatedTotal}`
        : "Queued",
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
          session.job = await reportConfigService.getExportJob(jobId);
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
    session.error =
      err instanceof Error ? err.message : "Failed to start export. Please try again.";
    notify(session);
  }
}

export function downloadReportExport(key: string): void {
  const session = getOrCreate(key);
  if (!session.job?.downloadUrl) return;
  session.alreadyDownloaded = true;
  persist(key, session);
  triggerSignedUrlDownload(session.job.downloadUrl, session.job.fileName);
}

export function resetReportExportSessionsForTests(): void {
  for (const session of sessions.values()) {
    stopPoll(session);
  }
  sessions.clear();
}
