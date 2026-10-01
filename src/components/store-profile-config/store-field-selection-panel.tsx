"use client";

import { useCallback, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, GripVertical, Search, X } from "lucide-react";
import type {
  StoreProfileField,
  StoreProfileFieldOption,
} from "@/lib/api/store-profile-config-service";

const TYPE_LABELS: Record<string, string> = {
  STRING: "Text",
  NUMBER: "Number",
  DATE: "Date",
  BOOLEAN: "Yes/No",
  SELECT: "Choice",
  DROPDOWN: "Choice",
  API_SELECT: "Lookup",
  CASCADING_SELECT: "Cascading",
  IMAGE: "Image",
  FILE: "File",
  FORMULA: "Formula",
  SIGNATURE: "Signature",
};

function typeLabel(type: string): string {
  return TYPE_LABELS[String(type).toUpperCase()] ?? type;
}

function toSelected(option: StoreProfileFieldOption, order: number): StoreProfileField {
  return {
    fieldKey: option.fieldKey,
    headerName: option.label,
    fieldType: option.type,
    source: option.source,
    order,
  };
}

interface StoreFieldSelectionPanelProps {
  available: StoreProfileFieldOption[];
  selected: StoreProfileField[];
  onSelectionChange: (next: StoreProfileField[]) => void;
  disabled?: boolean;
  error?: string;
}

/**
 * Two-column field picker. Fully controlled: array position IS the display
 * order, and `order` is stamped once at save time. Reorder is native HTML5 drag
 * (the only precedent in this repo) plus always-visible move buttons, because
 * HTML5 drag is keyboard-inaccessible and inert under touch.
 */
export function StoreFieldSelectionPanel({
  available,
  selected,
  onSelectionChange,
  disabled = false,
  error,
}: StoreFieldSelectionPanelProps) {
  const [search, setSearch] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const selectedKeys = useMemo(
    () => new Set(selected.map((field) => field.fieldKey)),
    [selected],
  );
  const optionsByKey = useMemo(
    () => new Map(available.map((option) => [option.fieldKey, option])),
    [available],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return available;
    return available.filter(
      (option) =>
        option.label.toLowerCase().includes(term) ||
        option.fieldKey.toLowerCase().includes(term),
    );
  }, [available, search]);

  const toggleField = useCallback(
    (option: StoreProfileFieldOption) => {
      if (disabled) return;
      if (selectedKeys.has(option.fieldKey)) {
        onSelectionChange(selected.filter((field) => field.fieldKey !== option.fieldKey));
        return;
      }
      onSelectionChange([...selected, toSelected(option, selected.length + 1)]);
    },
    [disabled, onSelectionChange, selected, selectedKeys],
  );

  // Scoped to the current search result, matching the report builder.
  const selectAllFiltered = useCallback(() => {
    if (disabled) return;
    const additions = filtered
      .filter((option) => !selectedKeys.has(option.fieldKey))
      .map((option, index) => toSelected(option, selected.length + index + 1));
    if (additions.length === 0) return;
    onSelectionChange([...selected, ...additions]);
  }, [disabled, filtered, onSelectionChange, selected, selectedKeys]);

  const clearSelection = useCallback(() => {
    if (disabled) return;
    onSelectionChange([]);
  }, [disabled, onSelectionChange]);

  const removeAt = useCallback(
    (index: number) => {
      if (disabled) return;
      onSelectionChange(selected.filter((_, i) => i !== index));
    },
    [disabled, onSelectionChange, selected],
  );

  /** One reorder implementation for both drag and the move buttons. */
  const reorder = useCallback(
    (from: number, to: number) => {
      if (disabled) return;
      if (to < 0 || to >= selected.length || from === to) return;
      const next = [...selected];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      onSelectionChange(next);
    },
    [disabled, onSelectionChange, selected],
  );

  const handleDrop = useCallback(
    (targetIndex: number) => {
      if (dragIndex === null) return;
      reorder(dragIndex, targetIndex);
      setDragIndex(null);
    },
    [dragIndex, reorder],
  );

  const orphanCount = selected.filter((field) => !optionsByKey.has(field.fieldKey)).length;

  return (
    <div className="sp-field-panel">
      {error ? <div className="sp-field-error">{error}</div> : null}

      <div className="sp-field-grid">
        {/* ── Available ─────────────────────────────── */}
        <section className="sp-field-column">
          <header className="sp-field-column-head">
            <h3>
              Available fields
              <span className="sp-count">
                {search.trim() ? `${filtered.length} / ${available.length}` : available.length}
              </span>
            </h3>
            <div className="sp-field-column-actions">
              <button type="button" onClick={selectAllFiltered} disabled={disabled}>
                Select all
              </button>
              <button type="button" onClick={clearSelection} disabled={disabled || selected.length === 0}>
                Clear selection
              </button>
            </div>
          </header>

          <div className="sp-search">
            <Search size={15} aria-hidden="true" />
            <input
              className="form-input"
              type="search"
              value={search}
              placeholder="Search fields"
              aria-label="Search Store Master fields"
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="sp-field-list">
            {filtered.length === 0 ? (
              <p className="sp-field-empty">No fields match &ldquo;{search}&rdquo;.</p>
            ) : (
              filtered.map((option) => (
                <label key={option.fieldKey} className="sp-field-option">
                  <input
                    type="checkbox"
                    checked={selectedKeys.has(option.fieldKey)}
                    disabled={disabled}
                    onChange={() => toggleField(option)}
                  />
                  <span className="sp-field-option-label">{option.label}</span>
                  <span className="sp-badge sp-badge-type">{typeLabel(option.type)}</span>
                  <span className={`sp-badge sp-badge-source ${option.source.toLowerCase()}`}>
                    {option.source === "UDF" ? "UDF" : "Static"}
                  </span>
                </label>
              ))
            )}
          </div>
        </section>

        {/* ── Selected ──────────────────────────────── */}
        <section className="sp-field-column">
          <header className="sp-field-column-head">
            <h3>
              Shown on the profile
              <span className="sp-count">{selected.length}</span>
            </h3>
            <p className="sp-field-hint">Drag, or use the arrows, to set the order shown in the app.</p>
          </header>

          <div className="sp-field-list">
            {selected.length === 0 ? (
              <p className="sp-field-empty">
                No fields selected. Pick at least one field from the left.
              </p>
            ) : (
              selected.map((field, index) => {
                const option = optionsByKey.get(field.fieldKey);
                const isOrphan = !option;
                return (
                  <div
                    key={field.fieldKey}
                    className={`sp-selected-row${isOrphan ? " orphan" : ""}`}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => handleDrop(index)}
                  >
                    <span
                      className="sp-drag-handle"
                      draggable={!disabled && !isOrphan}
                      onDragStart={() => setDragIndex(index)}
                      aria-hidden="true"
                    >
                      <GripVertical size={15} />
                    </span>
                    <span className="sp-order">{index + 1}</span>
                    <span className="sp-selected-label">
                      {option?.label ?? field.headerName}
                      {isOrphan ? (
                        <small className="sp-orphan-note">
                          <AlertTriangle size={12} aria-hidden="true" /> No longer in Store Master
                        </small>
                      ) : null}
                    </span>
                    <span className={`sp-badge sp-badge-source ${field.source.toLowerCase()}`}>
                      {field.source === "UDF" ? "UDF" : "Static"}
                    </span>
                    <span className="sp-row-actions" onMouseDown={(event) => event.stopPropagation()}>
                      <button
                        type="button"
                        aria-label={`Move ${option?.label ?? field.headerName} up`}
                        disabled={disabled || index === 0}
                        onClick={() => reorder(index, index - 1)}
                      >
                        <ChevronUp size={15} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Move ${option?.label ?? field.headerName} down`}
                        disabled={disabled || index === selected.length - 1}
                        onClick={() => reorder(index, index + 1)}
                      >
                        <ChevronDown size={15} />
                      </button>
                      <button
                        type="button"
                        className="sp-remove"
                        aria-label={`Remove ${option?.label ?? field.headerName}`}
                        disabled={disabled}
                        onClick={() => removeAt(index)}
                      >
                        <X size={15} />
                      </button>
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {orphanCount > 0 ? (
            <p className="sp-orphan-banner">
              {orphanCount} selected field{orphanCount === 1 ? " is" : "s are"} no longer in Store
              Master and will not be shown in the app.
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
