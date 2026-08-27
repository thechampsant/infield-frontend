"use client";

import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import type { CustomViewColumnNode, CustomViewColumnValueType } from "@/lib/api";

interface Props {
  structure: CustomViewColumnNode[];
  onChange: (next: CustomViewColumnNode[]) => void;
  onReorder?: (next: CustomViewColumnNode[]) => void;
  busy?: boolean;
}

function newKey(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function ColumnStructureBuilder({ structure, onChange, onReorder, busy = false }: Props) {
  const locked = structure.find((node) => node.locked);
  const rest = structure.filter((node) => !node.locked);

  function emit(nextRest: CustomViewColumnNode[], persist: boolean) {
    const next = locked ? [locked, ...nextRest] : nextRest;
    onChange(next);
    if (persist) onReorder?.(next);
  }

  function updateRest(nextRest: CustomViewColumnNode[]) {
    emit(nextRest, false);
  }

  function reorderRest(nextRest: CustomViewColumnNode[]) {
    emit(nextRest, true);
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
              <MoveButtons
                busy={busy}
                canMoveUp={index > 0}
                canMoveDown={index < rest.length - 1}
                onMoveUp={() => reorderRest(moveItem(rest, index, index - 1))}
                onMoveDown={() => reorderRest(moveItem(rest, index, index + 1))}
                upLabel="Move group up"
                downLabel="Move group down"
              />
              <button type="button" className="cv-icon-btn" onClick={() => updateRest(rest.filter((_, i) => i !== index))}>
                <Trash2 size={14} />
              </button>
            </div>
            {(node.children || []).map((child, childIndex) => {
              const children = node.children || [];
              return (
                <ColumnRow
                  key={child.key}
                  node={child}
                  busy={busy}
                  canMoveUp={childIndex > 0}
                  canMoveDown={childIndex < children.length - 1}
                  onChange={(updated) => {
                    const nextChildren = [...children];
                    nextChildren[childIndex] = updated;
                    const next = [...rest];
                    next[index] = { ...node, children: nextChildren };
                    updateRest(next);
                  }}
                  onRemove={() => {
                    const next = [...rest];
                    next[index] = { ...node, children: children.filter((_, i) => i !== childIndex) };
                    updateRest(next);
                  }}
                  onMoveUp={() => {
                    const next = [...rest];
                    next[index] = { ...node, children: moveItem(children, childIndex, childIndex - 1) };
                    reorderRest(next);
                  }}
                  onMoveDown={() => {
                    const next = [...rest];
                    next[index] = { ...node, children: moveItem(children, childIndex, childIndex + 1) };
                    reorderRest(next);
                  }}
                />
              );
            })}
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
            busy={busy}
            canMoveUp={index > 0}
            canMoveDown={index < rest.length - 1}
            onChange={(updated) => {
              const next = [...rest];
              next[index] = updated;
              updateRest(next);
            }}
            onRemove={() => updateRest(rest.filter((_, i) => i !== index))}
            onMoveUp={() => reorderRest(moveItem(rest, index, index - 1))}
            onMoveDown={() => reorderRest(moveItem(rest, index, index + 1))}
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

function MoveButtons({
  busy,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  upLabel,
  downLabel,
}: {
  busy: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  upLabel: string;
  downLabel: string;
}) {
  return (
    <>
      <button
        type="button"
        className="cv-icon-btn"
        onClick={onMoveUp}
        disabled={busy || !canMoveUp}
        aria-label={upLabel}
      >
        <ChevronUp size={14} />
      </button>
      <button
        type="button"
        className="cv-icon-btn"
        onClick={onMoveDown}
        disabled={busy || !canMoveDown}
        aria-label={downLabel}
      >
        <ChevronDown size={14} />
      </button>
    </>
  );
}

function ColumnRow({
  node,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  busy,
}: {
  node: CustomViewColumnNode;
  onChange: (node: CustomViewColumnNode) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  busy: boolean;
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
      <MoveButtons
        busy={busy}
        canMoveUp={canMoveUp}
        canMoveDown={canMoveDown}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        upLabel="Move column up"
        downLabel="Move column down"
      />
      <button type="button" className="cv-icon-btn" onClick={onRemove} aria-label="Remove column">
        <Trash2 size={14} />
      </button>
    </div>
  );
}
