"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, Check, ChevronDown, Save, X } from "lucide-react";
import type { Designation } from "@/lib/api";

export type SectionTone = "blue" | "purple" | "teal" | "amber" | "red";

export function Section({
  id,
  icon,
  tone,
  title,
  description,
  open,
  onToggle,
  disabled = false,
  children,
}: {
  id: string;
  icon: ReactNode;
  tone: SectionTone;
  title: string;
  description: string;
  open: boolean;
  onToggle: () => void;
  /** Disables every control in the body; the header stays clickable. */
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={`mood-section${open ? " open" : ""}`} id={`mood-sec-${id}`}>
      <button
        type="button"
        className="mood-section-head"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`mood-sec-body-${id}`}
      >
        <span className="mood-section-head-left">
          <span className={`mood-section-icon mood-tone-${tone}`}>{icon}</span>
          <span>
            <span className="mood-section-title">{title}</span>
            <span className="mood-section-desc">{description}</span>
          </span>
        </span>
        <ChevronDown className="mood-section-chevron" size={20} />
      </button>
      {open && (
        <fieldset className="mood-section-body" id={`mood-sec-body-${id}`} disabled={disabled}>
          {children}
        </fieldset>
      )}
    </section>
  );
}

export function Toggle({
  checked,
  onChange,
  disabled = false,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <label className="mood-toggle">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="mood-toggle-track" />
      <span className="mood-toggle-thumb" />
    </label>
  );
}

export function SettingRow({
  icon,
  title,
  description,
  children,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="mood-setting-row">
      <div className="mood-setting-row-left">
        {icon && <span className="mood-setting-row-icon mood-tone-teal">{icon}</span>}
        <div>
          <div className="mood-setting-name">{title}</div>
          <div className="mood-setting-desc">{description}</div>
        </div>
      </div>
      <div className="mood-setting-control">{children}</div>
    </div>
  );
}

export function RadioPillGroup<T extends string>({
  name,
  options,
  value,
  onChange,
  disabled = false,
}: {
  name: string;
  options: { value: T; label: string; icon?: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="mood-radio-group" role="radiogroup">
      {options.map((option) => (
        <label key={option.value} className={`mood-radio-pill${value === option.value ? " selected" : ""}`}>
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            disabled={disabled}
            onChange={() => onChange(option.value)}
          />
          {option.icon}
          {option.label}
        </label>
      ))}
    </div>
  );
}

export function SaveBar({
  dirty,
  isNew,
  saving,
  readOnly,
  onSave,
  onDiscard,
}: {
  dirty: boolean;
  isNew: boolean;
  saving: boolean;
  readOnly: boolean;
  onSave: () => void;
  onDiscard: () => void;
}) {
  if (readOnly) {
    return (
      <div className="mood-save-bar">
        <div className="mood-save-bar-info">View only — you do not have permission to change module configuration.</div>
      </div>
    );
  }
  if (!dirty && !isNew) return null;

  return (
    <div className="mood-save-bar" role="region" aria-label="Unsaved changes">
      <div className="mood-save-bar-info">
        <span className="mood-unsaved-dot" />
        <AlertTriangle size={14} className="mood-save-bar-warn" />
        {isNew ? "New configuration — not saved yet" : "Unsaved changes"}
      </div>
      <div className="mood-save-bar-actions">
        <button type="button" className="mood-btn mood-btn-secondary" onClick={onDiscard} disabled={saving || !dirty}>
          Discard
        </button>
        <button type="button" className="mood-btn mood-btn-teal" onClick={onSave} disabled={saving}>
          <Save size={14} />
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

/** Chip-style multi-select for designations. Designations owned by other configs are disabled. */
export function DesignationMultiSelect({
  designations,
  selected,
  assignedElsewhere,
  conflictIds,
  disabled,
  onChange,
}: {
  designations: Designation[];
  selected: string[];
  /** designationId → name of the other config that already uses it */
  assignedElsewhere: Map<string, string>;
  conflictIds: Set<string>;
  disabled: boolean;
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const nameById = new Map(designations.map((designation) => [designation.id, designation.name]));

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  }

  return (
    <div className="mood-ms" ref={wrapRef}>
      <div
        className={`mood-ms-wrap${open ? " open" : ""}${disabled ? " disabled" : ""}`}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (!disabled && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            setOpen((value) => !value);
          }
        }}
      >
        {selected.length === 0 && <span className="mood-ms-placeholder">Select designations…</span>}
        {selected.map((id) => (
          <span key={id} className={`mood-ms-chip${conflictIds.has(id) ? " conflict" : ""}`}>
            {nameById.get(id) ?? "Unknown designation"}
            {!disabled && (
              <button
                type="button"
                className="mood-ms-chip-x"
                aria-label={`Remove ${nameById.get(id) ?? "designation"}`}
                onClick={(event) => {
                  event.stopPropagation();
                  toggle(id);
                }}
              >
                <X size={11} />
              </button>
            )}
          </span>
        ))}
        <ChevronDown size={16} className="mood-ms-caret" />
      </div>
      {open && (
        <div className="mood-ms-dd" role="listbox" aria-multiselectable="true">
          {designations.length === 0 && <div className="mood-ms-empty">No designations found in Designation Master.</div>}
          {designations.map((designation) => {
            const isSelected = selected.includes(designation.id);
            const owner = assignedElsewhere.get(designation.id);
            const blocked = Boolean(owner) && !isSelected;
            return (
              <button
                type="button"
                key={designation.id}
                role="option"
                aria-selected={isSelected}
                disabled={blocked}
                className={`mood-ms-opt${isSelected ? " selected" : ""}${blocked ? " blocked" : ""}`}
                onClick={() => toggle(designation.id)}
              >
                <span className="mood-ms-check">{isSelected && <Check size={11} strokeWidth={3} />}</span>
                <span className="mood-ms-opt-label">{designation.name}</span>
                {owner && <span className="mood-ms-owner">Assigned to {owner}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const MOOD_EMOJI_CHOICES = [
  "😊", "😃", "😄", "🥳", "😎", "🤩", "😐", "😑", "🤔", "😕",
  "😟", "😢", "😤", "😫", "😴", "🤒", "💪", "🙏", "❤️", "⭐",
];

interface AddOptionModalProps {
  existingLabels: string[];
  onClose: () => void;
  onAdd: (option: { label: string; emoji: string }) => void;
}

/** Mounting the body only while open gives every opening a fresh, empty form. */
export function AddOptionModal({ open, ...props }: AddOptionModalProps & { open: boolean }) {
  return open ? <AddOptionModalBody {...props} /> : null;
}

function AddOptionModalBody({ existingLabels, onClose, onAdd }: AddOptionModalProps) {
  const [label, setLabel] = useState("");
  const [emoji, setEmoji] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function submit() {
    const trimmed = label.trim();
    if (!trimmed) return setError("Enter a label.");
    if (trimmed.length > 40) return setError("Label must be 40 characters or fewer.");
    if (existingLabels.some((existing) => existing.trim().toLowerCase() === trimmed.toLowerCase())) {
      return setError(`"${trimmed}" already exists.`);
    }
    if (!emoji) return setError("Select an emoji.");
    onAdd({ label: trimmed, emoji });
  }

  return (
    <div className="mood-modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="mood-modal-card" role="dialog" aria-modal="true" aria-labelledby="mood-add-option-title">
        <div className="mood-modal-header">
          <h2 id="mood-add-option-title">Add Mood Option</h2>
          <button type="button" className="mood-modal-close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="mood-modal-body">
          <div className="mood-form-group">
            <label className="mood-form-label" htmlFor="mood-new-option-label">
              Option Label <span className="req">*</span>
            </label>
            <input
              id="mood-new-option-label"
              autoFocus
              className="mood-form-input"
              value={label}
              maxLength={40}
              placeholder="e.g. Excited, Stressed, Tired"
              onChange={(event) => setLabel(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && submit()}
            />
          </div>
          <div className="mood-form-group">
            <span className="mood-form-label">
              Select Emoji <span className="req">*</span>
            </span>
            <div className="mood-emoji-picker" role="radiogroup" aria-label="Emoji">
              {MOOD_EMOJI_CHOICES.map((choice) => (
                <button
                  type="button"
                  key={choice}
                  role="radio"
                  aria-checked={emoji === choice}
                  className={`mood-emoji-pick${emoji === choice ? " selected" : ""}`}
                  onClick={() => setEmoji(choice)}
                >
                  {choice}
                </button>
              ))}
            </div>
          </div>
          {error && <div className="mood-field-error">{error}</div>}
        </div>
        <div className="mood-modal-footer">
          <button type="button" className="mood-btn mood-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="mood-btn mood-btn-primary" onClick={submit}>
            Add Option
          </button>
        </div>
      </div>
    </div>
  );
}
