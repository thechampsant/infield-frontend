"use client";

import { useCallback, useMemo, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import type { Designation } from "@/lib/api";

interface Props {
  designations: Designation[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function DesignationPicker({
  designations,
  selectedIds,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return designations;
    const lower = search.toLowerCase();
    return designations.filter(
      (d) =>
        d.name.toLowerCase().includes(lower) ||
        (d.externalCode || "").toLowerCase().includes(lower),
    );
  }, [designations, search]);

  const toggleItem = useCallback(
    (id: string) => {
      onChange(selectedIds.includes(id) ? selectedIds.filter((i) => i !== id) : [...selectedIds, id]);
    },
    [selectedIds, onChange],
  );

  const selected = useMemo(
    () => designations.filter((d) => selectedIds.includes(d.id)),
    [designations, selectedIds],
  );

  return (
    <div className="cv-designation-selector">
      <div className="cv-selector-trigger-row">
        <button
          type="button"
          className="cv-selector-trigger"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
        >
          <span>
            {selectedIds.length === 0
              ? "Search designations"
              : `${selectedIds.length} selected`}
          </span>
          <ChevronDown size={16} />
        </button>
        <button type="button" className="cv-btn cv-btn-sm cv-btn-primary" onClick={() => onChange(designations.map((d) => d.id))}>
          Select All
        </button>
        <button type="button" className="cv-btn cv-btn-sm cv-btn-secondary" onClick={() => onChange([])}>
          Clear All
        </button>
      </div>
      {open && (
        <div className="cv-selector-dropdown">
          <div className="cv-selector-search">
            <Search size={14} />
            <input
              placeholder="Search designations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          {filtered.length === 0 ? (
            <div className="cv-selector-item">No designations found</div>
          ) : (
            filtered.map((d) => {
              const isSelected = selectedIds.includes(d.id);
              return (
                <button
                  key={d.id}
                  type="button"
                  className="cv-selector-item"
                  onClick={() => toggleItem(d.id)}
                >
                  <span className={`cv-badge ${isSelected ? "cv-badge-active" : "cv-badge-incomplete"}`}>
                    {isSelected ? <Check size={12} /> : null}
                  </span>
                  <span>{d.externalCode ? `${d.externalCode} — ${d.name}` : d.name}</span>
                </button>
              );
            })
          )}
        </div>
      )}
      {selected.length > 0 && (
        <div className="cv-pills">
          {selected.map((d) => (
            <span key={d.id} className="cv-pill">
              {d.externalCode || d.name}
              <button type="button" className="cv-pill-remove" onClick={() => toggleItem(d.id)} aria-label={`Remove ${d.name}`}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
