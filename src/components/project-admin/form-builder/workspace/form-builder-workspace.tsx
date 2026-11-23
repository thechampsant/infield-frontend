"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { FormBuilderProvider, useFormBuilder } from "@/lib/form-builder/form-builder-context";
import { formBuilderService } from "@/lib/form-builder/form-builder-service";
import { useRouter } from "next/navigation";
import { useProjectContext } from "@/lib/project-admin/project-context";
import { projectAdminBase } from "@/lib/nav/nav";
import { createDebouncedSave, loadDraft } from "@/lib/form-builder/draft-storage";
import type { FormField } from "@/lib/form-builder/types";
import { BuilderDragContext } from "./builder-drag-context";
import { checkPublishFields, publishErrorMessages, publishReceipt } from "@/lib/form-builder/publish-feedback";
import { usePublishNotice } from "./publish-notice";
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

  const { accountCode, projectCode } = useProjectContext();
  const router = useRouter();
  const [publishing, setPublishing] = useState(false);
  const lastFields = useRef<FormField[] | null>(null);
  const config = state.configurations.find((item) => item.id === configId);
  const fields = config?.fields;
  const notifyPublished = usePublishNotice();
  const [publishErrors, setPublishErrors] = useState<string[]>([]);
  const save = useMemo(() => createDebouncedSave(configId, 2000, (saved) => {
    dispatch({ type: "SET_DRAFT_STATUS", status: saved ? "saved" : "error" });
  }), [configId, dispatch]);

  useLayoutEffect(() => {
    if (fields && fields !== lastFields.current) {
      lastFields.current = fields;
      save(fields);
      dispatch({ type: "SET_DRAFT_STATUS", status: "saving" });
    }
  }, [fields, save, dispatch]);

  useLayoutEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") save.flush();
    };
    window.addEventListener("pagehide", save.flush);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", save.flush);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      save.flush();
    };
  }, [save]);

  async function publish() {
    if (!config || !fields || publishing) return;
    const checks = checkPublishFields(config);
    setPublishErrors(checks.errors);
    if (checks.errors.length) return;
    setPublishing(true);
    save.flush();
    try {
      const result = await formBuilderService.saveSchemaAndPublish(configId, fields);
      if (result.status !== "published") {
        setPublishErrors(result.errors.length ? result.errors.map((error) => error.message) : ["The form could not be published."]);
        return;
      }
      save.published(fields);
      notifyPublished(publishReceipt(config, result.warnings, checks.warnings));
      router.push(`${projectAdminBase(accountCode, projectCode)}/form-builder`);
    } catch (err) {
      setPublishErrors(publishErrorMessages(err));
    } finally {
      setPublishing(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      setLoading(true);
      setError(null);
      try {
        const config = await formBuilderService.getConfiguration(configId);
        if (!cancelled) {
          const restoredFields = loadDraft(configId) ?? config.fields;
          lastFields.current = restoredFields;
          dispatch({ type: "LOAD_CONFIG", config: { ...config, fields: restoredFields } });
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
          color: "#94a3b8",
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
    <BuilderDragContext>
      {/* Header */}
      <WorkspaceHeader publishing={publishing} onPublish={publish} />

      {publishErrors.length > 0 && (
        <div className="pa-info-banner" role="alert">
          <div><strong>Form could not be published</strong>
            <ul>{publishErrors.map((message, index) => <li key={index}>{message}</li>)}</ul>
          </div>
          <button type="button" onClick={() => setPublishErrors([])}>Dismiss</button>
        </div>
      )}

      {/* Three-panel body */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* Palette (left) */}
        <aside
          style={{
            width: "clamp(300px, 25%, 368px)",
            flexShrink: 0,
            borderRight: "1px solid #e2e8f0",
            overflowY: "auto",
            background: "#ffffff",
          }}
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
          style={{
            flex: 1,
            minWidth: 0,
            overflowY: "auto",
            background: "#f8fafc",
          }}
          data-slot="form-canvas"
        >
          <FormCanvas />
        </main>

        {/* Inspector (right) */}
        <aside
          style={{
            width: 350,
            flexShrink: 0,
            borderLeft: "1px solid #e2e8f0",
            overflowY: "auto",
            background: "#ffffff",
          }}
          data-slot="field-inspector"
        >
          <FieldInspector />
        </aside>
      </div>

      {/* Footer */}
      <WorkspaceFooter publishing={publishing} onPublish={publish} />
    </BuilderDragContext>
  );
}

// ─── Public workspace component ───────────────────────────────────────────

interface FormBuilderWorkspaceProps {
  configId: string;
}

export function FormBuilderWorkspace({ configId }: FormBuilderWorkspaceProps) {
  return (
    <FormBuilderProvider key={configId}>
      <div
        className="pa-form-builder-workspace"
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          minHeight: 0,
          position: "relative",
        }}
      >
        <WorkspaceContent configId={configId} />
      </div>
    </FormBuilderProvider>
  );
}
