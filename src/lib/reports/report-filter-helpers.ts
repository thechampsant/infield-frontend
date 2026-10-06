import type { ReportFilter, ReportSelectedColumn } from "@/lib/api/report-config-service";

/** Splits comma-separated filter text into values, keeping spaces inside each value. */
export function parseMultiValueText(text: string): string[] {
  return text
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function formatMultiValueText(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  return typeof value === "string" ? value : "";
}

/** True when the typed text already represents `value`, so the input must keep the text as typed. */
export function isSameFilterValue(text: string, value: unknown): boolean {
  const typed = parseMultiValueText(text);
  const current = parseMultiValueText(formatMultiValueText(value));
  return typed.length === current.length && typed.every((entry, i) => entry === current[i]);
}

// Filters keep the raw field key (e.g. "designation", "agencyName") while columns use
// the report-builder key (e.g. "userMaster.designation", "userMaster.udf.agencyName").
const COLUMN_KEY_PREFIXES = ["", "userMaster.", "userMaster.udf.", "mappedStore.udf."];

/** Label a filter with its column's current header, so renaming the column renames the filter. */
export function resolveReportFilterLabel(
  filter: Pick<ReportFilter, "fieldKey">,
  selectedColumns: ReportSelectedColumn[] = [],
): string {
  for (const prefix of COLUMN_KEY_PREFIXES) {
    const column = (selectedColumns || []).find(
      (col) => col.fieldKey === `${prefix}${filter.fieldKey}`,
    );
    const header = column?.headerName?.trim();
    if (header) return header;
  }
  return filter.fieldKey;
}
