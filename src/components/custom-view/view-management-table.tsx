"use client";

import { Download, Pause, Pencil, Play, Trash2 } from "lucide-react";
import type { CustomViewConfiguration, Designation } from "@/lib/api";
import { MONTH_LABELS } from "./view-editor";

interface Props {
  views: CustomViewConfiguration[];
  designations: Designation[];
  statusFilter: "all" | "active" | "paused" | "draft";
  onStatusFilterChange: (value: "all" | "active" | "paused" | "draft") => void;
  downloadMonth: number;
  downloadYear: number;
  yearOptions: number[];
  onDownloadPeriodChange: (month: number, year: number) => void;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
  onEdit: (view: CustomViewConfiguration) => void;
  onPause: (view: CustomViewConfiguration) => void;
  onResume: (view: CustomViewConfiguration) => void;
  onRemove: (view: CustomViewConfiguration) => void;
  onDownloadData: (view: CustomViewConfiguration) => void;
}

function formatUpdated(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function ViewManagementTable({
  views,
  designations,
  statusFilter,
  onStatusFilterChange,
  downloadMonth,
  downloadYear,
  yearOptions,
  onDownloadPeriodChange,
  page,
  pageSize,
  total,
  onPageChange,
  loading,
  onEdit,
  onPause,
  onResume,
  onRemove,
  onDownloadData,
}: Props) {
  const designationById = new Map(designations.map((item) => [item.id, item]));
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  return (
    <div>
      <div className="cv-toolbar" style={{ marginBottom: 8, flexWrap: "wrap" }}>
        <h2 className="cv-section-title">View Management</h2>
        <div className="cv-period" style={{ marginLeft: "auto" }}>
          <span className="cv-period-label">Download period</span>
          <select
            className="cv-select"
            value={downloadMonth}
            onChange={(e) => onDownloadPeriodChange(Number(e.target.value), downloadYear)}
            aria-label="Download period month"
          >
            {MONTH_LABELS.map((label, index) => (
              <option key={label} value={index + 1}>
                {label}
              </option>
            ))}
          </select>
          <select
            className="cv-select"
            value={downloadYear}
            onChange={(e) => onDownloadPeriodChange(downloadMonth, Number(e.target.value))}
            aria-label="Download period year"
          >
            {yearOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <select
            className="cv-select"
            style={{ width: 160 }}
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as Props["statusFilter"])}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>
      <div className="cv-muted" style={{ marginBottom: 8 }}>
        Download data uses the toolbar month and year. Changing period does not hide views.
      </div>
      <div className="cv-table-wrap">
        <table className="cv-table">
          <thead>
            <tr>
              <th>Designation</th>
              <th>View</th>
              <th>Columns</th>
              <th>Rows uploaded</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="cv-muted">Loading views…</td>
              </tr>
            ) : views.length === 0 ? (
              <tr>
                <td colSpan={6} className="cv-muted">No views yet.</td>
              </tr>
            ) : (
              views.map((view) => {
                const designation = designationById.get(view.designationId);
                const code = view.designationCode || designation?.externalCode || designation?.name || "—";
                const period =
                  view.latestPeriodMonth && view.latestPeriodYear
                    ? `${String(view.latestPeriodMonth).padStart(2, "0")}-${view.latestPeriodYear}`
                    : "—";
                return (
                  <tr key={view.id}>
                    <td><span className="cv-code">{code}</span></td>
                    <td>
                      <div>{view.name}</div>
                      <div className="cv-muted">
                        {period} · {view.taggingLogic} · Updated {formatUpdated(view.updatedAt)}
                      </div>
                    </td>
                    <td>{view.columnCount}</td>
                    <td>{view.latestRowCount}</td>
                    <td>
                      <span className={`cv-badge ${view.status === "active" ? "cv-badge-active" : view.status === "paused" ? "cv-badge-paused" : "cv-badge-incomplete"}`}>
                        {view.status === "active" ? "Active" : view.status === "paused" ? "Paused" : "Draft"}
                      </span>
                    </td>
                    <td>
                      <div className="cv-actions">
                        <button
                          type="button"
                          className="cv-icon-btn"
                          title={`Download data (${String(downloadMonth).padStart(2, "0")}-${downloadYear})`}
                          onClick={() => onDownloadData(view)}
                        >
                          <Download size={14} />
                        </button>
                        <button type="button" className="cv-icon-btn" title="Edit" onClick={() => onEdit(view)}>
                          <Pencil size={14} />
                        </button>
                        {view.status === "paused" ? (
                          <button type="button" className="cv-icon-btn" title="Resume" onClick={() => onResume(view)}>
                            <Play size={14} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="cv-icon-btn"
                            title="Pause"
                            onClick={() => onPause(view)}
                            disabled={view.status !== "active"}
                          >
                            <Pause size={14} />
                          </button>
                        )}
                        <button type="button" className="cv-icon-btn" title="Remove" onClick={() => onRemove(view)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="cv-toolbar" style={{ marginTop: 12 }}>
        <div className="cv-muted">
          {total === 0 ? "No entries" : `Showing ${startItem} to ${endItem} of ${total}`}
        </div>
        <div className="cv-actions">
          <button
            type="button"
            className="cv-btn cv-btn-sm cv-btn-secondary"
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </button>
          <span className="cv-muted">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className="cv-btn cv-btn-sm cv-btn-secondary"
            disabled={page >= totalPages || loading}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
