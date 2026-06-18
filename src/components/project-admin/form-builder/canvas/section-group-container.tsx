"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { FormField } from "@/lib/form-builder/types";

// ─── Props ────────────────────────────────────────────────────────────────

export interface SectionGroupContainerProps {
  field: FormField; // The section-group field
  questionNumber: number;
  isSelected: boolean;
  children: React.ReactNode; // Nested field cards
  onClick: () => void;
}

// ─── SectionGroupContainer Component ──────────────────────────────────────

export function SectionGroupContainer({
  field,
  questionNumber,
  isSelected,
  children,
  onClick,
}: SectionGroupContainerProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const sectionLabel =
    field.sectionLabel && field.sectionLabel.trim()
      ? field.sectionLabel
      : "Untitled Section";

  const handleToggle = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
  };

  return (
    <div
      role="group"
      aria-label={`Section Group ${questionNumber}: ${sectionLabel}`}
      aria-expanded={isExpanded}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClick();
        }
      }}
      style={{
        borderRadius: 10,
        border: isSelected
          ? "2px dashed #22c55e"
          : "2px dashed #86efac",
        background: isSelected
          ? "#f0fdf4"
          : "#ffffff",
        overflow: "hidden",
        transition: "border-color .15s, background .15s, box-shadow .15s",
        boxShadow: isSelected
          ? "0 0 0 3px rgba(34, 197, 94, 0.1)"
          : "0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      {/* Header */}
      <div
        role="button"
        tabIndex={0}
        aria-label={`Toggle section group: ${sectionLabel}`}
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
          background: "#f0fdf4",
          cursor: "pointer",
          borderBottom: "1px solid #dcfce7",
        }}
      >
        {/* Collapse/Expand toggle */}
        <button
          type="button"
          aria-label={isExpanded ? "Collapse section" : "Expand section"}
          onClick={handleToggle}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleToggle(e);
            }
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 22,
            height: 22,
            borderRadius: 4,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            padding: 0,
            color: "#22c55e",
          }}
        >
          {isExpanded ? (
            <ChevronDown size={16} />
          ) : (
            <ChevronRight size={16} />
          )}
        </button>

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
            background: "#dcfce7",
            color: "#16a34a",
            whiteSpace: "nowrap",
          }}
        >
          SECTION GROUP
        </span>

        {/* Section label */}
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: field.sectionLabel?.trim()
              ? "#0f172a"
              : "#94a3b8",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {sectionLabel}
        </span>
      </div>

      {/* Children (nested fields) */}
      {isExpanded && (
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
      )}
    </div>
  );
}
