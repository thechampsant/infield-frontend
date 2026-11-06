import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./api-client";
import { reportConfigService } from "./report-config-service";
import { triggerSignedUrlDownload, type ReportExportJob } from "@/lib/reports/report-export-job";
import {
  clearReportExport, createReportExportVisitId, downloadReportExport,
  getReportExportSnapshot, reportExportSessionKey, resetReportExportSessionsForTests,
  startReportExport, subscribeReportExport,
} from "./report-export-session";

vi.mock("./report-config-service", () => ({ reportConfigService: {
  enqueueExportJob: vi.fn(), getExportJob: vi.fn(), getLatestExportJob: vi.fn(),
} }));
vi.mock("@/lib/reports/report-export-job", async (original) => ({
  ...await original<typeof import("@/lib/reports/report-export-job")>(),
  triggerSignedUrlDownload: vi.fn(),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function job(jobId = "new", status: ReportExportJob["status"] = "ready"): ReportExportJob {
  return { jobId, status, reportId: "report", format: "xls", downloadUrl: status === "ready" ? `https://example.test/${jobId}` : undefined };
}
function request(sessionKey: string) {
  return { sessionKey, projectId: "project", reportId: "report", filters: {}, format: "xls" as const, fromDate: "2026-11-01", toDate: "2026-11-05" };
}
const empty = { job: null, error: null, starting: false };
const enqueue = vi.mocked(reportConfigService.enqueueExportJob);
const status = vi.mocked(reportConfigService.getExportJob);
let key: string;

describe("current-visit report exports", () => {
  beforeEach(() => {
    vi.resetAllMocks(); vi.useFakeTimers();
    key = reportExportSessionKey("project", "report", createReportExportVisitId());
    subscribeReportExport(key, vi.fn());
    enqueue.mockResolvedValue({ jobId: "new", status: "queued" });
    status.mockResolvedValue(job());
  });
  afterEach(() => {
    resetReportExportSessionsForTests(); vi.useRealTimers(); vi.unstubAllGlobals();
  });

  it("ignores saved jobs and makes no historical lookups on entry", () => {
    const getItem = vi.fn(() => JSON.stringify({ jobId: "old", createdThisSession: true }));
    vi.stubGlobal("sessionStorage", { getItem });
    const next = reportExportSessionKey("project", "report", createReportExportVisitId());
    subscribeReportExport(next, vi.fn());
    expect(getReportExportSnapshot(next)).toEqual(empty);
    expect(getItem).not.toHaveBeenCalled();
    expect(status).not.toHaveBeenCalled();
    expect(reportConfigService.getLatestExportJob).not.toHaveBeenCalled();
    expect(triggerSignedUrlDownload).not.toHaveBeenCalled();
  });

  it("publishes starting immediately and deduplicates same-tick clicks", async () => {
    const pending = deferred<Awaited<ReturnType<typeof reportConfigService.enqueueExportJob>>>();
    enqueue.mockReturnValue(pending.promise);
    const first = startReportExport(request(key));
    expect(getReportExportSnapshot(key)).toEqual({ ...empty, starting: true });
    await startReportExport(request(key));
    expect(enqueue).toHaveBeenCalledTimes(1);
    pending.resolve({ jobId: "new", status: "queued" });
    await first;
    expect(getReportExportSnapshot(key).job?.jobId).toBe("new");
  });

  it("downloads only the current ready file once and permits explicit re-download", async () => {
    await startReportExport(request(key));
    await vi.advanceTimersByTimeAsync(3000);
    expect(triggerSignedUrlDownload).toHaveBeenCalledExactlyOnceWith("https://example.test/new", undefined);
    downloadReportExport(key);
    expect(triggerSignedUrlDownload).toHaveBeenCalledTimes(2);
    clearReportExport(key);
    expect(getReportExportSnapshot(key)).toEqual(empty);
    downloadReportExport(key);
    expect(triggerSignedUrlDownload).toHaveBeenCalledTimes(2);
  });

  it("clears a previous ready link before the next enqueue resolves", async () => {
    await startReportExport(request(key));
    const pending = deferred<Awaited<ReturnType<typeof reportConfigService.enqueueExportJob>>>();
    enqueue.mockReturnValueOnce(pending.promise);
    const next = startReportExport(request(key));
    expect(getReportExportSnapshot(key)).toEqual({ ...empty, starting: true });
    pending.reject(new Error("Network unavailable"));
    await next;
    expect(getReportExportSnapshot(key)).toEqual({ ...empty, error: "Network unavailable" });
  });

  it.each([false, true])("ignores old submission success/failure after clearing (failure=%s)", async (failure) => {
    const pending = deferred<Awaited<ReturnType<typeof reportConfigService.enqueueExportJob>>>();
    enqueue.mockReturnValueOnce(pending.promise);
    const first = startReportExport(request(key));
    clearReportExport(key);
    if (failure) pending.reject(new Error("Old failure"));
    else pending.resolve({ jobId: "old", status: "queued" });
    await first;
    expect(getReportExportSnapshot(key)).toEqual(empty);
    expect(status).not.toHaveBeenCalled();
    expect(triggerSignedUrlDownload).not.toHaveBeenCalled();
  });

  it("ignores an old status response while a newer export is pending", async () => {
    const old = deferred<ReportExportJob>();
    status.mockReturnValueOnce(old.promise);
    await startReportExport(request(key));
    clearReportExport(key);
    enqueue.mockResolvedValueOnce({ jobId: "second", status: "queued" });
    status.mockResolvedValue(job("second", "running"));
    await startReportExport(request(key));
    old.resolve(job("new"));
    await vi.advanceTimersByTimeAsync(1000);
    expect(getReportExportSnapshot(key).job?.jobId).toBe("second");
    expect(triggerSignedUrlDownload).not.toHaveBeenCalled();
    status.mockResolvedValue(job("second"));
    await vi.advanceTimersByTimeAsync(1000);
    expect(triggerSignedUrlDownload).toHaveBeenCalledExactlyOnceWith("https://example.test/second", undefined);
  });

  it("does not overlap status calls and recovers from temporary status failures", async () => {
    const pending = deferred<ReportExportJob>();
    status.mockReturnValueOnce(pending.promise);
    await startReportExport(request(key));
    await vi.advanceTimersByTimeAsync(3000);
    expect(status).toHaveBeenCalledTimes(1);
    pending.reject(new Error("Temporary"));
    await vi.advanceTimersByTimeAsync(1000);
    expect(getReportExportSnapshot(key).job?.status).toBe("ready");
  });

  it("does not adopt a conflict's old job", async () => {
    enqueue.mockRejectedValueOnce(new ApiError(409, "CONFLICT", undefined, "An export is already in progress", { jobId: "old" }));
    await startReportExport(request(key));
    expect(getReportExportSnapshot(key)).toEqual({ ...empty, error: "An export is already in progress" });
    expect(status).not.toHaveBeenCalled();
    expect(triggerSignedUrlDownload).not.toHaveBeenCalled();
  });

  it("keeps a generation failure without an older file", async () => {
    status.mockResolvedValueOnce({ ...job("new", "failed"), error: "Generation failed" });
    await startReportExport(request(key));
    expect(getReportExportSnapshot(key).job?.status).toBe("failed");
    downloadReportExport(key);
    expect(triggerSignedUrlDownload).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("releases the visit on exit and ignores late responses even if the key is reused", async () => {
    const exit = subscribeReportExport("exit-key", vi.fn());
    const pending = deferred<ReportExportJob>();
    status.mockReturnValueOnce(pending.promise);
    await startReportExport(request("exit-key"));
    exit();
    subscribeReportExport("exit-key", vi.fn());
    pending.resolve(job());
    await vi.advanceTimersByTimeAsync(2000);
    expect(getReportExportSnapshot("exit-key")).toEqual(empty);
    expect(triggerSignedUrlDownload).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("isolates report, project and visit identity", async () => {
    await startReportExport(request(key));
    for (const next of [
      reportExportSessionKey("project", "report", createReportExportVisitId()),
      reportExportSessionKey("other-project", "report", 1),
      reportExportSessionKey("project", "other-report", 1),
    ]) {
      subscribeReportExport(next, vi.fn());
      expect(getReportExportSnapshot(next)).toEqual(empty);
    }
    expect(getReportExportSnapshot(key).job?.status).toBe("ready");
  });

  it("prevents another enqueue while the current export is generating", async () => {
    status.mockResolvedValue(job("new", "running"));
    await startReportExport(request(key));
    await startReportExport(request(key));
    expect(enqueue).toHaveBeenCalledTimes(1);
  });

  it("cannot restart tracking if a submission returns after leaving", async () => {
    const exit = subscribeReportExport("leaving", vi.fn());
    const pending = deferred<Awaited<ReturnType<typeof reportConfigService.enqueueExportJob>>>();
    enqueue.mockReturnValueOnce(pending.promise);
    const submission = startReportExport(request("leaving"));
    exit();
    pending.resolve({ jobId: "old", status: "queued" });
    await submission;
    expect(status).not.toHaveBeenCalled();
    expect(triggerSignedUrlDownload).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("an old status finally cannot unlock a newer in-flight poll", async () => {
    const old = deferred<ReportExportJob>();
    const current = deferred<ReportExportJob>();
    status.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
    await startReportExport(request(key));
    clearReportExport(key);
    enqueue.mockResolvedValueOnce({ jobId: "second", status: "queued" });
    await startReportExport(request(key));
    old.resolve(job("new"));
    await vi.advanceTimersByTimeAsync(3000);
    expect(status).toHaveBeenCalledTimes(2);
    expect(triggerSignedUrlDownload).not.toHaveBeenCalled();
    current.resolve(job("second"));
    await vi.advanceTimersByTimeAsync(1000);
    expect(getReportExportSnapshot(key).job?.jobId).toBe("second");
    expect(triggerSignedUrlDownload).toHaveBeenCalledExactlyOnceWith("https://example.test/second", undefined);
  });
});
