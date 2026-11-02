"use client";

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
  const IconComponent = ICON_MAP[component.icon];
  const colors = ACCENT_COLORS[component.accent] ?? ACCENT_COLORS.gray;

  return (
    <button
      type="button"
      onClick={onClick}
      title={component.description}
      aria-label={`Add ${component.name} component`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        width: "100%",
        height: 40,
        padding: "5px 8px",
        borderRadius: 8,
        border: "1px solid var(--border, #e2e8f0)",
        background: "var(--surface, #ffffff)",
        cursor: "pointer",
        transition: "border-color .15s, box-shadow .15s, background .15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = colors.icon;
        e.currentTarget.style.boxShadow = `0 1px 4px ${colors.icon}20`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#e2e8f0";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Colored icon box */}
      <div
        style={{
          width: 26,
          height: 26,
          minWidth: 26,
          borderRadius: 6,
          background: colors.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {IconComponent && (
          <IconComponent size={13} color={colors.icon} strokeWidth={2.2} />
        )}
      </div>

      {/* Label */}
      <span
        style={{
          fontSize: 11.5,
          fontWeight: 500,
          color: "var(--text, #0f172a)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          lineHeight: 1.2,
          textAlign: "left",
        }}
      >
        {component.name}
      </span>
    </button>
  );
}
