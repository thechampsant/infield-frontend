"use client";

import { useEffect, useState } from "react";
import { FormBuilderProvider, useFormBuilder } from "@/lib/form-builder/form-builder-context";
import { formBuilderService } from "@/lib/form-builder/form-builder-service";
import { WorkspaceHeader } from "./workspace-header";
import { WorkspaceFooter } from "./workspace-footer";
import { ComponentPalette } from "../palette/component-palette";
import { FormCanvas } from "../canvas/form-canvas";
import { FieldInspector } from "../inspector/field-inspector";

// ─── Inner workspace (consumes FormBuilder context) ───────────────────────

function WorkspaceContent({ configId }: { configId: string }) {
  const { state, dispatch } = useFormBuilder();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      setLoading(true);
      setError(null);
      try {
        const config = await formBuilderService.getConfiguration(configId);
        if (!cancelled) {
          dispatch({ type: "LOAD_CONFIG", config });
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load configuration"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadConfig();
    return () => {
      cancelled = true;
    };
  }, [configId, dispatch]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          color: "var(--text-muted, #94a3b8)",
          fontSize: 14,
        }}
      >
        Loading form builder...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          padding: 32,
        }}
      >
        <div
          style={{
            padding: "16px 24px",
            borderRadius: 8,
            background: "#fef2f2",
            color: "#dc2626",
            border: "1px solid #fecaca",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <WorkspaceHeader />

      {/* Three-panel body */}
      <div className="pa-form-builder-body">
        {/* Palette (left) */}
        <aside
          className="pa-form-builder-palette-pane"
          data-slot="component-palette"
        >
          <ComponentPalette
            onComponentClick={(component) => {
              dispatch({ type: "ADD_FIELD", componentType: component.type });
            }}
          />
        </aside>

        {/* Canvas (center) */}
        <main
          className="pa-form-builder-canvas-pane"
          data-slot="form-canvas"
        >
          <FormCanvas />
        </main>

        {/* Inspector (right) */}
        <aside
          className="pa-form-builder-inspector-pane"
          data-slot="field-inspector"
        >
          <FieldInspector />
        </aside>
      </div>

      {/* Footer */}
      <WorkspaceFooter />
    </>
  );
}

// ─── Public workspace component ───────────────────────────────────────────

interface FormBuilderWorkspaceProps {
  configId: string;
}

export function FormBuilderWorkspace({ configId }: FormBuilderWorkspaceProps) {
  return (
    <FormBuilderProvider>
      <div className="pa-form-builder-workspace">
        <WorkspaceContent configId={configId} />
      </div>
    </FormBuilderProvider>
  );
}

