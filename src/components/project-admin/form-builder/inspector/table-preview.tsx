import { useState } from "react";
import { useProjectContext } from "@/lib/project-admin/project-context";
import { udfConfigService } from "@/lib/api/udf-config-service";
import type { DataSourceConfig } from "@/lib/form-builder/types";

export function TablePreview({ data }: { data: DataSourceConfig }) {
  const { projectId } = useProjectContext();
  const [records, setRecords] = useState<Record<string, unknown>[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<string[]>([]);
  async function preview() {
    setLoading(true);
    setError("");
    try {
      const rows = data.source === "custom"
        ? data.customRows?.map((row) => Object.fromEntries((data.customHeaders ?? []).map((key, i) => [key, row[i]]))) ?? []
        : await udfConfigService.previewSource(data.source === "product-master" ? "PRODUCT" : "STORE", { projectId });
      setRecords(rows);
      setFilters([]);
    } catch {
      setError("Could not load the source records.");
    } finally {
      setLoading(false);
    }
  }
  const matchingRows = (levels: number) => (records ?? []).filter((row) =>
    data.filterColumns.slice(0, levels).every((key, i) => !filters[i] || String(row[key]) === filters[i]));
  const visible = matchingRows(data.filterColumns.length);
  const selectors = data.filterColumns.map((key, i) => {
    const choices = [...new Set(matchingRows(i).map((row) => String(row[key] ?? "")).filter(Boolean))];
    const selected = filters[i] ?? "";
    return <label key={key}>{key}<select value={selected} onChange={(e) => setFilters(data.filterColumns.slice(0, i + 1).map((_, index) => index === i ? e.target.value : filters[index] ?? ""))}>
      <option value="">All</option>{choices.map((choice) => <option key={choice}>{choice}</option>)}
    </select></label>;
  });
  return <>
    <button type="button" disabled={loading} onClick={preview}>{loading ? "Loading…" : "Preview table"}</button>
    {error && <span role="alert">{error}</span>}
    {records && <>{selectors}
      {visible.length ? <div style={{ overflowX: "auto" }}><table><thead><tr>
        {data.readOnlyColumns.map((name) => <th key={name}>{name}</th>)}
        {data.editableColumns.map((column, i) => <th key={column.id ?? i}>{column.name}{column.required && " *"}</th>)}
      </tr></thead><tbody>
        {visible.slice(0, 10).map((row) => <tr key={records.indexOf(row)}>
          {data.readOnlyColumns.map((name) => <td key={name}>{String(row[name] ?? "")}</td>)}
          {data.editableColumns.map((column, i) => <td key={column.id ?? i}>{column.type === "dropdown" ?
            <select required={column.required} aria-label={column.name} defaultValue=""><option value="">Select…</option>{column.options?.map((value, j) => <option key={j}>{value}</option>)}</select> :
            <input aria-label={column.name} type={column.type === "number" || column.type === "date" ? column.type : "text"}
              pattern={column.type === "alphanumeric" ? "[A-Za-z0-9]+" : undefined} required={column.required} min={column.min} max={column.max} />}</td>)}
        </tr>)}
      </tbody></table></div> : <span>No matching rows.</span>}
    </>}
  </>;
}
