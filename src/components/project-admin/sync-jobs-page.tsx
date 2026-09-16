"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, LoaderCircle, Play, RefreshCw } from "lucide-react";
import { If2Toast, type ToastState } from "@/components/accounts/if2-toast";
import { Modal } from "@/components/project-admin/shared/modal";
import { ApiError } from "@/lib/api/api-client";
import { formatApiError } from "@/lib/api";
import {
  integrationSyncService,
  type SyncJob,
  type SyncRun,
  type SyncRunDetail,
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

function displayFor(jobKey: string) {
  return DISPLAY[jobKey] ?? {
    label: jobKey.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
    description: "Operational integration sync.",
  };
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
    try {
      const [nextJobs, nextRuns] = await Promise.all([
        integrationSyncService.listJobs(projectId),
        integrationSyncService.listRuns(projectId),
      ]);
      setJobs(nextJobs);
      setRuns(nextRuns);
      setActiveRunIdByJob((previous) => {
        const next = { ...previous };
        nextRuns.forEach((run) => {
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
    }
  }, [projectId]);

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
      ...runs.filter((run) => run.status === "running").map((run) => run.runId),
      ...Object.values(activeRunIdByJob),
    ])),
    [runs, activeRunIdByJob],
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

  const latestByJob = useMemo(() => {
    const result = new Map<string, SyncRun>();
    runs.forEach((run) => {
      if (!result.has(run.jobKey)) result.set(run.jobKey, run);
    });
    return result;
  }, [runs]);

  async function openRunDetail(runId: string) {
    setExpandedRunId((current) => current === runId ? null : runId);
    if (!details[runId]) await loadDetail(runId);
  }

  async function startRun() {
    if (!confirmJob || !projectId) return;
    setStarting(true);
    try {
      const response = await integrationSyncService.startRun(confirmJob.jobKey, projectId, targetDate);
      setActiveRunIdByJob((previous) => ({ ...previous, [confirmJob.jobKey]: response.runId }));
      setConfirmJob(null);
      setToast({ type: "success", message: `Sync run started: ${response.runId}` });
      await load();
      await loadDetail(response.runId);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const activeRunId = typeof err.details?.activeRunId === "string" ? err.details.activeRunId : null;
        setConfirmJob(null);
        setToast({ type: "error", message: "A run is already in progress." });
        if (activeRunId) {
          setActiveRunIdByJob((previous) => ({ ...previous, [confirmJob.jobKey]: activeRunId }));
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
        const latest = latestByJob.get(job.jobKey) ?? (forcedRunId ? details[forcedRunId] : undefined);
        const isRunning = latest?.status === "running" || Boolean(forcedRunId);
        const status = isRunning ? "running" : (latest?.status ?? "available");
        const display = displayFor(job.jobKey);
        const detail = latest ? details[latest.runId] : undefined;
        const completion = latest?.total ? Math.min(100, Math.round((latest.completed / latest.total) * 100)) : 0;
        return <article key={job.jobKey} className="sync-job-card">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start", flexWrap: "wrap" }}>
            <div><div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><h2 style={{ margin: 0, fontSize: 17, color: "var(--navy)" }}>{display.label}</h2><span style={{ ...statusStyle(status), borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 700 }}>{statusLabel(status)}</span>{job.manualOnly && <span className="sync-job-card__manual-badge">Manual only</span>}</div><p style={{ margin: "7px 0 0", color: "var(--text-mid)", fontSize: 13 }}>{display.description}</p></div>
            <div className="sync-job-card__actions"><button className="sync-jobs-button sync-jobs-button--secondary" type="button" onClick={() => setHistoryJob(job)}>View history</button><button className="sync-jobs-button sync-jobs-button--primary" type="button" disabled={isRunning} onClick={() => { setTargetDate(previousIstDate()); setConfirmJob(job); }}><Play size={14} /> {isRunning ? "Run in progress" : "Run now"}</button></div>
          </div>
          <div className="sync-job-card__meta">
            <Info label="Schedule" value={`${schedule(job)}${job.timezone ? ` · ${job.timezone}` : ""}`} /><Info label="Last run" value={formatDateTime(latest?.startedAt)} /><Info label="Last result" value={latest ? statusLabel(latest.status) : "No runs yet"} />
          </div>
          {latest && <div className={`sync-job-card__progress${isRunning ? " sync-job-card__progress--active" : ""}`}><div className="sync-job-card__progress-heading"><strong>{isRunning ? "Live progress" : "Latest run"}</strong><span>{latest.completed}/{latest.total} completed</span></div><div className="sync-job-card__progress-track"><span style={{ width: `${completion}%` }} /></div><div className="sync-job-card__counts"><span><b>{latest.total}</b>Total</span><span><b>{latest.completed}</b>Completed</span><span><b>{latest.succeeded}</b>Succeeded</span><span><b>{latest.failed}</b>Failed</span></div>{isRunning && detail && <div className="sync-job-card__updating">Run details are updating automatically.</div>}</div>}
        </article>;
      })}

      <HistoryModal job={historyJob} runs={runs} details={details} expandedRunId={expandedRunId} onClose={() => setHistoryJob(null)} onToggle={openRunDetail} />
      <Modal open={Boolean(confirmJob)} onClose={() => !starting && setConfirmJob(null)} title="Run sync job" footer={<><button className="sync-jobs-button sync-jobs-button--secondary" type="button" disabled={starting} onClick={() => setConfirmJob(null)}>Cancel</button><button className="sync-jobs-button sync-jobs-button--primary" type="button" disabled={starting} onClick={startRun}>{starting ? "Starting…" : "Start run"}</button></>}>
        {confirmJob && <div style={{ display: "grid", gap: 15 }}><div><strong>{displayFor(confirmJob.jobKey).label}</strong><p style={{ margin: "5px 0 0", color: "var(--text-mid)" }}>This imports real operational data.</p></div><label style={{ display: "grid", gap: 6, fontWeight: 700 }}>IST target date<input type="date" value={targetDate} max={previousIstDate()} onChange={(event) => setTargetDate(event.target.value)} /></label>{confirmJob.jobKey === "prj-000010-attendance-sync-test" && <div style={{ display: "flex", gap: 9, padding: 12, borderRadius: 10, background: "var(--amber-light)", color: "var(--amber-dark)" }}><AlertTriangle size={18} /><span>This test job imports attendance for exactly one configured user. It writes to the real attendance collection.</span></div>}</div>}
      </Modal>
      <If2Toast toast={toast} onDismiss={() => setToast(null)} />
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) { return <div><div style={{ color: "var(--text-light)", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>{label}</div><div style={{ color: "var(--text)", marginTop: 4 }}>{value}</div></div>; }

function HistoryModal({ job, runs, details, expandedRunId, onClose, onToggle }: { job: SyncJob | null; runs: SyncRun[]; details: Record<string, SyncRunDetail>; expandedRunId: string | null; onClose: () => void; onToggle: (runId: string) => void }) {
  const jobRuns = job ? runs.filter((run) => run.jobKey === job.jobKey) : [];
  return <Modal open={Boolean(job)} onClose={onClose} title={job ? `${displayFor(job.jobKey).label} — History` : "Run history"} width={760}>
    {jobRuns.length === 0 ? <div className="pa-loading">No runs yet.</div> : <div style={{ display: "grid", gap: 10 }}>{jobRuns.map((run) => <div key={run.runId} style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}><button type="button" onClick={() => void onToggle(run.runId)} style={{ width: "100%", padding: 14, border: 0, background: "var(--surface)", textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", gap: 12 }}><span><strong>{run.runId}</strong><br /><small>{run.trigger === "manual" ? "Manual" : "Scheduled"} · {run.targetDate ?? "—"} · {formatDateTime(run.startedAt)}</small></span><span style={{ display: "flex", alignItems: "center", gap: 8 }}>{statusLabel(run.status)} {expandedRunId === run.runId ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span></button>{expandedRunId === run.runId && <RunDetail run={details[run.runId] ?? run} />}</div>)}</div>}
  </Modal>;
}

function RunDetail({ run }: { run: SyncRun | SyncRunDetail }) { const detail = "batches" in run ? run : null; return <div style={{ padding: 14, borderTop: "1px solid var(--border)", fontSize: 13 }}><div>Total {run.total} · Succeeded {run.succeeded} · Failed {run.failed} · {run.completedAt ? `Completed ${formatDateTime(run.completedAt)}` : "In progress"}</div>{errorText(run.errorSummary) && <p style={{ color: "var(--red)", marginBottom: 0 }}>{errorText(run.errorSummary)}</p>}{detail?.batches.map((batch) => <div key={batch.batchNumber} style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>Batch {batch.batchNumber} · {batch.attempts} attempt{batch.attempts === 1 ? "" : "s"} · {batch.succeeded} succeeded · {batch.failed} failed · {batch.missingUsers} missing users · {batch.regularizationPreserved} regularization-preserved{errorText(batch.errorSummary) && <div style={{ color: "var(--red)", marginTop: 4 }}>{errorText(batch.errorSummary)}</div>}</div>)}</div>; }
