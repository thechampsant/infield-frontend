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
  starting: boolean;
}

interface ReportExportSession extends ReportExportSnapshot {
  generation: number;
  alreadyDownloaded: boolean;
  pollTimer: ReturnType<typeof setInterval> | null;
  pollInFlight: boolean;
  listeners: Set<() => void>;
}

const POLL_MS = 1000;
const sessions = new Map<string, ReportExportSession>();
let nextVisitId = 0;

export function createReportExportVisitId(): number {
  return ++nextVisitId;
}

export function reportExportSessionKey(projectId: string, reportId: string, visitId: number): string {
  return `${projectId}:${reportId}:${visitId}`;
}

function getOrCreate(key: string): ReportExportSession {
  let session = sessions.get(key);
  if (!session) {
    session = {
      job: null, error: null, starting: false, generation: 0,
      alreadyDownloaded: false, pollTimer: null, pollInFlight: false,
      listeners: new Set(),
    };
    sessions.set(key, session);
  }
  return session;
}

function notify(session: ReportExportSession): void {
  session.listeners.forEach((listener) => listener());
}

function isCurrent(key: string, session: ReportExportSession, generation: number): boolean {
  return sessions.get(key) === session && session.generation === generation;
}

function maybeAutoDownload(session: ReportExportSession): void {
  const job = session.job;
  if (!job?.downloadUrl || !shouldAutoDownload({
    status: job.status, jobId: job.jobId,
    createdThisSession: true, alreadyDownloaded: session.alreadyDownloaded,
  })) return;
  session.alreadyDownloaded = true;
  triggerSignedUrlDownload(job.downloadUrl, job.fileName);
}

function stopPoll(session: ReportExportSession): void {
  if (session.pollTimer != null) clearInterval(session.pollTimer);
  session.pollTimer = null;
}

function reset(session: ReportExportSession): void {
  ++session.generation;
  stopPoll(session);
  session.job = null;
  session.error = null;
  session.starting = false;
  session.alreadyDownloaded = false;
  session.pollInFlight = false;
}

/** Clear immediately, including ownership of outstanding submission/status responses. */
export function clearReportExport(key: string): void {
  const session = sessions.get(key);
  if (!session) return;
  reset(session);
  notify(session);
}

async function tick(key: string, session: ReportExportSession): Promise<void> {
  if (!session.job || session.pollInFlight) return;
  const generation = session.generation;
  const jobId = session.job.jobId;
  session.pollInFlight = true;
  try {
    const next = await reportConfigService.getExportJob(jobId);
    if (!isCurrent(key, session, generation) || session.job?.jobId !== jobId || next.jobId !== jobId) return;
    session.job = next;
    maybeAutoDownload(session);
    notify(session);
    if (!isExportJobInProgress(next.status)) stopPoll(session);
  } catch {
    // A temporary status failure keeps polling the same current job.
  } finally {
    if (isCurrent(key, session, generation)) session.pollInFlight = false;
  }
}

function startPoll(key: string, session: ReportExportSession): void {
  if (session.pollTimer != null || !session.job) return;
  if (isExportJobInProgress(session.job.status)) {
    session.pollTimer = setInterval(() => { void tick(key, session); }, POLL_MS);
  }
  // Fetch file metadata immediately, including if enqueue already reports ready.
  void tick(key, session);
}

export function getReportExportSnapshot(key: string): ReportExportSnapshot {
  const session = getOrCreate(key);
  return { job: session.job, error: session.error, starting: session.starting };
}

export function subscribeReportExport(key: string, listener: () => void): () => void {
  const session = getOrCreate(key);
  session.listeners.add(listener);
  listener();
  return () => {
    session.listeners.delete(listener);
    if (session.listeners.size === 0) {
      reset(session);
      if (sessions.get(key) === session) sessions.delete(key);
    }
  };
}

export async function startReportExport(args: {
  sessionKey: string;
  projectId: string;
  reportId: string;
  filters: Record<string, unknown>;
  format: "xls" | "csv";
  fromDate?: string;
  toDate?: string;
  estimatedTotal?: number;
}): Promise<void> {
  const key = args.sessionKey;
  const session = getOrCreate(key);
  if (session.starting || isExportJobInProgress(session.job?.status)) return;
  reset(session);
  const generation = session.generation;
  session.starting = true;
  notify(session);

  try {
    const queued = await reportConfigService.enqueueExportJob({
      reportId: args.reportId, filters: args.filters, format: args.format,
      fromDate: args.fromDate, toDate: args.toDate,
      projectId: args.projectId, estimatedTotal: args.estimatedTotal,
    });
    if (!isCurrent(key, session, generation)) return;
    session.starting = false;
    session.job = {
      jobId: queued.jobId, status: queued.status, reportId: args.reportId,
      format: args.format, fromDate: args.fromDate, toDate: args.toDate,
      progress: args.estimatedTotal ? `Generating Excel… 0 / ${args.estimatedTotal}` : "Queued",
    };
    notify(session);
    startPoll(key, session);
  } catch (err) {
    if (!isCurrent(key, session, generation)) return;
    session.starting = false;
    session.error = err instanceof Error ? err.message : "Failed to start export. Please try again.";
    notify(session);
  }
}

export function downloadReportExport(key: string): void {
  const session = sessions.get(key);
  if (session?.job?.status !== "ready" || !session.job.downloadUrl) return;
  session.alreadyDownloaded = true;
  triggerSignedUrlDownload(session.job.downloadUrl, session.job.fileName);
}

export function resetReportExportSessionsForTests(): void {
  sessions.forEach(reset);
  sessions.clear();
}
