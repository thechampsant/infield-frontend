export type ReportDatePresetId =
  | "today"
  | "yesterday"
  | "last7"
  | "last14"
  | "thisWeek"
  | "lastWeek"
  | "thisMonth";

export interface ReportDateRange {
  fromDate: string;
  toDate: string;
}

export const REPORT_DATE_PRESETS: Array<{ id: ReportDatePresetId; label: string }> = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last7", label: "Last 7 days" },
  { id: "last14", label: "Last 14 days" },
  { id: "thisWeek", label: "This week" },
  { id: "lastWeek", label: "Last week" },
  { id: "thisMonth", label: "This month" },
];

const IST_TIME_ZONE = "Asia/Kolkata";

/** Today's calendar date in Asia/Kolkata as YYYY-MM-DD. */
export function getIstToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function parseDateKey(dateKey: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateKey.split("-").map(Number);
  return { year, month, day };
}

function addDays(dateKey: string, days: number): string {
  const { year, month, day } = parseDateKey(dateKey);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10);
}

/** Monday of the IST week containing dateKey (Mon–Sun). */
function startOfWeekMonday(dateKey: string): string {
  const { year, month, day } = parseDateKey(dateKey);
  // Use noon UTC to avoid DST edge cases; IST has no DST.
  const utc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const weekday = utc.getUTCDay(); // 0=Sun .. 6=Sat
  const offsetToMonday = weekday === 0 ? -6 : 1 - weekday;
  return addDays(dateKey, offsetToMonday);
}

export function resolveReportDatePreset(
  presetId: ReportDatePresetId,
  now: Date = new Date(),
): ReportDateRange {
  const today = getIstToday(now);

  switch (presetId) {
    case "today":
      return { fromDate: today, toDate: today };
    case "yesterday": {
      const yesterday = addDays(today, -1);
      return { fromDate: yesterday, toDate: yesterday };
    }
    case "last7":
      return { fromDate: addDays(today, -6), toDate: today };
    case "last14":
      return { fromDate: addDays(today, -13), toDate: today };
    case "thisWeek": {
      const weekStart = startOfWeekMonday(today);
      return { fromDate: weekStart, toDate: today };
    }
    case "lastWeek": {
      const thisWeekStart = startOfWeekMonday(today);
      const lastWeekStart = addDays(thisWeekStart, -7);
      const lastWeekEnd = addDays(thisWeekStart, -1);
      return { fromDate: lastWeekStart, toDate: lastWeekEnd };
    }
    case "thisMonth": {
      const { year, month } = parseDateKey(today);
      const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
      return { fromDate: monthStart, toDate: today };
    }
    default: {
      const _exhaustive: never = presetId;
      return _exhaustive;
    }
  }
}
