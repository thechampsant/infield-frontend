"use client";

import type { ComponentDefinition } from "@/lib/form-builder/types";
import { PaletteTile } from "./palette-tile";

// ─── PaletteGroup Component ───────────────────────────────────────────────

export interface PaletteGroupProps {
  label: string;
  components: ComponentDefinition[];
  onComponentClick?: (component: ComponentDefinition) => void;
}

export function PaletteGroup({
  label,
  components,
  onComponentClick,
}: PaletteGroupProps) {
  if (components.length === 0) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Group header */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          color: "#94a3b8",
          padding: "0 4px",
          marginBottom: 8,
        }}
      >
        {label}
      </div>

      {/* 2-column tile grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 6,
        }}
      >
        {components.map((component) => (
          <PaletteTile
            key={component.type}
            component={component}
            onClick={() => onComponentClick?.(component)}
          />
        ))}
      </div>
    </div>
  );
}
