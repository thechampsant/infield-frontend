"use client";

import { useRef, useState } from "react";

/**
 * Shared Bulk Upload tab used by the Add Account / Add Project modals.
 * Provides the template download link, drop zone, and selected-file card.
 * The backend bulk endpoints are not yet available (see api-docs.json), so
 * the parent surfaces a "pending backend" message on submit.
 */
export function BulkUploadTab({
  templateHref,
  file,
  onFileChange,
}: {
  templateHref: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <div>
      <div style={{ marginBottom: "var(--if2-sp-16)" }}>
        <a className="btn btn-secondary w-full" href={templateHref} download>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download Excel Template
        </a>
      </div>

      <div className="if2-banner info">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        Bulk upload is not available on the live API yet (no bulk import
        endpoints in Swagger). Individual create uses live CRUD; phone is
        collected in the form until the backend adds that field.
      </div>

      <div
        className="upload-area"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const dropped = e.dataTransfer.files?.[0];
          if (dropped) onFileChange(dropped);
        }}
        style={dragOver ? { borderColor: "var(--if2-blue)", background: "var(--if2-blue-pale)" } : undefined}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <div className="upload-area-title">Drop your Excel file here</div>
        <div className="upload-area-sub">
          or <span className="upload-area-link">browse files</span> &nbsp;·&nbsp;
          .xlsx only
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          style={{ display: "none" }}
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
        />
      </div>

      {file && (
        <div className="upload-file-card">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span className="upload-file-name">{file.name}</span>
          <span
            className="upload-file-remove"
            onClick={(e) => {
              e.stopPropagation();
              onFileChange(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
          >
            Remove
          </span>
        </div>
      )}
    </div>
  );
}
