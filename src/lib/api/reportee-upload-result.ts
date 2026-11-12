import type { ReporteeBulkMappingResult } from "./user-reportee-mapping-service";

export function formatReporteeUploadResult(
  result: ReporteeBulkMappingResult,
): string {
  const summary =
    result.createdCount !== undefined &&
    result.replacedCount !== undefined &&
    result.unchangedCount !== undefined
      ? `${result.createdCount} created, ${result.replacedCount} replaced, ${result.unchangedCount} unchanged`
      : `${result.successCount} managers processed`;
  return `Upload completed: ${summary}.${result.invalidCount > 0 ? ` ${result.invalidCount} ${result.invalidCount === 1 ? "row" : "rows"} had errors.` : ""}`;
}
