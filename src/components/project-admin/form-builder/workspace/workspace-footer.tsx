"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFormBuilder } from "@/lib/form-builder/form-builder-context";
import { useProjectContext } from "@/lib/project-admin/project-context";
import { projectAdminBase } from "@/lib/nav/nav";
import { formBuilderService } from "@/lib/form-builder/form-builder-service";

// ─── Workspace Footer ─────────────────────────────────────────────────────

export function WorkspaceFooter() {
  const router = useRouter();
  const { accountCode, projectCode } = useProjectContext();
  const { state } = useFormBuilder();
  const { draftStatus, lastSavedAt } = state;

  const base = projectAdminBase(accountCode, projectCode);

  // ─── Draft status text ────────────────────────────────────────────────

  function getDraftStatusText(): { text: string; color: string } {
    switch (draftStatus) {
      case "saving":
        return { text: "Saving…", color: "#94a3b8" };
      case "error":
        return { text: "Draft save failed", color: "#dc2626" };
      case "saved": {
        const relativeTime = lastSavedAt
          ? getRelativeTime(lastSavedAt)
          : "";
        const suffix = relativeTime ? ` ${relativeTime}` : "";
        return {
          text: `Auto-draft saved${suffix}`,
          color: "#94a3b8",
        };
      }
      case "idle":
      default:
        return { text: "", color: "#94a3b8" };
    }
  }

  function getRelativeTime(isoString: string): string {
    const saved = new Date(isoString).getTime();
    const now = Date.now();
    const diffSeconds = Math.floor((now - saved) / 1000);

    if (diffSeconds < 10) return "a few seconds ago";
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return "over a day ago";
  }

  const draftInfo = getDraftStatusText();

  // ─── Handlers ─────────────────────────────────────────────────────────

  function handleBack() {
    router.push(`${base}/form-builder`);
  }

  const [publishing, setPublishing] = useState(false);

  async function handlePublish() {
    const activeConfig = state.configurations.find((c) => c.id === state.activeConfigId);
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
  }

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <footer
      style={{
        height: 44,
        flexShrink: 0,
        borderTop: "1px solid var(--border)",
        background: "var(--surface)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
      }}
      data-slot="workspace-footer"
    >
      {/* Left side — Draft status */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          color: draftInfo.color,
          lineHeight: 1,
        }}
      >
        {draftStatus === "saved" && (
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#16a34a",
              display: "inline-block",
            }}
          />
        )}
        {draftInfo.text}
      </div>

      {/* Right side — Back + Save & Publish */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          type="button"
          onClick={handleBack}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "5px 12px",
            fontSize: 12,
            fontWeight: 500,
            color: "var(--text)",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            cursor: "pointer",
            lineHeight: 1.4,
            transition: "all 150ms",
          }}
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={handlePublish}
          disabled={publishing}
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "5px 14px",
            fontSize: 12,
            fontWeight: 600,
            color: "#fff",
            background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
            border: "none",
            borderRadius: 6,
            cursor: publishing ? "not-allowed" : "pointer",
            opacity: publishing ? 0.75 : 1,
            lineHeight: 1.4,
            boxShadow: "0 1px 2px rgba(22, 163, 74, 0.2)",
            transition: "all 150ms",
          }}
        >
          {publishing ? "Publishing..." : "Save & Publish"}
        </button>
      </div>
    </footer>
  );
}
