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
        height: 48,
        flexShrink: 0,
        borderTop: "1px solid #e2e8f0",
        background: "#ffffff",
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
          fontSize: 12,
          color: draftInfo.color,
          lineHeight: 1,
        }}
      >
        {draftInfo.text}
      </div>

      {/* Right side — Back + Save & Publish */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          type="button"
          onClick={handleBack}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "6px 14px",
            fontSize: 13,
            fontWeight: 500,
            color: "#0f172a",
            background: "transparent",
            border: "1px solid #e2e8f0",
            borderRadius: 6,
            cursor: "pointer",
            lineHeight: 1.4,
          }}
        >
          &lt; Back
        </button>

        <button
          type="button"
          onClick={handlePublish}
          disabled={publishing}
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "6px 16px",
            fontSize: 13,
            fontWeight: 600,
            color: "#fff",
            background: "#22c55e",
            border: "1px solid #22c55e",
            borderRadius: 6,
            cursor: publishing ? "not-allowed" : "pointer",
            opacity: publishing ? 0.7 : 1,
            lineHeight: 1.4,
          }}
        >
          {publishing ? "Publishing..." : "Save & Publish"}
        </button>
      </div>
    </footer>
  );
}
