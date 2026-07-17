"use client";

import { useCallback, useMemo, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import type { Designation } from "@/lib/api";

interface Props {
  designations: Designation[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function DesignationSelector({
  designations,
  selectedIds,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return designations;
    const lower = search.toLowerCase();
    return designations.filter((d) => d.name.toLowerCase().includes(lower));
  }, [designations, search]);

  const toggleItem = useCallback(
    (id: string) => {
      onChange(
        selectedIds.includes(id)
          ? selectedIds.filter((i) => i !== id)
          : [...selectedIds, id],
      );
    },
    [selectedIds, onChange],
  );

  const selectAll = useCallback(() => {
    onChange(designations.map((d) => d.id));
  }, [designations, onChange]);

  const clearAll = useCallback(() => {
    onChange([]);
  }, [onChange]);

  const removePill = useCallback(
    (id: string) => {
      onChange(selectedIds.filter((i) => i !== id));
    },
    [selectedIds, onChange],
  );

  const selectedDesignations = useMemo(
    () => designations.filter((d) => selectedIds.includes(d.id)),
    [designations, selectedIds],
  );

  return (
    <div className="doc-designation-selector">
      {/* Dropdown trigger */}
      <div className="doc-selector-trigger-row">
        <button
          type="button"
          className="doc-selector-trigger"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          <span>
            {selectedIds.length === 0
              ? "Select Designations..."
              : `${selectedIds.length} selected`}
          </span>
          <ChevronDown size={16} className={open ? "rotate-180" : ""} />
        </button>

        <button
          type="button"
          className="doc-btn doc-btn-sm doc-btn-primary"
          onClick={selectAll}
        >
          Select All
        </button>
        <button
          type="button"
          className="doc-btn doc-btn-sm doc-btn-secondary"
          onClick={clearAll}
        >
          Clear All
        </button>
      </div>

      {/* Dropdown panel */}
      {open && (
        <div className="doc-selector-dropdown" role="listbox">
          <div className="doc-selector-search">
            <Search size={14} />
            <input
              type="text"
              placeholder="Search designations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <ul className="doc-selector-list">
            {filtered.length === 0 && (
              <li className="doc-selector-empty">No designations found</li>
            )}
            {filtered.map((d) => {
              const selected = selectedIds.includes(d.id);
              return (
                <li key={d.id}>
                  <button
                    type="button"
                    className={`doc-selector-item ${selected ? "is-selected" : ""}`}
                    onClick={() => toggleItem(d.id)}
                    role="option"
                    aria-selected={selected}
                  >
                    <span
                      className={`doc-checkbox ${selected ? "checked" : ""}`}
                    >
                      {selected && <Check size={12} />}
                    </span>
                    <span>{d.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Selected pills */}
      {selectedDesignations.length > 0 && (
        <div className="doc-pills" role="list">
          {selectedDesignations.map((d) => (
            <span key={d.id} className="doc-pill" role="listitem">
              {d.name}
              <button
                type="button"
                onClick={() => removePill(d.id)}
                className="doc-pill-remove"
                aria-label={`Remove ${d.name}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
