"use client";

import { useDraggable } from "@dnd-kit/core";

import type { ComponentDefinition } from "@/lib/form-builder/types";
import {
  Type,
  AlignLeft,
  Hash,
  Calculator,
  ChevronDown,
  ListChecks,
  Circle,
  CheckSquare,
  ToggleLeft,
  Camera,
  Calendar,
  Clock,
  MapPin,
  Target,
  PenTool,
  Star,
  Mail,
  Phone,
  QrCode,
  Sigma,
  GitBranch,
  Table,
  Upload,
  GitMerge,
  Layers,
  PlusCircle,
  Minus,
  Info,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ─── Icon mapping ─────────────────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  Type,
  AlignLeft,
  Hash,
  Calculator,
  ChevronDown,
  ListChecks,
  Circle,
  CheckSquare,
  ToggleLeft,
  Camera,
  Calendar,
  Clock,
  MapPin,
  Target,
  PenTool,
  Star,
  Mail,
  Phone,
  QrCode,
  Sigma,
  GitBranch,
  Table,
  Upload,
  GitMerge,
  Layers,
  PlusCircle,
  Minus,
  Info,
};

// ─── Color mapping for accent backgrounds ─────────────────────────────────

const ACCENT_COLORS: Record<string, { bg: string; icon: string }> = {
  blue: { bg: "#dbeafe", icon: "#3b82f6" },
  teal: { bg: "#d1fae5", icon: "#059669" },
  pink: { bg: "#fce7f3", icon: "#db2777" },
  purple: { bg: "#ede9fe", icon: "#7c3aed" },
  amber: { bg: "#fef3c7", icon: "#f59e0b" },
  green: { bg: "#dcfce7", icon: "#22c55e" },
  gray: { bg: "#f1f5f9", icon: "#64748b" },
};

// ─── PaletteTile Component ────────────────────────────────────────────────

export interface PaletteTileProps {
  component: ComponentDefinition;
  onClick?: () => void;
}

export function PaletteTile({ component, onClick }: PaletteTileProps) {
  const { setNodeRef, listeners, attributes } = useDraggable({
    id: `palette-${component.type}`,
    data: { componentType: component.type, label: component.name },
  });
  const IconComponent = ICON_MAP[component.icon];
  const colors = ACCENT_COLORS[component.accent] ?? ACCENT_COLORS.gray;

  return (
    <button
      type="button"
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onClick}
      title={component.description}
      aria-label={`Add ${component.name} component`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        minHeight: 44,
        boxSizing: "border-box",
        padding: "6px 10px",
        borderRadius: 8,
        border: "1px solid #e2e8f0",
        background: "#ffffff",
        cursor: "grab",
        touchAction: "none",
        transition: "border-color .15s, box-shadow .15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = colors.icon;
        e.currentTarget.style.boxShadow = `0 1px 4px ${colors.icon}18`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#e2e8f0";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Colored icon box */}
      <div
        style={{
          width: 28,
          height: 28,
          minWidth: 28,
          borderRadius: 6,
          background: colors.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {IconComponent && (
          <IconComponent size={14} color={colors.icon} strokeWidth={2.2} />
        )}
      </div>

      {/* Label */}
      <span
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: "#0f172a",
          whiteSpace: "normal",
          overflowWrap: "anywhere",
          textAlign: "left",
        }}
      >
        {component.name}
      </span>
    </button>
  );
}
