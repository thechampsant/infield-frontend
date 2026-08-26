"use client";

import { Pause, Pencil, Play, Trash2 } from "lucide-react";
import type { CustomViewConfiguration, Designation } from "@/lib/api";

interface Props {
  views: CustomViewConfiguration[];
  designations: Designation[];
  statusFilter: "all" | "active" | "paused" | "draft";
  onStatusFilterChange: (value: "all" | "active" | "paused" | "draft") => void;
  onEdit: (view: CustomViewConfiguration) => void;
  onPause: (view: CustomViewConfiguration) => void;
  onResume: (view: CustomViewConfiguration) => void;
  onRemove: (view: CustomViewConfiguration) => void;
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
  onEdit,
  onPause,
  onResume,
  onRemove,
}: Props) {
  const filtered = views.filter((view) => statusFilter === "all" || view.status === statusFilter);
  const designationById = new Map(designations.map((item) => [item.id, item]));

  return (
    <div>
      <div className="cv-toolbar" style={{ marginBottom: 8 }}>
        <h2 className="cv-section-title">View Management</h2>
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
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="cv-muted">No views yet.</td>
              </tr>
            ) : (
              filtered.map((view) => {
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
    </div>
  );
}
