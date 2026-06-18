"use client";

import { Settings, Copy, Trash2 } from "lucide-react";
import type { FormConfiguration } from "@/lib/form-builder/types";

export interface FormConfigCardProps {
  config: FormConfiguration;
  index: number; // 0-based, display as index+1
  onSettings: () => void;
  onClone: () => void;
  onDelete: () => void;
  onClick: () => void; // Navigate to workspace
  isDeleteDisabled: boolean;
}

export function FormConfigCard({
  config,
  index,
  onSettings,
  onClone,
  onDelete,
  onClick,
  isDeleteDisabled,
}: FormConfigCardProps) {
  const displayNumber = index + 1;
  const truncatedName =
    config.name.length > 80
      ? config.name.slice(0, 80) + "…"
      : config.name;

  const designationsDisplay = getDesignationsDisplay(config.designations);
  const fieldCount = config.fields.length;
  const editBadgeText = getEditBadgeText(config);

  // Subtitle format: "Designations · N fields"
  const subtitleParts: string[] = [];
  if (designationsDisplay) subtitleParts.push(designationsDisplay);
  subtitleParts.push(`${fieldCount} ${fieldCount === 1 ? "field" : "fields"}`);
  const subtitle = subtitleParts.join(" · ");

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "16px 20px",
        borderRadius: 10,
        border: "1px solid #e2e8f0",
        background: "#ffffff",
        cursor: "pointer",
        transition: "box-shadow .15s, border-color .15s",
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#22c55e";
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(34,197,94,0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#e2e8f0";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Green sequential number badge */}
      <div
        style={{
          width: 40,
          height: 40,
          minWidth: 40,
          borderRadius: "50%",
          background: "#22c55e",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontWeight: 700,
          fontSize: 16,
        }}
      >
        {displayNumber}
      </div>

      {/* Center content: name, subtitle (designations · field count), edit badge */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: 15,
            color: "#0f172a",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {truncatedName}
        </div>
        <div
          style={{
            fontSize: 13,
            color: "#94a3b8",
            marginTop: 4,
          }}
        >
          {subtitle}
        </div>
        {/* Edit permission badge */}
        <div style={{ marginTop: 6 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 12,
              fontWeight: 500,
              padding: "2px 8px",
              borderRadius: 4,
              background: "#dcfce7",
              color: "#16a34a",
            }}
          >
            ✎ {editBadgeText}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div
        style={{ display: "flex", gap: 6 }}
        onClick={(e) => e.stopPropagation()}
      >
        <CardActionBtn title="Settings" onClick={onSettings}>
          <Settings size={15} />
        </CardActionBtn>
        <CardActionBtn title="Clone" onClick={onClone}>
          <Copy size={15} />
        </CardActionBtn>
        <CardActionBtn
          title={
            isDeleteDisabled
              ? "Minimum one configuration required"
              : "Delete"
          }
          onClick={onDelete}
          variant="danger"
          disabled={isDeleteDisabled}
        >
          <Trash2 size={15} />
        </CardActionBtn>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function getDesignationsDisplay(designations: string[]): string {
  if (designations.length === 0) return "";
  if (designations.length <= 3) {
    return designations.join(", ");
  }
  const shown = designations.slice(0, 3).join(", ");
  return `${shown} +${designations.length - 3} more`;
}

function getEditBadgeText(config: FormConfiguration): string {
  if (config.editPermission === "locked") {
    return "Locked after submit";
  }
  if (config.editWindow === "custom-hours" && config.editWindowHours > 0) {
    return `Editable for ${config.editWindowHours}h`;
  }
  if (config.editWindow === "until-checkout") {
    return "Editable until checkout";
  }
  if (config.editWindow === "manager-approval") {
    return "Editable with approval";
  }
  return "Editable";
}

// ─── Card Action Button ───────────────────────────────────────────────────

function CardActionBtn({
  children,
  title,
  onClick,
  variant,
  disabled,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  variant?: "danger";
  disabled?: boolean;
}) {
  // Danger button has red background by default
  const isDanger = variant === "danger";

  const baseStyle: React.CSSProperties = {
    width: 32,
    height: 32,
    borderRadius: 8,
    border: isDanger ? "none" : "1px solid #e2e8f0",
    background: isDanger ? "#dc2626" : "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: disabled ? "not-allowed" : "pointer",
    color: isDanger ? "#fff" : "#475569",
    opacity: disabled ? 0.5 : 1,
    transition: "all .15s",
  };

  const hoverStyle = isDanger
    ? {
        background: "#b91c1c",
        color: "#fff",
      }
    : {
        background: "#dbeafe",
        borderColor: "#3b82f6",
        color: "#3b82f6",
      };

  const leaveStyle = isDanger
    ? {
        background: "#dc2626",
        color: "#fff",
      }
    : {
        background: "#ffffff",
        borderColor: "#e2e8f0",
        color: "#475569",
      };

  return (
    <button
      type="button"
      title={title}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={baseStyle}
      onMouseEnter={(e) => {
        if (disabled) return;
        Object.assign((e.currentTarget as HTMLElement).style, hoverStyle);
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        Object.assign((e.currentTarget as HTMLElement).style, leaveStyle);
      }}
    >
      {children}
    </button>
  );
}
