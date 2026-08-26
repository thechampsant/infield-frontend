"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Upload, X } from "lucide-react";
import {
  customViewService,
  formatApiError,
  type CustomViewColumnNode,
  type CustomViewConfiguration,
  type CustomViewTaggingLogic,
} from "@/lib/api";
import { ColumnStructureBuilder } from "./column-structure-builder";

export const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function currentIstPeriod(): { month: number; year: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    month: "numeric",
    year: "numeric",
  }).formatToParts(new Date());
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  return {
    month: Number.isFinite(month) ? month : new Date().getMonth() + 1,
    year: Number.isFinite(year) ? year : new Date().getFullYear(),
  };
}

export interface DraftView {
  id?: string;
  localId: string;
  name: string;
  taggingLogic: CustomViewTaggingLogic;
  columnStructure: CustomViewColumnNode[];
  status?: CustomViewConfiguration["status"];
  periodMonth: number;
  periodYear: number;
  latestFileName?: string | null;
  latestFileSize?: number | null;
  latestRowCount?: number;
}

interface Props {
  projectId: string;
  designationId: string;
  view: DraftView;
  onChange: (view: DraftView) => void;
  onSaved: (saved: CustomViewConfiguration, localId: string) => void;
  onError: (message: string) => void;
}

function identityColumn(tagging: CustomViewTaggingLogic): CustomViewColumnNode {
  return {
    type: "column",
    key: tagging,
    label: tagging,
    locked: true,
    valueType: "string",
  };
}

export function isViewConfigured(view: DraftView): boolean {
  return Boolean(view.name.trim() && view.taggingLogic && view.columnStructure.some((node) => node.locked));
}

export function configToDraft(cfg: CustomViewConfiguration): DraftView {
  const fallback = currentIstPeriod();
  return {
    id: cfg.id,
    localId: cfg.id,
    name: cfg.name,
    taggingLogic: cfg.taggingLogic,
    columnStructure:
      cfg.columnStructure.length > 0
        ? cfg.columnStructure
        : [identityColumn(cfg.taggingLogic)],
    status: cfg.status,
    periodMonth: cfg.latestPeriodMonth || fallback.month,
    periodYear: cfg.latestPeriodYear || fallback.year,
    latestFileName: cfg.latestFileName,
    latestFileSize: cfg.latestFileSize,
    latestRowCount: cfg.latestRowCount,
  };
}

export function createEmptyDraft(
  tagging: CustomViewTaggingLogic = "loginid",
): DraftView {
  const period = currentIstPeriod();
  return {
    localId: `draft_${Math.random().toString(36).slice(2, 10)}`,
    name: "",
    taggingLogic: tagging,
    columnStructure: [identityColumn(tagging)],
    periodMonth: period.month,
    periodYear: period.year,
  };
}

export function ViewEditor({
  projectId,
  designationId,
  view,
  onChange,
  onSaved,
  onError,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUploader, setShowUploader] = useState(!view.latestFileName);
  const month = view.periodMonth;
  const year = view.periodYear;

  const yearOptions = useMemo(() => {
    const current = currentIstPeriod().year;
    const selected = year;
    return [...new Set([current - 2, current - 1, current, current + 1, selected])].sort(
      (a, b) => a - b,
    );
  }, [year]);

  useEffect(() => {
    setShowUploader(!view.latestFileName);
  }, [view.latestFileName]);

  async function handleSave() {
    if (!isViewConfigured(view)) {
      onError("Name, tagging, and the locked identity column are required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: view.name.trim(),
        taggingLogic: view.taggingLogic,
        columnStructure: view.columnStructure,
      };
      const saved = view.id
        ? await customViewService.update(projectId, view.id, payload)
        : await customViewService.create({ projectId, designationId, ...payload });
      onSaved(saved, view.localId);
    } catch (err) {
      onError(formatApiError(err, "Failed to save view"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDownload() {
    if (!view.id) {
      onError("Save the view before downloading a template.");
      return;
    }
    try {
      const blob = await customViewService.downloadTemplate(projectId, view.id, month, year);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${view.name || "custom-view"}_${String(month).padStart(2, "0")}-${year}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (err) {
      onError(formatApiError(err, "Failed to download template"));
    }
  }

  async function handleUpload(file: File) {
    if (!view.id) {
      onError("Save the view before uploading data.");
      return;
    }
    setUploading(true);
    try {
      await customViewService.upload(projectId, view.id, month, year, file);
      const saved = await customViewService.get(projectId, view.id);
      setShowUploader(false);
      onSaved(saved, view.localId);
    } catch (err) {
      onError(formatApiError(err, "Failed to upload file"));
    } finally {
      setUploading(false);
    }
  }

  const fileLabel = view.latestFileName;
  const fileSize = view.latestFileSize ?? 0;
  const rowCount = view.latestRowCount ?? 0;

  return (
    <div className="cv-view-editor">
      <div className="cv-field-row">
        <div className="cv-field">
          <label className="cv-label">Module name</label>
          <input
            className="cv-input"
            value={view.name}
            onChange={(e) => onChange({ ...view, name: e.target.value })}
            placeholder="Score Card"
          />
        </div>
        <div className="cv-field">
          <label className="cv-label">Tagging logic</label>
          <select
            className="cv-select"
            value={view.taggingLogic}
            onChange={(e) => {
              const taggingLogic = e.target.value as CustomViewTaggingLogic;
              const rest = view.columnStructure.filter((node) => !node.locked);
              onChange({
                ...view,
                taggingLogic,
                columnStructure: [identityColumn(taggingLogic), ...rest],
              });
            }}
          >
            <option value="loginid">loginid</option>
            <option value="storecode">storecode</option>
          </select>
        </div>
      </div>

      <ColumnStructureBuilder
        structure={view.columnStructure}
        onChange={(columnStructure) => onChange({ ...view, columnStructure })}
      />

      <div className="cv-excel-period">
        <div>
          <div className="cv-label">Excel period for this view</div>
          <div className="cv-muted">
            Download template and upload apply only to this month. Save view does not
            change period.
          </div>
        </div>
        <div className="cv-period">
          <select
            className="cv-select"
            value={month}
            onChange={(e) => onChange({ ...view, periodMonth: Number(e.target.value) })}
            aria-label="Excel period month"
          >
            {MONTH_LABELS.map((label, index) => (
              <option key={label} value={index + 1}>
                {label}
              </option>
            ))}
          </select>
          <select
            className="cv-select"
            value={year}
            onChange={(e) => onChange({ ...view, periodYear: Number(e.target.value) })}
            aria-label="Excel period year"
          >
            {yearOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="cv-field-row">
        <button type="button" className="cv-btn cv-btn-secondary" onClick={handleDownload} disabled={!view.id}>
          <Download size={14} />
          Download template
        </button>
        <div className="cv-field">
          {fileLabel && !showUploader ? (
            <div className="cv-file">
              <span>{fileLabel}</span>
              {fileSize > 0 && <span className="cv-muted">({(fileSize / 1024).toFixed(1)} KB)</span>}
              {rowCount > 0 && <span className="cv-muted">{rowCount} rows</span>}
              <button
                type="button"
                className="cv-icon-btn"
                title="Replace file"
                onClick={() => setShowUploader(true)}
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="cv-drop">
              <Upload size={16} />
              <span>{uploading ? "Uploading..." : "Upload .xlsx / .xls / .csv"}</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                disabled={uploading || !view.id}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void handleUpload(file);
                }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="cv-actions">
        <button type="button" className="cv-btn cv-btn-primary" onClick={handleSave} disabled={saving || uploading}>
          {saving ? "Saving..." : "Save view"}
        </button>
      </div>
    </div>
  );
}
