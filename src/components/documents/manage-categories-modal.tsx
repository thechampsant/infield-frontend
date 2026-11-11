"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { documentsService, type ResourceCategories, type SaveResourceCategoriesInput } from "@/lib/api/documents-service";
import { formatApiError } from "@/lib/api/get-api-error-message";
import { CATEGORY_NAME_MAX_LENGTH, categoryNameError } from "@/lib/resource-categories";

interface DraftCategory {
  key: string;
  name: string;
  originalName?: string;
  documentCount: number;
  isActive: boolean;
}

interface Props {
  projectId: string;
  onClose: () => void;
  onSaved: (result: ResourceCategories, categories: SaveResourceCategoriesInput["categories"]) => void;
}

export function ManageCategoriesModal({ projectId, onClose, onSaved }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const savingRef = useRef(false);
  const nextKey = useRef(0);
  const [snapshot, setSnapshot] = useState<ResourceCategories | null>(null);
  const [rows, setRows] = useState<DraftCategory[]>([]);
  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  useEffect(() => {
    let cancelled = false;
    documentsService.getCategories(projectId).then((result) => {
      if (cancelled) return;
      setSnapshot(result);
      setRows(result.categories.map((category) => ({ ...category, originalName: category.name, key: `existing:${category.name}` })));
    }).catch((error) => {
      if (!cancelled) setLoadError(formatApiError(error));
    });
    return () => { cancelled = true; };
  }, [projectId, attempt]);

  const errors = rows.map((row, index) => categoryNameError(row.name, rows.filter((_, other) => other !== index).map((other) => other.name)));
  const changed = snapshot && (rows.length !== snapshot.categories.length || rows.some((row, index) => row.name.trim() !== snapshot.categories[index]?.name || row.originalName !== snapshot.categories[index]?.name));
  const canSave = Boolean(snapshot && !loadError && changed && !saving && errors.every((error) => !error));

  function addCategory() {
    const error = categoryNameError(newName, rows.map((row) => row.name));
    setAddError(error);
    if (error) return;
    setRows((previous) => [...previous, { key: `new:${nextKey.current++}`, name: newName.trim(), documentCount: 0, isActive: true }]);
    setNewName("");
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!canSave || !snapshot || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setSaveError(null);
    const categories = rows.map((row) => ({ name: row.name.trim(), originalName: row.originalName, isActive: row.isActive }));
    try {
      const result = await documentsService.saveCategories({ projectId, revision: snapshot.revision, categories });
      onSaved(result, categories);
    } catch (error) {
      setSaveError(formatApiError(error));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <dialog ref={dialogRef} className="doc-modal doc-categories-modal" aria-labelledby="doc-categories-title" onCancel={(event) => { event.preventDefault(); if (!savingRef.current) onClose(); }}>
      <form onSubmit={save} noValidate>
        <div className="doc-modal-head">
          <div><h3 id="doc-categories-title">Manage categories</h3><p>Organize this project’s resources. Names can have up to 24 characters.</p></div>
          <button type="button" className="doc-btn doc-btn-secondary doc-btn-sm" aria-label="Close categories" disabled={saving} onClick={onClose}><X size={16} /></button>
        </div>
        <fieldset className="doc-categories-body" disabled={saving}>
          {loadError ? <div role="alert" className="doc-field-error">{loadError} <button type="button" className="doc-btn doc-btn-secondary doc-btn-sm" onClick={() => { setLoadError(null); setAttempt((value) => value + 1); }}>Retry</button></div> : !snapshot ? <p role="status">Loading categories…</p> : <>
            <div className="doc-category-list">
              {rows.length === 0 && <p className="doc-table-info">No categories. Add one below to start organizing resources.</p>}
              {rows.map((row, index) => (
                <div className="doc-category-row" key={row.key}>
                  <div className="doc-field">
                    <label className="doc-label" htmlFor={`category-${index}`}>Category {index + 1}</label>
                    <input id={`category-${index}`} className="doc-input" value={row.name} maxLength={CATEGORY_NAME_MAX_LENGTH} aria-invalid={Boolean(errors[index])} aria-describedby={errors[index] ? `category-error-${index}` : undefined} onChange={(event) => setRows((previous) => previous.map((item) => item.key === row.key ? { ...item, name: event.target.value } : item))} />
                    {errors[index] && <span className="doc-field-error" id={`category-error-${index}`}>{errors[index]}</span>}
                  </div>
                  <span className="doc-category-count">{row.documentCount} {row.documentCount === 1 ? "document" : "documents"}</span>
                  <button type="button" className="doc-btn doc-btn-secondary doc-btn-sm" disabled={row.documentCount > 0} title={row.documentCount > 0 ? "Categories with documents cannot be removed" : `Remove ${row.name}`} aria-label={`Remove ${row.name || `category ${index + 1}`}`} onClick={() => setRows((previous) => previous.filter((item) => item.key !== row.key))}><Trash2 size={14} /> Remove</button>
                </div>
              ))}
            </div>
            <div className="doc-category-add">
              <div className="doc-field">
                <label htmlFor="doc-new-category" className="doc-label">New category</label>
                <input id="doc-new-category" className="doc-input" value={newName} maxLength={CATEGORY_NAME_MAX_LENGTH} placeholder="For example, Cooking" aria-invalid={Boolean(addError)} aria-describedby={addError ? "doc-category-add-error" : undefined} onChange={(event) => { setNewName(event.target.value); setAddError(null); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addCategory(); } }} />
                {addError && <span id="doc-category-add-error" className="doc-field-error" role="alert">{addError}</span>}
              </div>
              <button type="button" className="doc-btn doc-btn-secondary" onClick={addCategory}><Plus size={14} /> Add category</button>
            </div>
          </>}
        </fieldset>
        {saveError && <p className="doc-categories-error doc-field-error" role="alert">{saveError}</p>}
        <div className="doc-categories-footer">
          <button type="button" className="doc-btn doc-btn-secondary" disabled={saving} onClick={onClose}>Cancel</button>
          <button type="submit" className="doc-btn doc-btn-primary" disabled={!canSave}>{saving ? "Saving…" : "Save"}</button>
        </div>
      </form>
    </dialog>
  );
}
