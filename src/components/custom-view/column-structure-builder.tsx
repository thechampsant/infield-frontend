"use client";

import { Plus, Trash2 } from "lucide-react";
import type { CustomViewColumnNode, CustomViewColumnValueType } from "@/lib/api";

interface Props {
  structure: CustomViewColumnNode[];
  onChange: (next: CustomViewColumnNode[]) => void;
}

function newKey(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

export function ColumnStructureBuilder({ structure, onChange }: Props) {
  const locked = structure.find((node) => node.locked);
  const rest = structure.filter((node) => !node.locked);

  function updateRest(nextRest: CustomViewColumnNode[]) {
    onChange(locked ? [locked, ...nextRest] : nextRest);
  }

  function addColumn() {
    updateRest([
      ...rest,
      { type: "column", key: newKey("col"), label: "New column", valueType: "string" },
    ]);
  }

  function addGroup() {
    updateRest([
      ...rest,
      {
        type: "group",
        key: newKey("grp"),
        label: "New group",
        children: [{ type: "column", key: newKey("col"), label: "Sub-column", valueType: "string" }],
      },
    ]);
  }

  return (
    <div>
      <div className="cv-label">Locked identity column</div>
      <div className="cv-locked">{locked?.label || "loginid"} (required, not editable)</div>

      {rest.map((node, index) =>
        node.type === "group" ? (
          <div key={node.key} className="cv-group">
            <div className="cv-col-row">
              <span className="cv-muted">Group</span>
              <input
                className="cv-input"
                value={node.label}
                onChange={(e) => {
                  const next = [...rest];
                  next[index] = { ...node, label: e.target.value };
                  updateRest(next);
                }}
              />
              <span />
              <button type="button" className="cv-icon-btn" onClick={() => updateRest(rest.filter((_, i) => i !== index))}>
                <Trash2 size={14} />
              </button>
            </div>
            {(node.children || []).map((child, childIndex) => (
              <ColumnRow
                key={child.key}
                node={child}
                onChange={(updated) => {
                  const children = [...(node.children || [])];
                  children[childIndex] = updated;
                  const next = [...rest];
                  next[index] = { ...node, children };
                  updateRest(next);
                }}
                onRemove={() => {
                  const children = (node.children || []).filter((_, i) => i !== childIndex);
                  const next = [...rest];
                  next[index] = { ...node, children };
                  updateRest(next);
                }}
              />
            ))}
            <button
              type="button"
              className="cv-btn cv-btn-sm cv-btn-secondary"
              onClick={() => {
                const next = [...rest];
                next[index] = {
                  ...node,
                  children: [
                    ...(node.children || []),
                    { type: "column", key: newKey("col"), label: "Sub-column", valueType: "string" },
                  ],
                };
                updateRest(next);
              }}
            >
              <Plus size={12} />
              Add sub-column
            </button>
          </div>
        ) : (
          <ColumnRow
            key={node.key}
            node={node}
            onChange={(updated) => {
              const next = [...rest];
              next[index] = updated;
              updateRest(next);
            }}
            onRemove={() => updateRest(rest.filter((_, i) => i !== index))}
          />
        ),
      )}

      <div className="cv-actions" style={{ justifyContent: "flex-start", marginTop: 8 }}>
        <button type="button" className="cv-btn cv-btn-sm cv-btn-secondary" onClick={addColumn}>
          <Plus size={12} />
          Add column
        </button>
        <button type="button" className="cv-btn cv-btn-sm cv-btn-secondary" onClick={addGroup}>
          <Plus size={12} />
          Add group
        </button>
      </div>
    </div>
  );
}

function ColumnRow({
  node,
  onChange,
  onRemove,
}: {
  node: CustomViewColumnNode;
  onChange: (node: CustomViewColumnNode) => void;
  onRemove: () => void;
}) {
  return (
    <div className="cv-col-row">
      <span className="cv-muted">Column</span>
      <input
        className="cv-input"
        value={node.label}
        onChange={(e) => onChange({ ...node, label: e.target.value })}
      />
      <select
        className="cv-select"
        value={node.valueType || "string"}
        onChange={(e) => onChange({ ...node, valueType: e.target.value as CustomViewColumnValueType })}
      >
        <option value="string">Text</option>
        <option value="number">Number</option>
        <option value="date">Date</option>
      </select>
      <button type="button" className="cv-icon-btn" onClick={onRemove} aria-label="Remove column">
        <Trash2 size={14} />
      </button>
    </div>
  );
}
