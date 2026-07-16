"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Upload, X } from "lucide-react";
import {
  documentsService,
  formatApiError,
  type Designation,
  type DocumentType,
  type UploadDocumentInput,
} from "@/lib/api";

const DOCUMENT_TYPES: DocumentType[] = [
  "PDF",
  "Excel",
  "Word",
  "Video",
  "Image",
];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

interface Props {
  designation: Designation;
  targetModules: string[];
  projectId: string;
  onUploadSuccess: () => void;
  onUploadError: (message: string) => void;
}

interface CardState {
  title: string;
  documentType: DocumentType | "";
  targetModule: string;
  description: string;
  fromDate: string;
  toDate: string;
  file: File | null;
}

const INITIAL_STATE: CardState = {
  title: "",
  documentType: "",
  targetModule: "",
  description: "",
  fromDate: "",
  toDate: "",
  file: null,
};

export function DesignationCard({
  designation,
  targetModules,
  projectId,
  onUploadSuccess,
  onUploadError,
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const [state, setState] = useState<CardState>(INITIAL_STATE);
  const [uploading, setUploading] = useState(false);

  const isReady = useMemo(
    () =>
      state.title.trim() !== "" &&
      state.documentType !== "" &&
      state.targetModule !== "" &&
      state.file !== null,
    [state.title, state.documentType, state.targetModule, state.file],
  );

  const hasValidDates = useMemo(() => {
    if (state.fromDate && state.toDate) {
      return new Date(state.fromDate) <= new Date(state.toDate);
    }
    return true;
  }, [state.fromDate, state.toDate]);

  const canUpload = isReady && hasValidDates && !uploading;

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] ?? null;
      if (file && file.size > MAX_FILE_SIZE) {
        onUploadError("File size exceeds 100MB limit");
        return;
      }
      setState((prev) => ({ ...prev, file }));
    },
    [onUploadError],
  );

  const handleClear = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!canUpload || !state.file || !state.documentType) return;

    setUploading(true);
    try {
      const input: UploadDocumentInput = {
        title: state.title.trim(),
        documentType: state.documentType as DocumentType,
        targetModule: state.targetModule,
        designationId: designation.id,
        projectId,
        description: state.description.trim() || undefined,
        fromDate: state.fromDate || undefined,
        toDate: state.toDate || undefined,
        file: state.file,
      };
      await documentsService.uploadDocument(input);
      onUploadSuccess();
    } catch (err) {
      onUploadError(formatApiError(err));
    } finally {
      setUploading(false);
    }
  }, [canUpload, state, designation.id, onUploadSuccess, onUploadError]);

  return (
    <div className="doc-card">
      {/* Card Header */}
      <div className="doc-card-header" onClick={() => setExpanded((e) => !e)}>
        <div className="doc-card-header-left">
          <h3 className="doc-card-title">{designation.name}</h3>
          <span
            className={`doc-card-badge ${isReady ? "badge-ready" : "badge-incomplete"}`}
          >
            {isReady ? "Ready" : "Incomplete"}
          </span>
        </div>
        <button
          type="button"
          className="doc-card-toggle"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Card Body */}
      {expanded && (
        <div className="doc-card-body">
          {/* Title */}
          <div className="doc-field">
            <label className="doc-label">
              Title <span className="doc-required">*</span>
            </label>
            <input
              type="text"
              className="doc-input"
              placeholder="Document title"
              value={state.title}
              onChange={(e) =>
                setState((prev) => ({ ...prev, title: e.target.value }))
              }
            />
          </div>

          {/* Document Type + Target Module row */}
          <div className="doc-field-row">
            <div className="doc-field">
              <label className="doc-label">
                Document Type <span className="doc-required">*</span>
              </label>
              <select
                className="doc-select"
                value={state.documentType}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    documentType: e.target.value as DocumentType | "",
                  }))
                }
              >
                <option value="">Select type...</option>
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="doc-field">
              <label className="doc-label">
                Target Module <span className="doc-required">*</span>
              </label>
              <select
                className="doc-select"
                value={state.targetModule}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    targetModule: e.target.value,
                  }))
                }
              >
                <option value="">Select module...</option>
                {targetModules.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* File Upload */}
          <div className="doc-field">
            <label className="doc-label">
              File <span className="doc-required">*</span>
            </label>
            {state.file ? (
              <div className="doc-file-display">
                <span className="doc-file-name">{state.file.name}</span>
                <span className="doc-file-size">
                  ({(state.file.size / 1024 / 1024).toFixed(2)} MB)
                </span>
                <button
                  type="button"
                  className="doc-file-remove"
                  onClick={() => setState((prev) => ({ ...prev, file: null }))}
                  aria-label="Remove file"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="doc-file-dropzone">
                <Upload size={20} />
                <span>Click or drag to upload (max 100MB)</span>
                <input
                  type="file"
                  className="doc-file-input"
                  onChange={handleFileChange}
                />
              </div>
            )}
          </div>

          {/* Description */}
          <div className="doc-field">
            <label className="doc-label">Description</label>
            <textarea
              className="doc-textarea"
              placeholder="Optional description"
              rows={2}
              value={state.description}
              onChange={(e) =>
                setState((prev) => ({ ...prev, description: e.target.value }))
              }
            />
          </div>

          {/* Date Range */}
          <div className="doc-field-row">
            <div className="doc-field">
              <label className="doc-label">From Date</label>
              <input
                type="date"
                className="doc-input"
                value={state.fromDate}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, fromDate: e.target.value }))
                }
              />
            </div>
            <div className="doc-field">
              <label className="doc-label">To Date</label>
              <input
                type="date"
                className="doc-input"
                value={state.toDate}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, toDate: e.target.value }))
                }
              />
              {!hasValidDates && (
                <span className="doc-field-error">
                  To Date must be after From Date
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="doc-card-actions">
            <button
              type="button"
              className="doc-btn doc-btn-primary"
              disabled={!canUpload}
              onClick={handleUpload}
            >
              {uploading ? "Uploading..." : "Upload Document"}
            </button>
            <button
              type="button"
              className="doc-btn doc-btn-secondary"
              onClick={handleClear}
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
