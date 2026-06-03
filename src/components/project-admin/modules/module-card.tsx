"use client";

import Link from "next/link";
import {
  Bell,
  Clock,
  FolderOpen,
  LayoutGrid,
  MapPin,
  Target,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { ModuleAccent } from "@/lib/project-admin/module-catalog";
import type { ProjectModuleState } from "@/lib/api/feature-config-service";

const ICONS: Record<string, LucideIcon> = {
  attendance: Clock,
  claims: Wallet,
  visits: MapPin,
  resources: FolderOpen,
  notifications: Bell,
  "custom-view": LayoutGrid,
  sales: TrendingUp,
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
}

export function ModuleCard({
  module: { definition, enabled },
  configHref,
  onToggle,
  onConfigUnavailable,
}: ModuleCardProps) {
  const Icon = ICONS[definition.id] ?? LayoutGrid;
  const planned = definition.comingSoon;
  const toggleLabel = planned ? "Planned" : enabled ? "Enabled" : "Disabled";

  return (
    <article
      className={`pa-mod-card${planned ? " pa-mod-card--planned" : ""}`}
    >
      {planned && (
        <span className="pa-mod-ribbon" aria-hidden>
          Coming Soon
        </span>
      )}

      <div className={`pa-mod-icon ${ACCENT_CLASS[definition.accent]}`}>
        <Icon size={20} strokeWidth={2} aria-hidden />
      </div>

      <h3 className="pa-mod-title">{definition.name}</h3>
      <p className="pa-mod-desc">{definition.description}</p>

      <div className="pa-mod-footer">
        <label
          className={`pa-mod-toggle${planned ? " pa-mod-toggle--disabled" : ""}`}
        >
          <input
            type="checkbox"
            checked={enabled}
            disabled={planned}
            onChange={(e) => onToggle?.(e.target.checked)}
            aria-label={`${definition.name}: ${toggleLabel}`}
          />
          <span className="pa-mod-toggle-track" aria-hidden />
          <span className="pa-mod-toggle-label">{toggleLabel}</span>
        </label>

        {!planned && enabled && (
          configHref ? (
            <Link href={configHref} className="pa-mod-config-btn">
              Go to Configuration
            </Link>
          ) : (
            <button
              type="button"
              className="pa-mod-config-btn"
              onClick={onConfigUnavailable}
            >
              Go to Configuration
            </button>
          )
        )}
      </div>
    </article>
  );
}
