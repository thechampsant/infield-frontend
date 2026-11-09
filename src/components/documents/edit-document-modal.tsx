"use client";

import { useEffect, useRef, useState } from "react";
import { documentsService, type DocumentRecord, type UpdateDocumentInput } from "@/lib/api/documents-service";
import { ApiError } from "@/lib/api/api-client";
import { formatApiError } from "@/lib/api/get-api-error-message";
import type { Designation } from "@/lib/api/designation-service";
import { AlsoAssignTo } from "./also-assign-to";
import { documentFileAccept, getDocumentUrl, parseYouTubeUrl, validateDocumentDetails, validateDocumentFile, validateYouTubeUrl } from "@/lib/documents";

interface Props {
  document: DocumentRecord;
  designations: Designation[];
  onSave: (input: UpdateDocumentInput) => Promise<void>;
  onCancel: () => void;
}

export function EditDocumentModal({ document: doc, designations, onSave, onCancel }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const savingRef = useRef(false);
  const [values, setValues] = useState(() => ({
    title: doc.title,
    category: doc.category ?? "",
    description: doc.description ?? "",
    fromDate: doc.fromDate?.slice(0, 10) ?? "",
    toDate: doc.toDate?.slice(0, 10) ?? "",
    acknowledgementRequired: Boolean(doc.acknowledgementRequired),
    youtubeUrl: doc.youtubeUrl || (doc.documentType === "YouTube" ? doc.fileUrl : ""),
  }));
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [assignedIds, setAssignedIds] = useState<string[]>([]);
  const [assignmentAvailable, setAssignmentAvailable] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [assignmentLoading, setAssignmentLoading] = useState(true);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [assignmentAttempt, setAssignmentAttempt] = useState(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  useEffect(() => {
    let cancelled = false;
    documentsService.getAssignments(doc)
      .then((result) => {
        if (!cancelled) {
          setAssignedIds(result.designationIds);
          setAssignmentAvailable(result.canAssign);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          const status = error instanceof ApiError ? ` (HTTP ${error.status})` : "";
          setAssignmentError(`${formatApiError(error)}${status}`);
        }
      })
      .finally(() => {
        if (!cancelled) setAssignmentLoading(false);
      });
    return () => { cancelled = true; };
  }, [doc, assignmentAttempt]);

  const errors = validateDocumentDetails(values);
  const youtubeError = doc.documentType === "YouTube" ? validateYouTubeUrl(values.youtubeUrl) : null;
  const youtubeDetails = doc.documentType === "YouTube" ? parseYouTubeUrl(values.youtubeUrl) : null;
  const currentUrl = getDocumentUrl(doc);
  const canSave = !saving && !youtubeError && Object.keys(errors).length === 0;

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!canSave || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      await onSave({
        title: values.title.trim(),
        category: values.category.trim(),
        description: values.description.trim() || null,
        fromDate: values.fromDate || null,
        toDate: values.toDate || null,
        acknowledgementRequired: values.acknowledgementRequired,
        alsoAssignTo: assignmentAvailable && !assignmentLoading && !assignmentError
          ? selectedIds.filter((id) => id !== doc.designationId && !assignedIds.includes(id))
          : [],
        ...(file ? { file } : {}),
        ...(doc.documentType === "YouTube" ? { youtubeUrl: values.youtubeUrl.trim() } : {}),
      });
    } catch (error) {
      setSaveError(formatApiError(error));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="doc-modal doc-edit-modal"
      aria-labelledby="doc-edit-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!savingRef.current) onCancel();
      }}
    >
      <form onSubmit={handleSave} noValidate>
        <div className="doc-modal-head">
          <div>
            <h3 id="doc-edit-title">Edit Document</h3>
            <p>{designations.find((designation) => designation.id === doc.designationId)?.name ?? doc.designationId} · v{doc.documentVersion ?? 1} · {doc.status}</p>
          </div>
          <button type="button" className="doc-btn doc-btn-secondary doc-btn-sm" disabled={saving} onClick={onCancel}>Close</button>
        </div>
        <fieldset className="doc-edit-body" disabled={saving}>
          <div className="doc-field">
            <label className="doc-label" htmlFor="doc-edit-title-input">Title <span className="doc-required">*</span></label>
            <input id="doc-edit-title-input" className="doc-input" value={values.title} aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? "doc-edit-title-error" : undefined} onChange={(event) => setValues({ ...values, title: event.target.value })} />
            {errors.title && <span id="doc-edit-title-error" className="doc-field-error">{errors.title}</span>}
          </div>
          <div className="doc-field-row">
            <div className="doc-field">
              <label className="doc-label" htmlFor="doc-edit-type">Document Type</label>
              <input id="doc-edit-type" className="doc-input" value={doc.documentType === "YouTube" ? "YouTube Link" : doc.documentType} readOnly />
            </div>
            <div className="doc-field">
              <label className="doc-label" htmlFor="doc-edit-category">Category <span className="doc-required">*</span></label>
              <input id="doc-edit-category" className="doc-input" value={values.category} aria-invalid={Boolean(errors.category)} aria-describedby={errors.category ? "doc-edit-category-error" : undefined} onChange={(event) => setValues({ ...values, category: event.target.value })} />
              {errors.category && <span id="doc-edit-category-error" className="doc-field-error">{errors.category}</span>}
            </div>
          </div>
          <div className="doc-field">
            <span className="doc-label">Current {doc.documentType === "YouTube" ? "link" : "file"}</span>
            {currentUrl ? <a className="doc-current-file" href={currentUrl} target="_blank" rel="noopener noreferrer">{doc.documentType === "YouTube" ? currentUrl : doc.originalFileName}</a> : <span>{doc.originalFileName || "File unavailable"}</span>}
          </div>
          {doc.documentType === "YouTube" ? (
            <div className="doc-field">
              <label className="doc-label" htmlFor="doc-edit-youtube">YouTube link</label>
              <input id="doc-edit-youtube" className="doc-input" type="url" value={values.youtubeUrl} aria-invalid={Boolean(youtubeError)} aria-describedby={youtubeError ? "doc-edit-youtube-error" : undefined} onChange={(event) => setValues({ ...values, youtubeUrl: event.target.value })} />
              {youtubeDetails?.notice && <span className="doc-edit-help" role="status">{youtubeDetails.notice}</span>}
              {youtubeError && <span id="doc-edit-youtube-error" className="doc-field-error">{youtubeError}</span>}
            </div>
          ) : (
            <div className="doc-field">
              <label className="doc-label" htmlFor="doc-edit-file">Replace file (optional)</label>
              <input id="doc-edit-file" type="file" accept={documentFileAccept(doc.documentType)} aria-describedby="doc-edit-file-help doc-edit-file-error" onChange={(event) => {
                const candidate = event.target.files?.[0];
                if (!candidate) return;
                const error = validateDocumentFile(candidate, doc.documentType);
                setFileError(error);
                setFile(error ? null : candidate);
                event.target.value = "";
              }} />
              <span id="doc-edit-file-help" className="doc-edit-help">Same document type, up to 100 MB. Replacing the file publishes a new version.</span>
              <span id="doc-edit-file-error" className="doc-field-error" role="alert">{fileError}</span>
              {file && <div className="doc-file-display"><span className="doc-file-name">Replacement: {file.name}</span><button type="button" className="doc-btn doc-btn-secondary doc-btn-sm" onClick={() => { setFile(null); setFileError(null); }}>Remove replacement</button></div>}
            </div>
          )}
          <div className="doc-field">
            <label className="doc-label" htmlFor="doc-edit-description">Description</label>
            <textarea id="doc-edit-description" className="doc-textarea" rows={3} value={values.description} onChange={(event) => setValues({ ...values, description: event.target.value })} />
          </div>
          <div className="doc-field-row">
            <div className="doc-field">
              <label className="doc-label" htmlFor="doc-edit-from">From Date</label>
              <input id="doc-edit-from" type="date" className="doc-input" value={values.fromDate} onChange={(event) => setValues({ ...values, fromDate: event.target.value })} />
            </div>
            <div className="doc-field">
              <label className="doc-label" htmlFor="doc-edit-to">To Date</label>
              <input id="doc-edit-to" type="date" className="doc-input" value={values.toDate} aria-invalid={Boolean(errors.toDate)} aria-describedby={errors.toDate ? "doc-edit-date-error" : undefined} onChange={(event) => setValues({ ...values, toDate: event.target.value })} />
              {errors.toDate && <span id="doc-edit-date-error" className="doc-field-error">{errors.toDate}</span>}
            </div>
          </div>
          <div className="doc-field">
            <label className="doc-label" htmlFor="doc-edit-ack">Acknowledgement Required</label>
            <select id="doc-edit-ack" className="doc-select" value={values.acknowledgementRequired ? "yes" : "no"} onChange={(event) => setValues({ ...values, acknowledgementRequired: event.target.value === "yes" })}>
              <option value="no">No</option><option value="yes">Yes</option>
            </select>
          </div>
          {assignmentLoading ? <p role="status">Loading assignments...</p> : assignmentError ? (
            <div role="alert" className="doc-field-error">Additional assignments could not be checked: {assignmentError}. You can still edit this document. <button type="button" className="doc-btn doc-btn-secondary doc-btn-sm" onClick={() => { setAssignmentLoading(true); setAssignmentError(null); setSelectedIds([]); setAssignmentAvailable(false); setAssignmentAttempt((attempt) => attempt + 1); }}>Retry</button></div>
          ) : !assignmentAvailable ? (
            <p className="doc-edit-help">Additional assignments aren’t available for this document yet. You can still edit its details.</p>
          ) : <AlsoAssignTo designations={designations} ownDesignationId={doc.designationId} assignedIds={assignedIds} selectedIds={selectedIds} onChange={setSelectedIds} />}
        </fieldset>
        {saveError && <p className="doc-edit-save-error doc-field-error" role="alert">{saveError}</p>}
        <div className="doc-edit-footer">
          <button type="button" className="doc-btn doc-btn-secondary" disabled={saving} onClick={onCancel}>Cancel</button>
          <button type="submit" className="doc-btn doc-btn-primary" disabled={!canSave}>{saving ? "Saving..." : "Save"}</button>
        </div>
      </form>
    </dialog>
  );
}
