"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Undo2, Redo2, RotateCw, Settings } from "lucide-react";
import { useFormBuilder } from "@/lib/form-builder/form-builder-context";
import { useProjectContext } from "@/lib/project-admin/project-context";
import { projectAdminBase } from "@/lib/nav/nav";
import { formBuilderService } from "@/lib/form-builder/form-builder-service";

export function WorkspaceHeader() {
  const { state, dispatch } = useFormBuilder();
  const { accountCode, projectCode } = useProjectContext();
  const router = useRouter();

  const base = projectAdminBase(accountCode, projectCode);
  const backHref = `${base}/form-builder`;

  // Get active config details
  const activeConfig = state.configurations.find(
    (c) => c.id === state.activeConfigId
  );
  const formName = activeConfig?.name ?? "Untitled Form";
  const fieldCount = activeConfig?.fields.length ?? 0;

  // Undo/redo availability
  const canUndo = state.undoStack.length > 0;
  const canRedo = state.redoStack.length > 0;

  // Publish state
  const [publishing, setPublishing] = useState(false);

  const handleSaveAndPublish = async () => {
    if (!activeConfig || !state.activeConfigId) return;
    setPublishing(true);
    try {
      await formBuilderService.saveSchemaAndPublish(state.activeConfigId, activeConfig.fields);
      alert("Published successfully");
      router.push(`${base}/form-builder`);
    } catch (err) {
      console.error("Failed to publish:", err);
      alert(err instanceof Error ? err.message : "Failed to publish. Please try again.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div
      style={{
        height: 56,
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        flexShrink: 0,
        background: "var(--surface)",
      }}
    >
      {/* Left side: back link + form name + field count */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Link
          href={backHref}
          className="pa-form-builder-back-link"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 13,
            color: "var(--blue)",
            textDecoration: "none",
            fontWeight: 500,
            padding: "5px 10px",
            borderRadius: 6,
            transition: "background 150ms",
          }}
        >
          <ChevronLeft size={16} />
          All Configs
        </Link>

        <div
          style={{
            width: 1,
            height: 22,
            background: "var(--border)",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "var(--navy)",
              letterSpacing: "-0.01em",
            }}
          >
            {formName}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-muted)",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              padding: "2px 8px",
              borderRadius: 999,
            }}
          >
            {fieldCount} {fieldCount === 1 ? "field" : "fields"}
          </span>
        </div>
      </div>

      {/* Right side: action buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button
          onClick={() => dispatch({ type: "UNDO" })}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
          className="pa-form-builder-header-btn"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 34,
            height: 34,
            borderRadius: 7,
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: canUndo ? "var(--text)" : "var(--text-muted)",
            cursor: canUndo ? "pointer" : "default",
            opacity: canUndo ? 1 : 0.45,
            transition: "all 150ms",
          }}
        >
          <Undo2 size={16} />
        </button>

        <button
          onClick={() => dispatch({ type: "REDO" })}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          aria-label="Redo"
          className="pa-form-builder-header-btn"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 34,
            height: 34,
            borderRadius: 7,
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: canRedo ? "var(--text)" : "var(--text-muted)",
            cursor: canRedo ? "pointer" : "default",
            opacity: canRedo ? 1 : 0.45,
            transition: "all 150ms",
          }}
        >
          <Redo2 size={16} />
        </button>

        <button
          title="Refresh"
          aria-label="Refresh"
          className="pa-form-builder-header-btn"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 34,
            height: 34,
            borderRadius: 7,
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--text)",
            cursor: "pointer",
            transition: "all 150ms",
          }}
        >
          <RotateCw size={16} />
        </button>

        <button
          title="Settings"
          aria-label="Settings"
          className="pa-form-builder-header-btn"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 34,
            height: 34,
            borderRadius: 7,
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--text)",
            cursor: "pointer",
            transition: "all 150ms",
          }}
        >
          <Settings size={16} />
        </button>

        <button
          onClick={handleSaveAndPublish}
          disabled={publishing}
          className="pa-form-builder-publish-btn"
          style={{
            marginLeft: 8,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 18px",
            borderRadius: 8,
            border: "none",
            background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
            color: "#ffffff",
            fontSize: 13,
            fontWeight: 600,
            cursor: publishing ? "not-allowed" : "pointer",
            opacity: publishing ? 0.75 : 1,
            boxShadow: "0 1px 2px rgba(22, 163, 74, 0.25)",
            whiteSpace: "nowrap",
            transition: "all 150ms",
          }}
        >
          {publishing ? "Publishing..." : "Save & Publish"}
        </button>
      </div>
    </div>
  );
}
