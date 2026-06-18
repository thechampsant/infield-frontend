"use client";

import { Copy, Trash2 } from "lucide-react";
import type { FormField } from "@/lib/form-builder/types";
import { getComponentDefinition } from "@/lib/form-builder/constants";

// ─── Color mapping for type badges ────────────────────────────────────────

const ACCENT_COLORS: Record<string, { bg: string; text: string }> = {
  blue: { bg: "#dbeafe", text: "#3b82f6" },
  teal: { bg: "#d1fae5", text: "#059669" },
  pink: { bg: "#fce7f3", text: "#db2777" },
  purple: { bg: "#ede9fe", text: "#7c3aed" },
  amber: { bg: "#fef3c7", text: "#f59e0b" },
  green: { bg: "#dcfce7", text: "#22c55e" },
  gray: { bg: "#f1f5f9", text: "#64748b" },
};

// ─── Flag badge colors ────────────────────────────────────────────────────

const FLAG_COLORS = {
  required: { bg: "#fef2f2", text: "#dc2626" },
  "cond.req": { bg: "#fff7ed", text: "#ea580c" },
  "read-only": { bg: "#f1f5f9", text: "#475569" },
  conditional: { bg: "#fef3c7", text: "#d97706" },
} as const;

// ─── Props ────────────────────────────────────────────────────────────────

export interface FieldCardProps {
  field: FormField;
  questionNumber: number; // 1-based display number
  isSelected: boolean;
  onClick: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "…";
}

function getDisplayLabel(field: FormField, questionNumber: number): string {
  const definition = getComponentDefinition(field.type);
  const label = field.label && field.label.trim() ? field.label : "Untitled Field";
  const description = definition?.description ?? "";
  const requiredSuffix = field.required === "always" ? " *" : "";

  // Format: "N: Label — description *"
  if (description) {
    return `${questionNumber}: ${truncate(label, 40)} — ${truncate(description, 40)}${requiredSuffix}`;
  }
  return `${questionNumber}: ${truncate(label, 60)}${requiredSuffix}`;
}

function getDisplayHelpText(field: FormField): string | null {
  if (!field.helpText || field.helpText.trim() === "") return null;
  return truncate(field.helpText, 80);
}

function getTypeBadgeName(field: FormField): string {
  const definition = getComponentDefinition(field.type);
  return (definition?.name ?? field.type).toUpperCase();
}

function getAccentColor(field: FormField): { bg: string; text: string } {
  const definition = getComponentDefinition(field.type);
  const accent = definition?.accent ?? "gray";
  return ACCENT_COLORS[accent] ?? ACCENT_COLORS.gray;
}

// ─── Flag Indicators ──────────────────────────────────────────────────────

interface FlagBadge {
  label: string;
  bg: string;
  text: string;
}

function getFlags(field: FormField): FlagBadge[] {
  const flags: FlagBadge[] = [];

  if (field.required === "always") {
    flags.push({ label: "REQUIRED", ...FLAG_COLORS.required });
  } else if (field.required === "conditional") {
    flags.push({ label: "COND.REQ", ...FLAG_COLORS["cond.req"] });
  }

  if (field.visibility === "conditional") {
    flags.push({ label: "CONDITIONAL", ...FLAG_COLORS.conditional });
  }

  if (field.prefillSource !== null) {
    flags.push({ label: "PRE-FILL", bg: "#ede9fe", text: "#7c3aed" });
  }

  if (field.readOnly) {
    flags.push({ label: "READ-ONLY", ...FLAG_COLORS["read-only"] });
  }

  return flags;
}

// ─── Mock Input Preview ───────────────────────────────────────────────────

function getMockInputPlaceholder(field: FormField): string | null {
  // Show a mock input preview for text-like input types
  const inputTypes = [
    "short-text", "paragraph", "alphanumeric", "number",
    "email", "phone", "dropdown", "multi-select",
  ];
  if (!inputTypes.includes(field.type)) return null;

  if (field.helpText && field.helpText.trim()) {
    return field.helpText;
  }
  const definition = getComponentDefinition(field.type);
  return definition?.description ?? "Enter value...";
}

// ─── FieldCard Component ──────────────────────────────────────────────────

export function FieldCard({
  field,
  questionNumber,
  isSelected,
  onClick,
  onDuplicate,
  onDelete,
}: FieldCardProps) {
  const accentColors = getAccentColor(field);
  const typeName = getTypeBadgeName(field);
  const displayLabel = getDisplayLabel(field, questionNumber);
  const helpText = getDisplayHelpText(field);
  const flags = getFlags(field);
  const mockPlaceholder = getMockInputPlaceholder(field);

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDuplicate();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = confirm(
      `Delete "${field.label || "Untitled Field"}"? This cannot be undone.`
    );
    if (confirmed) {
      onDelete();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Field ${questionNumber}: ${field.label || "Untitled Field"}`}
      aria-selected={isSelected}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="field-card"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: "12px 16px",
        borderRadius: 10,
        border: isSelected
          ? "2px solid #22c55e"
          : "1px solid #e2e8f0",
        borderLeft: isSelected ? "4px solid #22c55e" : undefined,
        background: isSelected ? "#f0fdf4" : "#ffffff",
        cursor: "pointer",
        transition: "border-color .15s, background .15s, box-shadow .15s",
        boxShadow: isSelected
          ? "0 0 0 3px rgba(34, 197, 94, 0.1)"
          : "0 1px 2px rgba(0,0,0,0.04)",
        position: "relative",
      }}
    >
      {/* Action buttons – visible on hover or when selected */}
      <div
        className="field-card-actions"
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          display: "flex",
          gap: 4,
          opacity: isSelected ? 1 : 0,
          transition: "opacity .15s",
        }}
      >
        <button
          type="button"
          aria-label="Duplicate field"
          onClick={handleDuplicate}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 24,
            height: 24,
            borderRadius: 6,
            border: "1px solid #e2e8f0",
            background: "#ffffff",
            cursor: "pointer",
            padding: 0,
            color: "#94a3b8",
            transition: "color .15s, border-color .15s, background .15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#22c55e";
            e.currentTarget.style.borderColor = "#22c55e";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#94a3b8";
            e.currentTarget.style.borderColor = "#e2e8f0";
          }}
        >
          <Copy size={13} />
        </button>
        <button
          type="button"
          aria-label="Delete field"
          onClick={handleDelete}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 24,
            height: 24,
            borderRadius: 6,
            border: "1px solid #e2e8f0",
            background: "#ffffff",
            cursor: "pointer",
            padding: 0,
            color: "#94a3b8",
            transition: "color .15s, border-color .15s, background .15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#dc2626";
            e.currentTarget.style.borderColor = "#dc2626";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#94a3b8";
            e.currentTarget.style.borderColor = "#e2e8f0";
          }}
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Top row: question number + type badge + flags */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          paddingRight: 56, // reserve space for action buttons
        }}
      >
        {/* Question number badge */}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: "#1e293b",
            color: "#fff",
            fontSize: 10,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          Q{questionNumber}
        </span>

        {/* Type badge */}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "2px 8px",
            borderRadius: 4,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.025em",
            background: accentColors.bg,
            color: accentColors.text,
            whiteSpace: "nowrap",
          }}
        >
          {typeName}
        </span>

        {/* Flag badges */}
        {flags.map((flag) => (
          <span
            key={flag.label}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "2px 6px",
              borderRadius: 4,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.02em",
              background: flag.bg,
              color: flag.text,
              whiteSpace: "nowrap",
            }}
          >
            {flag.label}
          </span>
        ))}
      </div>

      {/* Field label with format: "N: Label — description *" */}
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color:
            field.label && field.label.trim()
              ? "#0f172a"
              : "#94a3b8",
          lineHeight: 1.4,
        }}
      >
        {displayLabel}
      </div>

      {/* Help text */}
      {helpText && (
        <div
          style={{
            fontSize: 12,
            color: "#94a3b8",
            lineHeight: 1.4,
          }}
        >
          {helpText}
        </div>
      )}

      {/* Mock input preview */}
      {mockPlaceholder && (
        <div
          style={{
            marginTop: 4,
            padding: "8px 12px",
            borderRadius: 6,
            background: "#f1f5f9",
            border: "1px solid #e2e8f0",
            fontSize: 12,
            color: "#94a3b8",
            lineHeight: 1.4,
            fontStyle: "normal",
          }}
        >
          {mockPlaceholder}
        </div>
      )}

      {/* Hover style to reveal action buttons */}
      <style>{`
        .field-card:hover .field-card-actions {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
}
