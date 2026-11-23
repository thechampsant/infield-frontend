"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ChevronLeft, Undo2, Redo2, RotateCw, Settings } from "lucide-react";
import { useFormBuilder } from "@/lib/form-builder/form-builder-context";
import { useProjectContext } from "@/lib/project-admin/project-context";
import { projectAdminBase } from "@/lib/nav/nav";
import { historyShortcut } from "@/lib/form-builder/undo-redo";

export function WorkspaceHeader({ publishing, onPublish }: { publishing: boolean; onPublish: () => void }) {
  const { state, dispatch } = useFormBuilder();
  const { accountCode, projectCode } = useProjectContext();

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

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const action = historyShortcut(event);
      if (!action || (action === "UNDO" ? !canUndo : !canRedo)) return;
      const target = event.target;
      if (target instanceof HTMLElement &&
        (target.isContentEditable || target.closest("input, textarea, select, [role=textbox]"))) return;

      event.preventDefault();
      dispatch({ type: action });
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canUndo, canRedo, dispatch]);

  return (
    <div
      style={{
        height: 56,
        borderBottom: "1px solid #e2e8f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        flexShrink: 0,
        background: "#ffffff",
      }}
    >
      {/* Left side: back link + form name + field count */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Link
          href={backHref}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 2,
            fontSize: 13,
            color: "#3b82f6",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          <ChevronLeft size={16} />
          All Configs
        </Link>

        <div
          style={{
            width: 1,
            height: 24,
            background: "#e2e8f0",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "#0f172a",
            }}
          >
            {formName}
          </span>
          <span
            style={{
              fontSize: 12,
              color: "#94a3b8",
              fontWeight: 400,
            }}
          >
            {fieldCount} {fieldCount === 1 ? "field" : "fields"}
          </span>
        </div>
      </div>

      {/* Right side: action buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button
          onClick={() => dispatch({ type: "UNDO" })}
          disabled={!canUndo}
          title="Undo (Ctrl+Z or ⌘Z)"
          aria-keyshortcuts="Control+Z Meta+Z"
          aria-label="Undo"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: 6,
            border: "none",
            background: "transparent",
            color: "#475569",
            cursor: canUndo ? "pointer" : "default",
            opacity: canUndo ? 1 : 0.4,
            transition: "opacity 150ms",
          }}
        >
          <Undo2 size={18} />
        </button>

        <button
          onClick={() => dispatch({ type: "REDO" })}
          disabled={!canRedo}
          title="Redo (Ctrl+Y, Ctrl+Shift+Z or ⌘⇧Z)"
          aria-keyshortcuts="Control+Y Control+Shift+Z Meta+Shift+Z"
          aria-label="Redo"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: 6,
            border: "none",
            background: "transparent",
            color: "#475569",
            cursor: canRedo ? "pointer" : "default",
            opacity: canRedo ? 1 : 0.4,
            transition: "opacity 150ms",
          }}
        >
          <Redo2 size={18} />
        </button>

        <button
          title="Refresh"
          aria-label="Refresh"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: 6,
            border: "none",
            background: "transparent",
            color: "#475569",
            cursor: "pointer",
          }}
        >
          <RotateCw size={18} />
        </button>

        <button
          title="Settings"
          aria-label="Settings"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: 6,
            border: "none",
            background: "transparent",
            color: "#475569",
            cursor: "pointer",
          }}
        >
          <Settings size={18} />
        </button>

        <button
          onClick={onPublish}
          disabled={publishing}
          style={{
            marginLeft: 8,
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            background: "#22c55e",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: publishing ? "not-allowed" : "pointer",
            opacity: publishing ? 0.7 : 1,
            whiteSpace: "nowrap",
          }}
        >
          {publishing ? "Publishing..." : "Save & Publish"}
        </button>
      </div>
    </div>
  );
}
