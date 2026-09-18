import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./api-client";
import { masterExportService } from "./master-export-service";
import {
  getMasterExportSnapshot,
  masterExportSessionKey,
  resetMasterExportSessionsForTests,
  startMasterExport,
  subscribeMasterExport,
} from "./master-export-session";

vi.mock("./master-export-service", () => ({
  masterExportService: {
    enqueueJob: vi.fn(),
    getJob: vi.fn(),
  },
}));

const downloadSpy = vi.fn();

vi.mock("@/lib/reports/report-export-job", async () => {
  const actual = await vi.importActual<typeof import("@/lib/reports/report-export-job")>(
    "@/lib/reports/report-export-job",
  );
  return {
    ...actual,
    triggerSignedUrlDownload: (...args: unknown[]) => downloadSpy(...args),
  };
});

const enqueueJob = vi.mocked(masterExportService.enqueueJob);
const getJob = vi.mocked(masterExportService.getJob);

describe("master export session", () => {
  const projectId = "proj-1";
  const kind = "users" as const;
  const key = masterExportSessionKey(projectId, kind);

  afterEach(() => {
    resetMasterExportSessionsForTests();
    downloadSpy.mockReset();
    enqueueJob.mockReset();
    getJob.mockReset();
    vi.useRealTimers();
  });

  it("keeps polling and auto-downloads after the page unsubscribes (tab switch)", async () => {
    vi.useFakeTimers();
    enqueueJob.mockResolvedValue({ jobId: "job-1", status: "queued" });
    getJob
      .mockResolvedValueOnce({
        jobId: "job-1",
        status: "running",
        kind,
        projectId,
        progress: "Writing",
      })
      .mockResolvedValueOnce({
        jobId: "job-1",
        status: "ready",
        kind,
        projectId,
        fileName: "Users_Export-job-1.xlsx",
        downloadUrl: "https://signed.example/file",
      });

    await startMasterExport(projectId, kind);
    const unsubscribe = subscribeMasterExport(key, () => undefined);
    unsubscribe();

    await vi.advanceTimersByTimeAsync(2000);
    expect(getMasterExportSnapshot(key).job?.status).toBe("running");

    await vi.advanceTimersByTimeAsync(2000);
    expect(getMasterExportSnapshot(key).job?.status).toBe("ready");
    expect(downloadSpy).toHaveBeenCalledWith(
      "https://signed.example/file",
      "Users_Export-job-1.xlsx",
    );

    const remount = getMasterExportSnapshot(key);
    expect(remount.job?.status).toBe("ready");
    expect(remount.job?.downloadUrl).toBe("https://signed.example/file");
  });

  it("resumes the in-progress job from a 409 instead of starting over", async () => {
    enqueueJob.mockRejectedValue(
      new ApiError(409, "CONFLICT", undefined, "An export is already in progress", {
        jobId: "job-existing",
      }),
    );
    getJob.mockResolvedValue({
      jobId: "job-existing",
      status: "running",
      kind,
      projectId,
      progress: "Writing",
    });

    await startMasterExport(projectId, kind);

    expect(getMasterExportSnapshot(key).job).toMatchObject({
      jobId: "job-existing",
      status: "running",
    });
    expect(getMasterExportSnapshot(key).error).toBeNull();
  });
});
