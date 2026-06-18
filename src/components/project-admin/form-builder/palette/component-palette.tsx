"use client";

import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { getComponentsByCategory } from "@/lib/form-builder/constants";
import type { ComponentDefinition } from "@/lib/form-builder/types";
import { PaletteGroup } from "./palette-group";

// ─── ComponentPalette ─────────────────────────────────────────────────────

export interface ComponentPaletteProps {
  onComponentClick?: (component: ComponentDefinition) => void;
}

export function ComponentPalette({ onComponentClick }: ComponentPaletteProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const coreComponents = getComponentsByCategory("core");
  const advancedComponents = getComponentsByCategory("advanced");
  const layoutComponents = getComponentsByCategory("layout");

  // Filter components by search query (case-insensitive name match)
  const filteredGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return [
        { label: "Core", components: coreComponents },
        { label: "Advanced", components: advancedComponents },
        { label: "Layout", components: layoutComponents },
      ];
    }

    return [
      {
        label: "Core",
        components: coreComponents.filter((c) =>
          c.name.toLowerCase().includes(query)
        ),
      },
      {
        label: "Advanced",
        components: advancedComponents.filter((c) =>
          c.name.toLowerCase().includes(query)
        ),
      },
      {
        label: "Layout",
        components: layoutComponents.filter((c) =>
          c.name.toLowerCase().includes(query)
        ),
      },
    ];
  }, [searchQuery, coreComponents, advancedComponents, layoutComponents]);

  const hasResults = filteredGroups.some((g) => g.components.length > 0);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* Header */}
      <div style={{ padding: "16px 16px 0" }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "#0f172a",
          }}
        >
          Components
        </div>
        <div
          style={{
            fontSize: 12,
            color: "#94a3b8",
            marginTop: 2,
          }}
        >
          Click or drag to add
        </div>

        {/* Search input */}
        <div
          style={{
            position: "relative",
            marginTop: 12,
            marginBottom: 12,
          }}
        >
          <Search
            size={14}
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#94a3b8",
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            placeholder="Search components..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search components"
            style={{
              width: "100%",
              height: 34,
              paddingLeft: 32,
              paddingRight: searchQuery ? 32 : 10,
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              background: "#f8fafc",
              color: "#0f172a",
              outline: "none",
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 18,
                height: 18,
                borderRadius: "50%",
                border: "none",
                background: "#94a3b8",
                color: "white",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <X size={10} />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable groups */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "0 16px 16px",
        }}
      >
        {hasResults ? (
          filteredGroups.map((group) => (
            <PaletteGroup
              key={group.label}
              label={group.label}
              components={group.components}
              onComponentClick={onComponentClick}
            />
          ))
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "32px 16px",
              textAlign: "center",
            }}
          >
            <Search
              size={24}
              style={{ color: "#94a3b8", marginBottom: 8 }}
            />
            <div
              style={{
                fontSize: 12,
                color: "#94a3b8",
                lineHeight: 1.4,
              }}
            >
              No components match &ldquo;{searchQuery}&rdquo;
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
