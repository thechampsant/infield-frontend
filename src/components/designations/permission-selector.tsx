"use client";

import { useMemo, useState } from "react";
import type { PermissionOption } from "@/lib/api/designation-service";

export function PermissionSelector({
  options,
  selected,
  onChange,
  error,
}: {
  options: PermissionOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  error?: string;
}) {
  const [query, setQuery] = useState("");

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const mergedOptions = useMemo(() => {
    const seen = new Set(options.map((option) => option.key));
    const missingSelected = selected
      .filter((key) => !seen.has(key))
      .map((key) => ({ key, name: key }));
    return [...options, ...missingSelected];
  }, [options, selected]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return mergedOptions;
    return mergedOptions.filter(
      (option) =>
        option.name.toLowerCase().includes(q) ||
        option.key.toLowerCase().includes(q),
    );
  }, [mergedOptions, query]);

  function toggle(key: string) {
    if (selectedSet.has(key)) {
      onChange(selected.filter((item) => item !== key));
    } else {
      onChange([...selected, key]);
    }
  }

  function selectAllVisible() {
    const next = new Set(selected);
    filtered.forEach((option) => next.add(option.key));
    onChange(Array.from(next));
  }

  return (
    <div className="desig-permissions">
      <div className="desig-permissions-toolbar">
        <input
          className="form-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search permissions..."
        />
        <button type="button" className="btn btn-secondary btn-sm" onClick={selectAllVisible}>
          Select Visible
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => onChange([])}>
          Clear
        </button>
      </div>

      <div className={`desig-permission-list ${error ? "error" : ""}`}>
        {filtered.length === 0 ? (
          <div className="desig-permission-empty">No permissions found.</div>
        ) : (
          filtered.map((option) => (
            <label key={option.key} className="desig-permission-option">
              <input
                type="checkbox"
                checked={selectedSet.has(option.key)}
                onChange={() => toggle(option.key)}
              />
              <span>
                <strong>{option.name}</strong>
                <small>{option.key}</small>
              </span>
            </label>
          ))
        )}
      </div>

      {error ? (
        <div className="form-error">{error}</div>
      ) : (
        <div className="form-hint">{selected.length} permission{selected.length !== 1 ? "s" : ""} selected.</div>
      )}
    </div>
  );
}
