import { describe, it, expect } from "vitest";
import {
  isExportJobInProgress,
  shouldAutoDownload,
  formatExportDateRange,
} from "./report-export-job";

describe("report export job viewer helpers", () => {
  it("treats queued and running as in-progress", () => {
    expect(isExportJobInProgress("queued")).toBe(true);
    expect(isExportJobInProgress("running")).toBe(true);
    expect(isExportJobInProgress("ready")).toBe(false);
    expect(isExportJobInProgress("failed")).toBe(false);
  });

  it("auto-downloads only when this tab created the job and it just became ready", () => {
    expect(
      shouldAutoDownload({
        status: "ready",
        jobId: "job-1",
        createdThisSession: true,
        alreadyDownloaded: false,
      }),
    ).toBe(true);

    expect(
      shouldAutoDownload({
        status: "ready",
        jobId: "job-1",
        createdThisSession: true,
        alreadyDownloaded: true,
      }),
    ).toBe(false);

    expect(
      shouldAutoDownload({
        status: "ready",
        jobId: "job-1",
        createdThisSession: false,
        alreadyDownloaded: false,
      }),
    ).toBe(false);

    expect(
      shouldAutoDownload({
        status: "running",
        jobId: "job-1",
        createdThisSession: true,
        alreadyDownloaded: false,
      }),
    ).toBe(false);
  });

  it("formats the preparing banner date range", () => {
    expect(formatExportDateRange("2026-09-01", "2026-09-30")).toBe("2026-09-01 – 2026-09-30");
    expect(formatExportDateRange(undefined, undefined)).toBe("the selected range");
  });

  it("auto-downloads once after poll reaches ready, but not when restoring a ready job", () => {
    const sessionCreated = new Set(["job-session"]);
    const downloaded = new Set<string>();

    function onPoll(jobId: string, status: "queued" | "running" | "ready") {
      if (
        shouldAutoDownload({
          status,
          jobId,
          createdThisSession: sessionCreated.has(jobId),
          alreadyDownloaded: downloaded.has(jobId),
        })
      ) {
        downloaded.add(jobId);
        return true;
      }
      return false;
    }

    expect(onPoll("job-session", "queued")).toBe(false);
    expect(onPoll("job-session", "running")).toBe(false);
    expect(onPoll("job-session", "ready")).toBe(true);
    expect(onPoll("job-session", "ready")).toBe(false);

    expect(onPoll("job-restored", "ready")).toBe(false);
  });
});
