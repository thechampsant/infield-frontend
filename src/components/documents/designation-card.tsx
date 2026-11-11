"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Upload, X } from "lucide-react";
import {
  documentsService,
  formatApiError,
  type Designation,
  type DocumentType,
} from "@/lib/api";
import { documentFileAccept, parseYouTubeUrl, validateDocumentFile, validateYouTubeUrl } from "@/lib/documents";

const DOCUMENT_TYPES: DocumentType[] = [
  "PDF",
  "Excel",
  "Word",
  "Video",
  "Image",
  "YouTube",
];

interface Props {
  designation: Designation;
  targetModules: string[];
  categoryRenames: Record<string, string>;
  projectId: string;
  onUploadSuccess: () => void;
  onUploadError: (message: string) => void;
}

interface CardState {
  title: string;
  youtubeUrl: string;
  documentType: DocumentType | "";
  targetModule: string;
  description: string;
  fromDate: string;
  toDate: string;
  acknowledgementRequired: boolean;
  file: File | null;
}

const INITIAL_STATE: CardState = {
  title: "",
  youtubeUrl: "",
  documentType: "",
  targetModule: "",
  description: "",
  fromDate: "",
  toDate: "",
  acknowledgementRequired: false,
  file: null,
};

export function DesignationCard({
  designation,
  targetModules,
  categoryRenames,
  projectId,
  onUploadSuccess,
  onUploadError,
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const [state, setState] = useState<CardState>(INITIAL_STATE);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    // Keep a partially completed upload attached to its renamed saved category.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState((previous) => categoryRenames[previous.targetModule]
      ? { ...previous, targetModule: categoryRenames[previous.targetModule] }
      : previous);
  }, [categoryRenames]);

  const isReady = useMemo(
    () =>
      state.title.trim() !== "" &&
      state.documentType !== "" &&
      targetModules.includes(state.targetModule) &&
      (state.documentType === "YouTube"
        ? validateYouTubeUrl(state.youtubeUrl) === null
        : state.file !== null),
    [state.title, state.documentType, state.targetModule, state.youtubeUrl, state.file, targetModules],
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
      if (file && state.documentType) {
        const error = validateDocumentFile(file, state.documentType);
        if (error) {
          onUploadError(error);
          e.target.value = "";
          return;
        }
      }
      setState((prev) => ({ ...prev, file }));
    },
    [onUploadError, state.documentType],
  );

  const handleClear = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!canUpload || !state.documentType) return;

    setUploading(true);
    try {
      const metadata = {
        title: state.title.trim(),
        targetModule: state.targetModule,
        designationId: designation.id,
        projectId,
        description: state.description.trim() || undefined,
        fromDate: state.fromDate || undefined,
        toDate: state.toDate || undefined,
        acknowledgementRequired: state.acknowledgementRequired,
      };
      if (state.documentType === "YouTube") {
        await documentsService.uploadDocument({ ...metadata, documentType: "YouTube", youtubeUrl: state.youtubeUrl });
      } else {
        if (!state.file) return;
        await documentsService.uploadDocument({ ...metadata, documentType: state.documentType, file: state.file });
      }
      onUploadSuccess();
    } catch (err) {
      onUploadError(formatApiError(err));
    } finally {
      setUploading(false);
    }
  }, [canUpload, state, designation.id, projectId, onUploadSuccess, onUploadError]);

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

          {/* Document Type + Category row */}
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
                    file: null,
                    youtubeUrl: "",
                  }))
                }
              >
                <option value="">Select type...</option>
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t === "YouTube" ? "YouTube Link" : t}
                  </option>
                ))}
              </select>
            </div>

            <div className="doc-field">
              <label className="doc-label" htmlFor={`doc-upload-category-${designation.id}`}>
                Category <span className="doc-required">*</span>
              </label>
              <select
                id={`doc-upload-category-${designation.id}`}
                className="doc-select"
                value={state.targetModule}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    targetModule: e.target.value,
                  }))
                }
              >
                <option value="">Select category...</option>
                {targetModules.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* File Upload */}
          {state.documentType === "YouTube" ? (
            <div className="doc-field">
              <label className="doc-label" htmlFor={`doc-upload-youtube-${designation.id}`}>YouTube Link <span className="doc-required">*</span></label>
              <input id={`doc-upload-youtube-${designation.id}`} type="url" className="doc-input" value={state.youtubeUrl} placeholder="Paste a YouTube video or playlist link" aria-describedby={`doc-upload-youtube-help-${designation.id}`} aria-invalid={Boolean(state.youtubeUrl && validateYouTubeUrl(state.youtubeUrl))} onChange={(event) => setState((previous) => ({ ...previous, youtubeUrl: event.target.value }))} />
              <span id={`doc-upload-youtube-help-${designation.id}`} className={state.youtubeUrl && validateYouTubeUrl(state.youtubeUrl) ? "doc-field-error" : "doc-edit-help"} role="status">
                {state.youtubeUrl && (validateYouTubeUrl(state.youtubeUrl) || parseYouTubeUrl(state.youtubeUrl)?.notice)}
              </span>
            </div>
          ) : <div className="doc-field">
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
                  accept={state.documentType ? documentFileAccept(state.documentType) : undefined}
                  className="doc-file-input"
                  onChange={handleFileChange}
                />
              </div>
            )}
          </div>}

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

          <div className="doc-field">
            <label className="doc-label">Acknowledgement Required</label>
            <select
              className="doc-select"
              value={state.acknowledgementRequired ? "yes" : "no"}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  acknowledgementRequired: e.target.value === "yes",
                }))
              }
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>

          {/* Actions */}
          <div className="doc-card-actions">
            <button
              type="button"
              className="doc-btn doc-btn-primary"
              disabled={!canUpload}
              onClick={handleUpload}
            >
              {uploading ? "Saving..." : state.documentType === "YouTube" ? "Add Link" : "Upload Document"}
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
