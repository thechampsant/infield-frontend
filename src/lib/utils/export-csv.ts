/**
 * CSV Export utility.
 * Follows Engineering Standards: Audit (exports should be logged).
 */

interface ExportOptions<T> {
  data: T[];
  columns: { key: keyof T; header: string }[];
  filename: string;
}

/**
 * Export data to CSV and trigger download.
 */
export function exportToCsv<T extends Record<string, unknown>>({
  data,
  columns,
  filename,
}: ExportOptions<T>): void {
  if (data.length === 0) {
    console.warn("No data to export");
    return;
  }

  // Build CSV header
  const headers = columns.map((col) => escapeCSV(col.header)).join(",");

  // Build CSV rows
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const value = row[col.key];
        return escapeCSV(formatValue(value));
      })
      .join(","),
  );

  // Combine header and rows
  const csvContent = [headers, ...rows].join("\n");

  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}_${formatDate(new Date())}.csv`;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Escape special characters for CSV format.
 */
function escapeCSV(value: string): string {
  // If value contains comma, quote, or newline, wrap in quotes
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    // Escape existing quotes by doubling them
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Format value for CSV output.
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.join("; ");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

/**
 * Format date for filename.
 */
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0]; // YYYY-MM-DD
}

