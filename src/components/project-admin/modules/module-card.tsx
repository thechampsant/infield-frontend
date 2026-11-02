"use client";

import Link from "next/link";
import {
  Bell,
  Boxes,
  CalendarDays,
  ChevronRight,
  Clock,
  FolderOpen,
  LayoutGrid,
  MapPin,
  Store,
  Smile,
  Target,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { ModuleAccent } from "@/lib/project-admin/module-catalog";
import type { ProjectModuleState } from "@/lib/api/feature-config-service";

const ICONS: Record<string, LucideIcon> = {
  "store-profile": Store,
  attendance: Clock,
  "mood-checker": Smile,
  leave: CalendarDays,
  claims: Wallet,
  visits: MapPin,
  resources: FolderOpen,
  notifications: Bell,
  "custom-view": LayoutGrid,
  sales: TrendingUp,
  stock: Boxes,
  "target-vs-achievement": Target,
};

const ACCENT_CLASS: Record<ModuleAccent, string> = {
  blue: "pa-mod-icon--blue",
  teal: "pa-mod-icon--teal",
  purple: "pa-mod-icon--purple",
  amber: "pa-mod-icon--amber",
};

interface ModuleCardProps {
  module: ProjectModuleState;
  configHref?: string;
  onToggle?: (enabled: boolean) => void;
  onConfigUnavailable?: () => void;
  alwaysShowConfig?: boolean;
  /** When true, enable/disable toggle is disabled (no module-config:update). */
  readOnly?: boolean;
}

export function ModuleCard({
  module: { definition, enabled },
  configHref,
  onToggle,
  onConfigUnavailable,
  alwaysShowConfig = false,
  readOnly = false,
}: ModuleCardProps) {
  const Icon = ICONS[definition.id] ?? LayoutGrid;
  const planned = definition.comingSoon;
  const toggleDisabled = planned || readOnly;
  const toggleLabel = planned ? "Planned" : enabled ? "Enabled" : "Disabled";

  return (
    <article
      className={`pa-mod-card${planned ? " pa-mod-card--planned" : ""}${enabled ? " pa-mod-card--enabled" : ""}`}
    >
      <div className="pa-mod-card-header">
        <div className={`pa-mod-icon ${ACCENT_CLASS[definition.accent]}`}>
          <Icon size={20} strokeWidth={2} aria-hidden />
        </div>

        <div className="pa-mod-card-status">
          {planned ? (
            <span className="pa-mod-pill pa-mod-pill--planned">Coming Soon</span>
          ) : enabled ? (
            <span className="pa-mod-pill pa-mod-pill--active">
              <span className="pa-mod-pill-dot" aria-hidden /> Active
            </span>
          ) : (
            <span className="pa-mod-pill pa-mod-pill--inactive">Disabled</span>
          )}
        </div>
      </div>

      <div className="pa-mod-body">
        <h3 className="pa-mod-title">{definition.name}</h3>
        <p className="pa-mod-desc">{definition.description}</p>
      </div>

      <div className="pa-mod-footer">
        <label
          className={`pa-mod-toggle${toggleDisabled ? " pa-mod-toggle--disabled" : ""}`}
        >
          <input
            type="checkbox"
            checked={enabled}
            disabled={toggleDisabled}
            onChange={(e) => onToggle?.(e.target.checked)}
            aria-label={`${definition.name}: ${toggleLabel}`}
          />
          <span className="pa-mod-toggle-track" aria-hidden />
          <span className="pa-mod-toggle-label">{toggleLabel}</span>
        </label>

        {!planned && (enabled || alwaysShowConfig) && (
          configHref ? (
            <Link href={configHref} className="pa-mod-config-btn">
              <span>Go to Configuration</span>
              <ChevronRight size={13} className="pa-mod-btn-arrow" />
            </Link>
          ) : (
            <button
              type="button"
              className="pa-mod-config-btn"
              onClick={onConfigUnavailable}
            >
              <span>Go to Configuration</span>
              <ChevronRight size={13} className="pa-mod-btn-arrow" />
            </button>
          )
        )}
      </div>
    </article>
  );
}

