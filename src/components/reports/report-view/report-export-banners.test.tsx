import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ReportExportBanners } from "./report-export-banners";
import type { ReportExportJob } from "@/lib/reports/report-export-job";

function render(job: ReportExportJob | null, preparing = false, error: string | null = null) {
  return renderToStaticMarkup(<ReportExportBanners job={job} preparing={preparing} error={error} onDownload={vi.fn()} onRetry={vi.fn()} />);
}
describe("export banner visibility", () => {
  it("has no ready/download banner when empty or submitting", () => {
    expect(render(null)).toBe("");
    const html = render(null, true);
    expect(html).toContain("Preparing Excel");
    expect(html).not.toContain("Download Excel");
    expect(html).not.toContain("Excel is ready");
  });
  it("shows the ready button only for a ready job", () => {
    const html = render({ jobId: "new", reportId: "report", format: "xls", status: "ready", downloadUrl: "https://example.test/new" });
    expect(html).toContain("Excel is ready");
    expect(html).toContain("Download Excel");
  });
  it("shows an error without the old ready link", () => {
    const html = render(null, false, "Export failed");
    expect(html).toContain("Export failed");
    expect(html).not.toContain("Download Excel");
  });
});
