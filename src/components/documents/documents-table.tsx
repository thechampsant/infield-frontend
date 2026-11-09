"use client";

import { useMemo } from "react";
import { Download, ExternalLink, Filter, Pencil, X } from "lucide-react";
import { getDocumentUrl } from "@/lib/documents";
import type { Designation, DocumentRecord, DocumentStatus } from "@/lib/api";

interface Props {
  documents: DocumentRecord[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onEdit: (doc: DocumentRecord) => void;
  loading: boolean;
  designations: Designation[];
  filterFromDate: string;
  filterToDate: string;
  onFilterFromDateChange: (value: string) => void;
  onFilterToDateChange: (value: string) => void;
  onFilterLoad: () => void;
  onFilterClear: () => void;
  onStatusToggle: (docId: string, newStatus: DocumentStatus) => void;
  onViewAcknowledgements?: (doc: DocumentRecord) => void;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsTable({
  documents,
  total,
  page,
  pageSize,
  onPageChange,
  onEdit,
  loading,
  designations,
  filterFromDate,
  filterToDate,
  onFilterFromDateChange,
  onFilterToDateChange,
  onFilterLoad,
  onFilterClear,
  onStatusToggle,
  onViewAcknowledgements,
}: Props) {
  const designationMap = useMemo(() => {
    const map = new Map<string, string>();
    designations.forEach((d) => map.set(d.id, d.name));
    return map;
  }, [designations]);

  return (
    <div className="doc-table-section">
      {/* Filter row */}
      <div className="doc-filter-row">
        <div className="doc-filter-fields">
          <div className="doc-field doc-field-inline">
            <label className="doc-label">From</label>
            <input
              type="date"
              className="doc-input"
              value={filterFromDate}
              onChange={(e) => onFilterFromDateChange(e.target.value)}
            />
          </div>
          <div className="doc-field doc-field-inline">
            <label className="doc-label">To</label>
            <input
              type="date"
              className="doc-input"
              value={filterToDate}
              onChange={(e) => onFilterToDateChange(e.target.value)}
            />
          </div>
        </div>
        <div className="doc-filter-actions">
          <button
            type="button"
            className="doc-btn doc-btn-primary doc-btn-sm"
            onClick={onFilterLoad}
          >
            <Filter size={14} />
            Load
          </button>
          <button
            type="button"
            className="doc-btn doc-btn-secondary doc-btn-sm"
            onClick={onFilterClear}
          >
            <X size={14} />
            Clear
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="doc-table-loading">Loading documents...</div>
      ) : documents.length === 0 ? (
        <div className="doc-table-empty">
          No documents found{filterFromDate || filterToDate
            ? " for the selected date range"
            : ""}
        </div>
      ) : (
        <>
          <div className="doc-table-info">
            Showing {(page - 1) * pageSize + 1}–{(page - 1) * pageSize + documents.length} of {total} documents
          </div>
          <div className="doc-table-wrapper">
            <table className="doc-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Target Module</th>
                  <th>Designation</th>
                  <th>Timeline</th>
                  <th>Size</th>
                  <th>Ack</th>
                  <th>Version</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc._id}>
                    <td className="doc-cell-title">{doc.title}</td>
                    <td>{doc.category || "—"}</td>
                    <td>{doc.documentType === "YouTube" ? "YouTube Link" : doc.documentType}</td>
                    <td>{doc.targetModule}</td>
                    <td>
                      {designationMap.get(doc.designationId) ??
                        doc.designationId}
                    </td>
                    <td className="doc-cell-timeline">
                      {formatDate(doc.fromDate)} — {formatDate(doc.toDate)}
                    </td>
                    <td>{doc.documentType === "YouTube" ? "—" : formatFileSize(doc.fileSize)}</td>
                    <td>{doc.acknowledgementRequired ? "Required" : "No"}</td>
                    <td>v{doc.documentVersion ?? 1}</td>
                    <td>
                      <span
                        className={`doc-status-badge ${doc.status === "Active" ? "badge-active" : "badge-inactive"}`}
                      >
                        {doc.status}
                      </span>
                    </td>
                    <td className="doc-cell-actions">
                      <button type="button" className="doc-btn doc-btn-sm doc-btn-secondary" onClick={() => onEdit(doc)}>
                        <Pencil size={12} /> Edit
                      </button>
                      <button
                        type="button"
                        className={`doc-btn doc-btn-sm ${doc.status === "Active" ? "doc-btn-secondary" : "doc-btn-success"}`}
                        onClick={() =>
                          onStatusToggle(
                            doc._id,
                            doc.status === "Active" ? "Inactive" : "Active",
                          )
                        }
                      >
                        {doc.status === "Active"
                          ? "Make Inactive"
                          : "Make Active"}
                      </button>
                      {getDocumentUrl(doc) && <a
                        href={getDocumentUrl(doc)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="doc-btn doc-btn-sm doc-btn-primary"
                      >
                        {doc.documentType === "YouTube" ? <ExternalLink size={12} /> : <Download size={12} />}
                        {doc.documentType === "YouTube" ? "Open" : "Download"}
                      </a>}
                      {doc.acknowledgementRequired && onViewAcknowledgements && (
                        <button
                          type="button"
                          className="doc-btn doc-btn-sm doc-btn-secondary"
                          onClick={() => onViewAcknowledgements(doc)}
                        >
                          Ack Status
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav className="doc-pagination" aria-label="Documents pagination">
            <button type="button" className="doc-btn doc-btn-secondary doc-btn-sm" disabled={page <= 1 || loading} onClick={() => onPageChange(page - 1)}>Previous</button>
            <span aria-live="polite">Page {page} of {Math.max(1, Math.ceil(total / pageSize))}</span>
            <button type="button" className="doc-btn doc-btn-secondary doc-btn-sm" disabled={page * pageSize >= total || loading} onClick={() => onPageChange(page + 1)}>Next</button>
          </nav>
        </>
      )}
    </div>
  );
}
