"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, LoaderCircle, Play, RefreshCw } from "lucide-react";
import { If2Toast, type ToastState } from "@/components/accounts/if2-toast";
import { Modal } from "@/components/project-admin/shared/modal";
import { ApiError } from "@/lib/api/api-client";
import { formatApiError } from "@/lib/api";
import {
  integrationSyncService,
  type SyncBatch,
  type SyncJob,
  type SyncRun,
  type SyncRunDetail,
  type SyncRunPageMeta,
} from "@/lib/api/integration-sync-service";
import { useProjectContext } from "@/lib/project-admin/project-context";

const DISPLAY: Record<string, { label: string; description: string }> = {
  "prj-000010-attendance-sync": {
    label: "Attendance Sync",
    description: "Imports Havells attendance for the previous IST day.",
  },
  "prj-000010-attendance-sync-test": {
    label: "Attendance Sync — Test User",
    description: "Manual-only real attendance import for one configured test user.",
  },
};

function displayFor(job: Pick<SyncJob, "jobKey" | "name">, run?: SyncRun) {
  const known = DISPLAY[job.jobKey];
  return {
    label: job.name?.trim() || run?.configSnapshot?.name?.trim() || known?.label || job.jobKey.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
    description: known?.description ?? "Operational integration sync.",
  };
}

function isValidHistoricalDate(value: string) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value > previousIstDate()) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

function previousIstDate(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const istMidnight = new Date(`${value("year")}-${value("month")}-${value("day")}T00:00:00+05:30`);
  istMidnight.setDate(istMidnight.getDate() - 1);
  return istMidnight.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date) + " IST";
}

function errorText(value?: string | null) {
  if (!value) return null;
  return value.length > 500 ? `${value.slice(0, 500)}…` : value;
}

function schedule(job: SyncJob) {
  if (job.manualOnly) return "Manual only";
  if (job.cronExpression === "0 2 * * *") return "Daily at 02:00";
  return job.cronExpression ? "Scheduled" : "Schedule not provided";
}

function statusLabel(status: string) {
  return status === "partial_failed" ? "Partial failure" : status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function statusStyle(status: string) {
  if (status === "running") return { background: "var(--amber-light)", color: "var(--amber-dark)" };
  if (status === "completed" || status === "available") return { background: "var(--teal-light)", color: "var(--teal-dark)" };
  return { background: "var(--red-light)", color: "var(--red)" };
}

export function SyncJobsPage() {
  const { projectId, projectName } = useProjectContext();
  const [jobs, setJobs] = useState<SyncJob[]>([]);
  const [runs, setRuns] = useState<SyncRun[]>([]);
  const [latestRuns, setLatestRuns] = useState<Record<string, SyncRun>>({});
  const [historyMeta, setHistoryMeta] = useState<SyncRunPageMeta | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [details, setDetails] = useState<Record<string, SyncRunDetail>>({});
  const [activeRunIdByJob, setActiveRunIdByJob] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [historyJob, setHistoryJob] = useState<SyncJob | null>(null);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [confirmJob, setConfirmJob] = useState<SyncJob | null>(null);
  const [targetDate, setTargetDate] = useState(previousIstDate);
  const [starting, setStarting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setHistoryLoading(true);
    try {
      const nextJobs = await integrationSyncService.listJobs(projectId);
      const [history, latestPages] = await Promise.all([
        integrationSyncService.listRuns(projectId, {
          jobKey: historyJob?.jobKey,
          page: historyPage,
          limit: 5,
        }),
        Promise.all(
          nextJobs.map((job) =>
            integrationSyncService.listRuns(projectId, {
              jobKey: job.jobKey,
              page: 1,
              limit: 1,
            }),
          ),
        ),
      ]);
      setJobs(nextJobs);
      setRuns(history.data);
      setHistoryMeta(history.meta);
      setLatestRuns(
        Object.fromEntries(
          nextJobs.flatMap((job, index) => {
            const latest = latestPages[index]?.data[0];
            return latest ? [[job.jobKey, latest] as const] : [];
          }),
        ),
      );
      setActiveRunIdByJob((previous) => {
        const next = { ...previous };
        latestPages.flatMap((page) => page.data).forEach((run) => {
          if (run.status === "running") next[run.jobKey] = run.runId;
        });
        return next;
      });
      setForbidden(false);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setForbidden(true);
        setError(null);
      } else {
        setError(formatApiError(err, "Failed to load sync jobs."));
      }
    } finally {
      setLoading(false);
      setHistoryLoading(false);
    }
  }, [projectId, historyJob?.jobKey, historyPage]);

  const loadDetail = useCallback(async (runId: string) => {
    if (!projectId) return;
    try {
      const detail = await integrationSyncService.getRun(runId, projectId);
      setDetails((previous) => ({ ...previous, [runId]: detail }));
      if (detail.status !== "running") {
        setActiveRunIdByJob((previous) => {
          const next = { ...previous };
          if (next[detail.jobKey] === runId) delete next[detail.jobKey];
          return next;
        });
      }
    } catch (err) {
      setToast({ type: "error", message: formatApiError(err, "Failed to load run details.") });
    }
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);

  const runningIds = useMemo(
    () => Array.from(new Set([
      ...Object.values(latestRuns).filter((run) => run.status === "running").map((run) => run.runId),
      ...Object.values(activeRunIdByJob),
    ])),
    [latestRuns, activeRunIdByJob],
  );

  useEffect(() => {
    if (!runningIds.length) return;
    const refresh = () => {
      void load();
      runningIds.forEach((runId) => void loadDetail(runId));
    };
    const timer = window.setInterval(refresh, 7_000);
    return () => window.clearInterval(timer);
  }, [load, loadDetail, runningIds]);

  async function openRunDetail(runId: string) {
    setExpandedRunId((current) => current === runId ? null : runId);
    if (!details[runId]) await loadDetail(runId);
  }

  async function startRun() {
    if (!confirmJob || !projectId) return;
    if (!isValidHistoricalDate(targetDate)) {
      setToast({ type: "error", message: "Choose a valid historical IST date, or leave the date blank." });
      return;
    }
    const job = confirmJob;
    setStarting(true);
    try {
      const response = await integrationSyncService.startRun(job.jobKey, projectId, targetDate || undefined);
      setActiveRunIdByJob((previous) => ({ ...previous, [job.jobKey]: response.runId }));
      setConfirmJob(null);
      setHistoryPage(1);
      setHistoryJob(job);
      setExpandedRunId(response.runId);
      setToast({ type: "success", message: "Sync run started." });
      await load();
      await loadDetail(response.runId);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const activeRunId = typeof err.details?.activeRunId === "string" ? err.details.activeRunId : null;
        setConfirmJob(null);
        setToast({ type: "error", message: "A run is already in progress." });
        if (activeRunId) {
          setActiveRunIdByJob((previous) => ({ ...previous, [job.jobKey]: activeRunId }));
          setHistoryJob(job);
          setExpandedRunId(activeRunId);
        }
        await load();
        if (activeRunId) await loadDetail(activeRunId);
      } else {
        setToast({ type: "error", message: formatApiError(err, "Unable to start sync job.") });
      }
    } finally {
      setStarting(false);
    }
  }

  if (loading) return <div className="pa-loading"><LoaderCircle className="spin" size={22} /> Loading sync jobs…</div>;
  if (forbidden) return <div className="pa-info-banner" style={{ color: "var(--red)", background: "var(--red-light)", borderColor: "var(--red-mid)" }}>You do not have access to this project’s sync jobs.</div>;
  if (error) return <div className="pa-info-banner" style={{ color: "var(--red)", background: "var(--red-light)", borderColor: "var(--red-mid)" }}>{error}</div>;

  return (
    <section className="sync-jobs-page">
      <div className="pa-page-header sync-jobs-page__header">
        <div><div className="pa-eyebrow">Operations</div><h1 className="pa-page-title">Sync Jobs</h1><p className="pa-page-desc">Monitor and manually run operational integrations for {projectName}.</p></div>
        <button type="button" className="sync-jobs-button sync-jobs-button--secondary sync-jobs-button--refresh" onClick={() => { setLoading(true); void load(); }}><RefreshCw size={15} /> Refresh</button>
      </div>

      {jobs.length === 0 ? <div className="pa-loading">No sync jobs are available for this project.</div> : jobs.map((job) => {
        const forcedRunId = activeRunIdByJob[job.jobKey];
        const latest = latestRuns[job.jobKey] ?? (forcedRunId ? details[forcedRunId] : undefined);
        const isRunning = latest?.status === "running" || Boolean(forcedRunId);
        const status = isRunning ? "running" : (latest?.status ?? "available");
        const display = displayFor(job, latest);
        const detail = latest ? details[latest.runId] : undefined;
        const completion = latest?.total ? Math.min(100, Math.round((latest.completed / latest.total) * 100)) : 0;
        return <article key={job.jobKey} className="sync-job-card">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start", flexWrap: "wrap" }}>
            <div><div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><h2 style={{ margin: 0, fontSize: 17, color: "var(--navy)" }}>{display.label}</h2><span style={{ ...statusStyle(status), borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 700 }}>{statusLabel(status)}</span>{job.manualOnly && <span className="sync-job-card__manual-badge">Manual only</span>}</div><div className="sync-job-card__key">{job.jobKey}</div><p style={{ margin: "7px 0 0", color: "var(--text-mid)", fontSize: 13 }}>{display.description}</p></div>
            <div className="sync-job-card__actions"><button className="sync-jobs-button sync-jobs-button--secondary" type="button" onClick={() => { setHistoryPage(1); setHistoryJob(job); }}>View history</button><button className="sync-jobs-button sync-jobs-button--primary" type="button" disabled={isRunning} onClick={() => { setTargetDate(previousIstDate()); setConfirmJob(job); }}><Play size={14} /> {isRunning ? "Run in progress" : "Run now"}</button></div>
          </div>
          <div className="sync-job-card__meta">
            <Info label="Schedule" value={`${schedule(job)}${job.timezone ? ` · ${job.timezone}` : ""}`} /><Info label="Last run" value={formatDateTime(latest?.startedAt)} /><Info label="Last result" value={latest ? statusLabel(latest.status) : "No runs yet"} />
          </div>
          {latest && <div className={`sync-job-card__progress${isRunning ? " sync-job-card__progress--active" : ""}`}><div className="sync-job-card__progress-heading"><strong>{isRunning ? "Live progress" : "Latest run"}</strong><span>{latest.completed}/{latest.total} completed</span></div><div className="sync-job-card__progress-track"><span style={{ width: `${completion}%` }} /></div><div className="sync-job-card__counts"><span><b>{latest.total}</b>Total</span><span><b>{latest.completed}</b>Completed</span><span><b>{latest.succeeded}</b>Succeeded</span><span><b>{latest.failed}</b>Failed</span></div>{isRunning && detail && <div className="sync-job-card__updating">Run details are updating automatically.</div>}</div>}
        </article>;
      })}

      <HistoryModal job={historyJob} runs={runs} meta={historyMeta} loading={historyLoading} details={details} expandedRunId={expandedRunId} onClose={() => { setHistoryJob(null); setHistoryPage(1); }} onToggle={openRunDetail} onPrevious={() => setHistoryPage((page) => Math.max(1, page - 1))} onNext={() => setHistoryPage((page) => page + 1)} />
      <Modal open={Boolean(confirmJob)} onClose={() => !starting && setConfirmJob(null)} title="Run sync job" footer={<><button className="sync-jobs-button sync-jobs-button--secondary" type="button" disabled={starting} onClick={() => setConfirmJob(null)}>Cancel</button><button className="sync-jobs-button sync-jobs-button--primary" type="button" disabled={starting} onClick={startRun}>{starting ? "Starting…" : "Start run"}</button></>}>
        {confirmJob && <div style={{ display: "grid", gap: 15 }}><div><strong>{displayFor(confirmJob).label}</strong><p style={{ margin: "5px 0 0", color: "var(--text-mid)" }}>This imports real operational data.</p></div><label className="sync-jobs-date-field">Attendance date to process<input type="date" value={targetDate} max={previousIstDate()} onChange={(event) => setTargetDate(event.target.value)} /><span>Leave blank to process the previous IST day.</span></label>{confirmJob.jobKey === "prj-000010-attendance-sync-test" && <div style={{ display: "flex", gap: 9, padding: 12, borderRadius: 10, background: "var(--amber-light)", color: "var(--amber-dark)" }}><AlertTriangle size={18} /><span>This test job imports attendance for exactly one configured user. It writes to the real attendance collection.</span></div>}</div>}
      </Modal>
      <If2Toast toast={toast} onDismiss={() => setToast(null)} />
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) { return <div><div style={{ color: "var(--text-light)", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>{label}</div><div style={{ color: "var(--text)", marginTop: 4 }}>{value}</div></div>; }

function HistoryModal({ job, runs, meta, loading, details, expandedRunId, onClose, onToggle, onPrevious, onNext }: { job: SyncJob | null; runs: SyncRun[]; meta: SyncRunPageMeta | null; loading: boolean; details: Record<string, SyncRunDetail>; expandedRunId: string | null; onClose: () => void; onToggle: (runId: string) => void; onPrevious: () => void; onNext: () => void }) {
  const jobRuns = job ? runs.filter((run) => run.jobKey === job.jobKey) : [];
  const pagination = meta ? <div className="sync-history-pagination"><span>Page {meta.page} of {Math.max(meta.totalPages, 1)} · {meta.totalCount} run{meta.totalCount === 1 ? "" : "s"}</span><div><button className="sync-jobs-button sync-jobs-button--secondary" type="button" disabled={loading || !meta.hasPrevPage} onClick={onPrevious}>Previous</button><button className="sync-jobs-button sync-jobs-button--primary" type="button" disabled={loading || !meta.hasNextPage} onClick={onNext}>Next</button></div></div> : null;
  return <Modal open={Boolean(job)} onClose={onClose} title={job ? `${displayFor(job).label} — History` : "Run history"} width={760} footer={pagination}>
    {loading ? <div className="pa-loading">Loading run history…</div> : jobRuns.length === 0 ? <div className="pa-loading">No runs yet.</div> : <div style={{ display: "grid", gap: 10 }}>{jobRuns.map((run) => <div key={run.runId} style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}><button type="button" onClick={() => void onToggle(run.runId)} style={{ width: "100%", padding: 14, border: 0, background: "var(--surface)", textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", gap: 12 }}><span><strong>{run.jobName ?? run.configSnapshot?.name ?? run.jobKey}</strong><br /><small>{run.trigger === "manual" ? "Manual" : "Scheduled"} · {run.targetDate ?? "—"} · {formatDateTime(run.startedAt)}</small></span><span style={{ display: "flex", alignItems: "center", gap: 8 }}>{statusLabel(run.status)} {expandedRunId === run.runId ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span></button>{expandedRunId === run.runId && <RunDetail run={details[run.runId] ?? run} />}</div>)}</div>}
  </Modal>;
}

function RunDetail({ run }: { run: SyncRun | SyncRunDetail }) { const detail = "batches" in run ? run : null; return <div className="sync-run-detail"><div>Total {run.total} · Completed {run.completed} · Succeeded {run.succeeded} · Failed {run.failed} · {run.completedAt ? `Completed ${formatDateTime(run.completedAt)}` : "In progress"}</div>{errorText(run.errorSummary) && <p className="sync-run-detail__error">{errorText(run.errorSummary)}</p>}{detail?.batches.map((batch) => { const failedOutcomes = (batch.userOutcomes ?? []).filter((outcome) => outcome.status === "failed"); return <div key={batch.batchNumber} className="sync-run-detail__batch"><div><strong>Batch {batch.batchNumber}</strong> · {statusLabel(batch.status)} · {batch.succeeded} succeeded · {batch.failed} failed · {Math.max(0, batch.attempts - 1)} retries · {batch.missingUsers} missing users <span className="sync-run-detail__preserved">· {batch.regularizationPreserved} regularization-preserved</span></div>{errorText(batch.errorSummary) && <div className="sync-run-detail__error">{errorText(batch.errorSummary)}</div>}{failedOutcomes.length > 0 && <UserOutcomesTable outcomes={failedOutcomes} />}</div>; })}</div>; }

function UserOutcomesTable({ outcomes }: { outcomes: SyncBatch["userOutcomes"] }) {
  const pageSize = 20;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(outcomes.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visibleOutcomes = outcomes.slice((safePage - 1) * pageSize, safePage * pageSize);

  return <div className="sync-run-outcomes"><div className="sync-run-outcomes__title">Failed user outcomes</div><div className="sync-run-outcomes__table" role="table"><div className="sync-run-outcomes__row sync-run-outcomes__row--head" role="row"><span role="columnheader">Identifier</span><span role="columnheader">Outcome</span><span role="columnheader">Reason</span></div>{visibleOutcomes.map((outcome, index) => <div className="sync-run-outcomes__row" role="row" key={`${outcome.identifier}-${outcome.status}-${index}`}><span role="cell">{outcome.identifier}</span><span role="cell">{statusLabel(outcome.status)}</span><span role="cell">{outcome.reason ?? "—"}</span></div>)}</div>{outcomes.length > pageSize && <div className="sync-run-outcomes__pagination"><span>Page {safePage} of {totalPages} · {outcomes.length} failed users</span><div><button className="sync-jobs-button sync-jobs-button--secondary" type="button" disabled={safePage === 1} onClick={() => setPage(Math.max(1, safePage - 1))}>Previous</button><button className="sync-jobs-button sync-jobs-button--primary" type="button" disabled={safePage === totalPages} onClick={() => setPage(Math.min(totalPages, safePage + 1))}>Next</button></div></div>}</div>;
}
