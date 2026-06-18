"use client";

import { Plus } from "lucide-react";
import type { FormField } from "@/lib/form-builder/types";

// ─── Props ────────────────────────────────────────────────────────────────

export interface AddMoreBlockContainerProps {
  field: FormField; // The add-more-block field
  questionNumber: number;
  isSelected: boolean;
  children: React.ReactNode; // Nested field cards
  onClick: () => void;
}

// ─── AddMoreBlockContainer Component ──────────────────────────────────────

export function AddMoreBlockContainer({
  field,
  questionNumber,
  isSelected,
  children,
  onClick,
}: AddMoreBlockContainerProps) {
  const blockLabel =
    field.addMoreLabel && field.addMoreLabel.trim()
      ? field.addMoreLabel
      : field.label && field.label.trim()
        ? field.label
        : "Untitled Block";

  const buttonLabel =
    field.addMoreLabel && field.addMoreLabel.trim()
      ? field.addMoreLabel
      : "Add More";

  return (
    <div
      role="group"
      aria-label={`Add More Block ${questionNumber}: ${blockLabel}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClick();
        }
      }}
      style={{
        borderRadius: 10,
        border: isSelected
          ? "2px solid #3b82f6"
          : "1px solid #e2e8f0",
        borderLeft: "4px solid #f59e0b",
        background: isSelected
          ? "#dbeafe"
          : "#ffffff",
        overflow: "hidden",
        transition: "border-color .15s, background .15s, box-shadow .15s",
        boxShadow: isSelected
          ? "0 0 0 3px rgba(59, 130, 246, 0.1)"
          : "0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      {/* Header */}
      <div
        role="button"
        tabIndex={0}
        aria-label={`Select add more block: ${blockLabel}`}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 14px",
          background: "#fffbeb",
          cursor: "pointer",
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
            background: "#f59e0b",
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
            background: "#fef3c7",
            color: "#f59e0b",
            whiteSpace: "nowrap",
          }}
        >
          ADD MORE BLOCK
        </span>

        {/* Block label */}
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color:
              field.label?.trim() || field.addMoreLabel?.trim()
                ? "#0f172a"
                : "#94a3b8",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {blockLabel}
        </span>
      </div>

      {/* Children (nested fields) */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          padding: "12px 16px 12px 24px",
        }}
      >
        {children}
      </div>

      {/* Footer with button label */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "10px 14px",
          borderTop: "1px solid #e2e8f0",
          background: "#fffbeb",
        }}
      >
        <Plus size={14} color="#f59e0b" />
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#f59e0b",
          }}
        >
          {buttonLabel}
        </span>
      </div>
    </div>
  );
}
