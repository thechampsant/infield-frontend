import type { ReportConfigDocument } from "@/lib/api/report-config-service";

const REPORTS_CHANGED_EVENT = "infield:reports-changed";
const REPORT_TITLE_CHANGED_EVENT = "infield:report-title-changed";

const reportTitleCache = new Map<string, string>();

export function isReportFavoriteForUser(
  report: Pick<ReportConfigDocument, "favorites">,
  user?: { id?: string | null; _id?: string | null } | null,
): boolean {
  const favorites = report.favorites || [];
  if (favorites.length === 0) return false;
  const userIds = [user?.id, user?._id]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim());
  if (userIds.length === 0) return false;
  return favorites.some((favId) => userIds.includes(String(favId)));
}

export function notifyReportsChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(REPORTS_CHANGED_EVENT));
}

export function subscribeReportsChanged(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(REPORTS_CHANGED_EVENT, listener);
  return () => {
    window.removeEventListener(REPORTS_CHANGED_EVENT, listener);
  };
}

export function setCachedReportTitle(reportId: string, title: string): void {
  const cleanId = reportId.trim();
  const cleanTitle = title.trim();
  if (!cleanId || !cleanTitle) return;
  reportTitleCache.set(cleanId, cleanTitle);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(REPORT_TITLE_CHANGED_EVENT, {
        detail: { reportId: cleanId, title: cleanTitle },
      }),
    );
  }
}

export function getCachedReportTitle(reportId: string): string | undefined {
  return reportTitleCache.get(reportId.trim());
}

export function subscribeReportTitleChanged(
  listener: (reportId: string, title: string) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (event: Event) => {
    const custom = event as CustomEvent<{ reportId?: string; title?: string }>;
    if (custom.detail?.reportId && custom.detail?.title) {
      listener(custom.detail.reportId, custom.detail.title);
    }
  };
  window.addEventListener(REPORT_TITLE_CHANGED_EVENT, handler);
  return () => {
    window.removeEventListener(REPORT_TITLE_CHANGED_EVENT, handler);
  };
}
