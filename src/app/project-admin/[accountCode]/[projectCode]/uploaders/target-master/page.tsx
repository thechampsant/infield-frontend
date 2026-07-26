"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  featureConfigService,
  formatApiError,
  targetVsAchievementConfigModuleKey,
  targetVsAchievementService,
  type TargetRowsResponse,
  type TargetUploadedRow,
  type TargetUploadSummary,
  type TargetVsAchievementConfiguration,
} from "@/lib/api";
import { useProjectContext } from "@/lib/project-admin/project-context";

const PAGE_SIZE = 50;
const PREFERRED_TARGET_COLUMNS = [
  "period.key",
  "period.label",
  "employeeId",
  "targetAmount",
  "targetQuantity",
  "focusTargetAmount",
  "focusTargetQuantity",
  "storeId",
  "storeName",
  "userName",
  "assigneeType",
  "assigneeId",
  "productKey",
  "productFieldValue",
  "targetValue",
  "focusTargetValue",
  "period.month",
  "period.year",
  "periodKey",
  "fromDate",
  "toDate",
  "updatedAt",
];

type UploadKind = "target" | "focus";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function fileStem(config: TargetVsAchievementConfiguration, suffix: string) {
  return `${config.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${suffix}.xlsx`;
}

function columnLabel(key: string) {
  if (key === "__row") return "Row Data";
  return key
    .replace(/^_/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function nestedValue(source: Record<string, unknown>, key: string): unknown {
  return key.split(".").reduce<unknown>((current, part) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    return (current as Record<string, unknown>)[part];
  }, source);
}

function rowValue(row: TargetUploadedRow, key: string) {
  if (key === "__row") return JSON.stringify(row.raw);
  const value = key.includes(".") ? nestedValue(row.raw, key) : row.raw[key];
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

function rowColumns(rows: TargetUploadedRow[]) {
  const preferred = PREFERRED_TARGET_COLUMNS.filter((key) =>
    rows.some((row) => {
      const value = key.includes(".") ? nestedValue(row.raw, key) : row.raw[key];
      return value !== null && value !== undefined && value !== "";
    }),
  );
  if (preferred.length > 0) return preferred.slice(0, 12);

  const ignored = new Set(["_id", "id", "__v", "projectId", "configId", "configurationId"]);
  const keys = new Set<string>();
  rows.forEach((row) => {
    Object.keys(row.raw).forEach((key) => {
      if (!ignored.has(key)) keys.add(key);
    });
  });
  const fallback = Array.from(keys).slice(0, 12);
  return fallback.length > 0 ? fallback : rows.length > 0 ? ["__row"] : [];
}

export default function TargetMasterUploadPage() {
  const { projectId } = useProjectContext();

  const [configs, setConfigs] = useState<TargetVsAchievementConfiguration[]>([]);
  const [activeConfigIds, setActiveConfigIds] = useState<Set<string>>(() => new Set());
  const [selectedConfigId, setSelectedConfigId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<UploadKind | null>(null);
  const [uploadSummary, setUploadSummary] = useState<TargetUploadSummary | null>(null);
  const [rowKind, setRowKind] = useState<UploadKind>("target");
  const [rowsPage, setRowsPage] = useState(1);
  const [periodDraft, setPeriodDraft] = useState("");
  const [periodKey, setPeriodKey] = useState("");
  const [rowsLoading, setRowsLoading] = useState(false);
  const [rowsError, setRowsError] = useState<string | null>(null);
  const [rowsResponse, setRowsResponse] = useState<TargetRowsResponse | null>(null);
  const [rowsRefreshKey, setRowsRefreshKey] = useState(0);

  const targetInputRef = useRef<HTMLInputElement>(null);
  const focusInputRef = useRef<HTMLInputElement>(null);

  const activeConfigs = useMemo(
    () => configs.filter((config) => activeConfigIds.has(config.id)),
    [activeConfigIds, configs],
  );
  const selectedConfig = useMemo(
    () => activeConfigs.find((config) => config.id === selectedConfigId) ?? activeConfigs[0] ?? null,
    [activeConfigs, selectedConfigId],
  );
  const canUpload = Boolean(selectedConfig);
  const tableColumns = useMemo(() => rowColumns(rowsResponse?.data ?? []), [rowsResponse]);
  const rowMeta = rowsResponse?.meta;

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const [configList, featureConfig] = await Promise.all([
        targetVsAchievementService.list(projectId),
        featureConfigService.getRawByProject(projectId),
      ]);
      const activeKeys = new Set(
        featureConfig.modules
          .filter((module) => module.isActive)
          .map((module) => module.key),
      );
      const nextActiveIds = new Set(
        configList
          .filter((config) => activeKeys.has(targetVsAchievementConfigModuleKey(config.id)))
          .map((config) => config.id),
      );
      setConfigs(configList);
      setActiveConfigIds(nextActiveIds);
      setSelectedConfigId((current) => {
        if (current && nextActiveIds.has(current)) return current;
        return configList.find((config) => nextActiveIds.has(config.id))?.id ?? "";
      });
    } catch (err) {
      setError(formatApiError(err, "Failed to load Target Master uploader"));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadRows = useCallback(async () => {
    if (!projectId || !selectedConfig) {
      setRowsResponse(null);
      return;
    }
    if (rowKind === "focus" && !selectedConfig.focus.enabled) {
      setRowsResponse(null);
      return;
    }
    setRowsLoading(true);
    setRowsError(null);
    try {
      const params = {
        projectId,
        page: rowsPage,
        pageSize: PAGE_SIZE,
        periodKey,
      };
      const response = rowKind === "target"
        ? await targetVsAchievementService.listTargetRows(selectedConfig.id, params)
        : await targetVsAchievementService.listFocusTargetRows(selectedConfig.id, params);
      setRowsResponse(response);
    } catch (err) {
      setRowsError(formatApiError(err, "Failed to load uploaded targets"));
    } finally {
      setRowsLoading(false);
    }
  }, [periodKey, projectId, rowKind, rowsPage, selectedConfig]);

  useEffect(() => {
    setRowsPage(1);
    if (!selectedConfig?.focus.enabled) setRowKind("target");
  }, [selectedConfig?.focus.enabled, selectedConfig?.id]);

  useEffect(() => {
    void loadRows();
  }, [loadRows, rowsRefreshKey]);

  async function handleTemplate(kind: UploadKind) {
    if (!projectId || !selectedConfig) return;
    setError(null);
    try {
      const blob = kind === "target"
        ? await targetVsAchievementService.downloadTargetTemplate(selectedConfig.id, projectId)
        : await targetVsAchievementService.downloadFocusTemplate(selectedConfig.id, projectId);
      downloadBlob(blob, fileStem(selectedConfig, kind === "target" ? "target-template" : "focus-template"));
    } catch (err) {
      setError(formatApiError(err, "Template download failed"));
    }
  }

  async function handleUpload(kind: UploadKind, file: File) {
    if (!projectId || !selectedConfig) return;
    setUploading(kind);
    setError(null);
    setUploadSummary(null);
    try {
      const summary = kind === "target"
        ? await targetVsAchievementService.uploadTarget(selectedConfig.id, projectId, file)
        : await targetVsAchievementService.uploadFocus(selectedConfig.id, projectId, file);
      setUploadSummary(summary);
      setRowKind(kind);
      setRowsPage(1);
      setRowsRefreshKey((key) => key + 1);
      if (summary.rejected > 0) {
        setError(`Upload completed with ${summary.rejected} rejected row${summary.rejected === 1 ? "" : "s"}.`);
      }
    } catch (err) {
      setError(formatApiError(err, "Target upload failed"));
    } finally {
      setUploading(null);
      if (targetInputRef.current) targetInputRef.current.value = "";
      if (focusInputRef.current) focusInputRef.current.value = "";
    }
  }

  function handleFileChange(kind: UploadKind, file: File | undefined) {
    if (!file) return;
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      setError("Please upload an Excel file (.xlsx or .xls).");
      return;
    }
    const confirmed = window.confirm(
      "Uploaded rows with matching config, period, assignee, and product keys will overwrite existing rows. Rows not included in the sheet remain unchanged. Continue?",
    );
    if (!confirmed) {
      if (targetInputRef.current) targetInputRef.current.value = "";
      if (focusInputRef.current) focusInputRef.current.value = "";
      return;
    }
    void handleUpload(kind, file);
  }

  function applyPeriodFilter() {
    setRowsPage(1);
    setPeriodKey(periodDraft.trim());
  }

  function clearPeriodFilter() {
    setPeriodDraft("");
    setPeriodKey("");
    setRowsPage(1);
  }

  return (
    <>
      <div className="pa-page-header">
        <div>
          <div className="pa-page-title">Target Master</div>
          <div className="pa-page-desc">
            Upload target values for active Target vs Achievement configurations
          </div>
        </div>
        <div className="pa-actions">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!canUpload || uploading !== null}
            onClick={() => void handleTemplate("target")}
          >
            ↓ Template
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!canUpload || uploading !== null}
            onClick={() => targetInputRef.current?.click()}
          >
            {uploading === "target" ? "Uploading..." : "↑ Bulk Upload"}
          </button>
          <input
            ref={targetInputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: "none" }}
            onChange={(event) => handleFileChange("target", event.target.files?.[0])}
            aria-label="Upload Excel file for Target Master"
          />
        </div>
      </div>

      {!loading && activeConfigs.length === 0 && (
        <div
          className="pa-info-banner"
          style={{
            color: "var(--orange, #d97706)",
            background: "var(--orange-light, #fffbeb)",
            borderColor: "var(--orange-mid, #fcd34d)",
            marginBottom: 16,
          }}
        >
          <strong>Upload disabled.</strong> Activate at least one Target vs Achievement configuration from Modules before uploading targets.
        </div>
      )}

      {activeConfigs.length > 0 && (
        <div className="pa-info-banner" style={{ marginBottom: 16 }}>
          <strong>Active configuration:</strong>{" "}
          <select
            className="form-input"
            style={{ width: "min(420px, 100%)", marginLeft: 8 }}
            value={selectedConfig?.id ?? ""}
            onChange={(event) => setSelectedConfigId(event.target.value)}
          >
            {activeConfigs.map((config) => (
              <option key={config.id} value={config.id}>{config.name}</option>
            ))}
          </select>
        </div>
      )}

      {selectedConfig?.focus.enabled && (
        <div className="pa-info-banner" style={{ marginBottom: 16 }}>
          <strong>Focus targets enabled.</strong> Upload the focus target file separately for this configuration.
          <div className="pa-actions" style={{ marginTop: 10 }}>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={uploading !== null}
              onClick={() => void handleTemplate("focus")}
            >
              ↓ Focus Template
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={uploading !== null}
              onClick={() => focusInputRef.current?.click()}
            >
              {uploading === "focus" ? "Uploading..." : "↑ Focus Upload"}
            </button>
            <input
              ref={focusInputRef}
              type="file"
              accept=".xlsx,.xls"
              style={{ display: "none" }}
              onChange={(event) => handleFileChange("focus", event.target.files?.[0])}
              aria-label="Upload Excel file for Focus Target Master"
            />
          </div>
        </div>
      )}

      {error && (
        <div
          className="pa-info-banner"
          style={{
            color: "var(--red)",
            background: "var(--red-light)",
            borderColor: "var(--red-mid)",
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {uploadSummary && uploadSummary.rejected === 0 && (
        <div
          className="pa-info-banner"
          style={{
            color: "var(--green, #16a34a)",
            background: "var(--green-light, #f0fdf4)",
            borderColor: "var(--green-mid, #86efac)",
            marginBottom: 16,
          }}
        >
          Upload completed. Inserted {uploadSummary.inserted}, overwritten {uploadSummary.overwritten}, unchanged {uploadSummary.unchanged}.
        </div>
      )}

      {uploadSummary && uploadSummary.errors.length > 0 && (
        <div
          className="pa-info-banner"
          style={{
            color: "var(--orange, #d97706)",
            background: "var(--orange-light, #fffbeb)",
            borderColor: "var(--orange-mid, #fcd34d)",
            marginBottom: 16,
            maxHeight: 220,
            overflow: "auto",
          }}
        >
          <strong>Upload Errors ({uploadSummary.errors.length} rows):</strong>
          <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            {uploadSummary.errors.slice(0, 12).map((entry, index) => (
              <li key={`${entry.row}-${index}`}>
                Row {entry.row || index + 1}: {entry.errors.join(", ")}
              </li>
            ))}
            {uploadSummary.errors.length > 12 && (
              <li>...and {uploadSummary.errors.length - 12} more errors</li>
            )}
          </ul>
        </div>
      )}

      <div className="pa-info-banner" style={{ marginBottom: 0 }}>
        Download the template for the selected active configuration, fill the target values, then upload the completed Excel file here.
      </div>

      {selectedConfig && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            boxShadow: "var(--shadow-sm)",
            marginTop: 16,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              alignItems: "flex-start",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              justifyContent: "space-between",
              padding: 16,
            }}
          >
            <div>
              <div style={{ color: "var(--text)", fontSize: 18, fontWeight: 800 }}>
                Current Uploaded Targets
              </div>
              <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
                Showing newest rows first, 50 rows per page.
              </div>
            </div>
            <div className="pa-actions" style={{ gap: 8 }}>
              <select
                className="form-input"
                style={{ width: 180 }}
                value={rowKind}
                onChange={(event) => {
                  setRowKind(event.target.value as UploadKind);
                  setRowsPage(1);
                }}
              >
                <option value="target">Target Master</option>
                {selectedConfig.focus.enabled && <option value="focus">Focus Targets</option>}
              </select>
              <input
                className="form-input"
                placeholder="monthly:2026:july"
                style={{ width: 210 }}
                value={periodDraft}
                onChange={(event) => setPeriodDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") applyPeriodFilter();
                }}
              />
              <button type="button" className="btn btn-secondary" onClick={applyPeriodFilter}>
                Apply
              </button>
              {periodKey && (
                <button type="button" className="btn btn-secondary" onClick={clearPeriodFilter}>
                  Clear
                </button>
              )}
            </div>
          </div>

          {rowsError && (
            <div
              className="pa-info-banner"
              style={{
                color: "var(--red)",
                background: "var(--red-light)",
                borderColor: "var(--red-mid)",
                margin: 16,
              }}
            >
              {rowsError}
            </div>
          )}

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                borderCollapse: "collapse",
                minWidth: 760,
                width: "100%",
              }}
            >
              <thead>
                <tr style={{ background: "var(--surface-subtle, #f8fafc)" }}>
                  {tableColumns.length > 0 ? (
                    tableColumns.map((column) => (
                      <th
                        key={column}
                        style={{
                          borderBottom: "1px solid var(--border)",
                          color: "var(--text)",
                          fontSize: 12,
                          fontWeight: 800,
                          letterSpacing: 0.4,
                          padding: "12px 16px",
                          textAlign: "left",
                          textTransform: "uppercase",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {columnLabel(column)}
                      </th>
                    ))
                  ) : (
                    <th
                      style={{
                        borderBottom: "1px solid var(--border)",
                        color: "var(--text)",
                        fontSize: 12,
                        fontWeight: 800,
                        padding: "12px 16px",
                        textAlign: "left",
                      }}
                    >
                      Uploaded Rows
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rowsLoading ? (
                  <tr>
                    <td
                      colSpan={Math.max(tableColumns.length, 1)}
                      style={{ color: "var(--text-muted)", padding: 24, textAlign: "center" }}
                    >
                      Loading uploaded targets...
                    </td>
                  </tr>
                ) : rowsResponse && rowsResponse.data.length > 0 ? (
                  rowsResponse.data.map((row, index) => (
                    <tr key={row.id || `${rowMeta?.page ?? 1}-${index}`}>
                      {tableColumns.map((column) => (
                        <td
                          key={column}
                          style={{
                            borderBottom: "1px solid var(--border)",
                            color: "var(--text)",
                            fontSize: 14,
                            padding: "12px 16px",
                            verticalAlign: "top",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {rowValue(row, column)}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={Math.max(tableColumns.length, 1)}
                      style={{ color: "var(--text-muted)", padding: 24, textAlign: "center" }}
                    >
                      No uploaded {rowKind === "target" ? "target" : "focus target"} rows found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div
            style={{
              alignItems: "center",
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              justifyContent: "space-between",
              padding: 16,
            }}
          >
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
              Page {rowMeta?.page ?? rowsPage} of {Math.max(rowMeta?.totalPages ?? 1, 1)}
              {" · "}
              {rowMeta?.totalCount ?? 0} rows
            </div>
            <div className="pa-actions" style={{ gap: 8 }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={rowsLoading || rowsPage <= 1}
                onClick={() => setRowsPage((page) => Math.max(1, page - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={rowsLoading || rowsPage >= Math.max(rowMeta?.totalPages ?? 1, 1)}
                onClick={() => setRowsPage((page) => page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
