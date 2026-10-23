/** Orient project — must match backend ORIENT_PROJECT_CODE / ORIENT_PROJECT_ID */

export const ORIENT_PROJECT_CODE = "PRJ-000021";
export const ORIENT_PROJECT_ID = "6a5dcaa8f374afa36003e396";

/** Matches backend ORIENT_LOAD_DEFAULT_DAYS */
export const ORIENT_LOAD_DEFAULT_DAYS = 7;

export type OrientExportType =
  | "attendance"
  | "claims"
  | "leave"
  | "visit-claims"
  | "attendance-daily-status";

/** Matches backend ORIENT_LAYOUTS (report_configs.outputSettings.orientLayout). */
const ORIENT_LAYOUT_EXPORT_TYPES: Record<string, OrientExportType> = {
  "attendance-daily-status": "attendance-daily-status",
};

export function isOrientProject(projectCode: string): boolean {
  return projectCode === ORIENT_PROJECT_CODE;
}

/** Local YYYY-MM-DD (browser local — Orient UI uses calendar dates). */
export function ymdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Default Load date range: last N days including today. */
export function defaultOrientLoadDateRange(
  days = ORIENT_LOAD_DEFAULT_DAYS,
): { fromDate: string; toDate: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  return { fromDate: ymdLocal(from), toDate: ymdLocal(to) };
}

/**
 * Map report_configs primarySource.sourceKey → Orient API path segment.
 * A known `outputSettings.orientLayout` takes precedence (report can be renamed freely).
 */
export function sourceKeyToOrientExportType(
  sourceKey: string | undefined,
  orientLayout?: string,
): OrientExportType | null {
  if (orientLayout && ORIENT_LAYOUT_EXPORT_TYPES[orientLayout]) {
    return ORIENT_LAYOUT_EXPORT_TYPES[orientLayout];
  }
  switch (String(sourceKey || "").toUpperCase()) {
    case "ATTENDANCE":
      return "attendance";
    case "CLAIMS":
      return "claims";
    case "LEAVE_REQUESTS":
      return "leave";
    case "VISITS":
      return "visit-claims";
    default:
      return null;
  }
}
