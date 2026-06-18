"use client";

import { useCallback, useEffect, useState } from "react";
import { formBuilderService } from "@/lib/form-builder/form-builder-service";
import type { FormConfiguration } from "@/lib/form-builder/types";
import { projectAdminBase } from "@/lib/nav/nav";
import { useProjectContext } from "@/lib/project-admin/project-context";
import { FormConfigCard } from "./form-config-card";
import { ConfigSettingsModal } from "./config-settings-modal";
import { Modal } from "@/components/project-admin/shared/modal";
import { If2Toast, type ToastState } from "@/components/accounts/if2-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function FormConfigListPage() {
  const { projectId, accountCode, projectCode, loading: ctxLoading } =
    useProjectContext();
  const router = useRouter();

  const base = projectAdminBase(accountCode, projectCode);

  const [configurations, setConfigurations] = useState<FormConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [settingsTargetId, setSettingsTargetId] = useState<string | null>(null);

  const deleteTarget = deleteTargetId
    ? configurations.find((c) => c.id === deleteTargetId) ?? null
    : null;

  const settingsTarget = settingsTargetId
    ? configurations.find((c) => c.id === settingsTargetId) ?? null
    : null;

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    const deletedName = deleteTarget?.name ?? "Configuration";
    try {
      await formBuilderService.deleteConfiguration(deleteTargetId, projectId);
      setConfigurations((prev) => prev.filter((c) => c.id !== deleteTargetId));
      setDeleteTargetId(null);
      setToast({ message: `Deleted "${deletedName}".`, type: "success" });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete configuration";
      setDeleteTargetId(null);
      setToast({ message, type: "error" });
    }
  };

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const list = await formBuilderService.getConfigurations(projectId);
      setConfigurations(list);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load form configurations";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (ctxLoading || !projectId) return;
    load();
  }, [ctxLoading, projectId, load]);

  const handleAddNew = async () => {
    if (!projectId || creating) return;
    setCreating(true);
    try {
      const newConfig = await formBuilderService.createConfiguration(projectId);
      router.push(`${base}/form-builder/${newConfig.id}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create configuration";
      setToast({ message, type: "error" });
      setCreating(false);
    }
  };

  if (ctxLoading || (loading && !configurations.length)) {
    return <div className="pa-loading">Loading form configurations…</div>;
  }

  if (error) {
    return (
      <div
        className="pa-info-banner"
        style={{
          color: "#ef4444",
          background: "#fee2e2",
          borderColor: "#ef4444",
        }}
      >
        <span>{error}</span>
        <button
          onClick={load}
          style={{
            marginLeft: 12,
            padding: "4px 12px",
            borderRadius: 4,
            border: "1px solid #ef4444",
            background: "transparent",
            color: "#ef4444",
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="pa-page-header">
        <div>
          <div className="pa-eyebrow">FORM BUILDER</div>
          <div className="pa-page-title">Form Configurations</div>
          <div className="pa-page-desc">
            Same designation can have multiple forms (e.g. Demo form + Display
            form).
          </div>
        </div>
        <Link
          href={`${base}/modules`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 14,
            color: "#0f172a",
            textDecoration: "none",
            fontWeight: 500,
            padding: "6px 14px",
            borderRadius: 9999,
            border: "1px solid #e2e8f0",
            background: "#ffffff",
            transition: "border-color .15s, background .15s",
          }}
        >
          &lt; Modules
        </Link>
      </div>

      {/* Configuration cards */}
      <div style={{ marginTop: 24 }}>
        {configurations.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "48px 24px",
              color: "#475569",
              fontSize: 14,
            }}
          >
            No form configurations yet. Add one to get started.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {configurations.map((config, index) => (
              <FormConfigCard
                key={config.id}
                config={config}
                index={index}
                onSettings={() => {
                  setSettingsTargetId(config.id);
                }}
                onClone={async () => {
                  try {
                    const cloned = await formBuilderService.cloneConfiguration(config.id);
                    setConfigurations((prev) => [...prev, cloned]);
                    setToast({ message: `Cloned "${config.name}".`, type: "success" });
                  } catch (err) {
                    const message =
                      err instanceof Error ? err.message : "Failed to clone configuration";
                    setToast({ message, type: "error" });
                  }
                }}
                onDelete={() => {
                  setDeleteTargetId(config.id);
                }}
                onClick={() => {
                  router.push(`${base}/form-builder/${config.id}`);
                }}
                isDeleteDisabled={configurations.length <= 1}
              />
            ))}
          </div>
        )}

        {/* Add New Form Configuration button — green/teal dashed border */}
        <button
          onClick={handleAddNew}
          disabled={creating}
          style={{
            marginTop: 16,
            width: "100%",
            padding: "20px 24px",
            border: "2px dashed #22c55e",
            borderRadius: 10,
            background: "transparent",
            cursor: creating ? "not-allowed" : "pointer",
            opacity: creating ? 0.6 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            fontSize: 14,
            fontWeight: 500,
            color: "#16a34a",
            transition: "border-color 0.15s, background 0.15s",
          }}
          onMouseEnter={(e) => {
            if (!creating) {
              e.currentTarget.style.borderColor = "#16a34a";
              e.currentTarget.style.background = "#f0fdf4";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#22c55e";
            e.currentTarget.style.background = "transparent";
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
          <span>{creating ? "Creating…" : "Add New Form Configuration"}</span>
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        title={`Delete "${deleteTarget?.name ?? ""}"?`}
        footer={
          <>
            <button
              type="button"
              onClick={() => setDeleteTargetId(null)}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                background: "transparent",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 500,
                color: "#475569",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteConfirm}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "none",
                background: "#ef4444",
                color: "#fff",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Delete
            </button>
          </>
        }
      >
        <p style={{ margin: 0, fontSize: 14, color: "#475569" }}>
          This action cannot be undone. The configuration and all its fields will
          be permanently removed.
        </p>
      </Modal>

      <If2Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* Settings Modal */}
      {settingsTarget && (
        <ConfigSettingsModal
          config={settingsTarget}
          open={!!settingsTargetId}
          onClose={() => setSettingsTargetId(null)}
          onSave={(updated) => {
            setConfigurations((prev) =>
              prev.map((c) => (c.id === updated.id ? updated : c))
            );
            setSettingsTargetId(null);
            setToast({ message: `Updated "${updated.name}".`, type: "success" });
          }}
        />
      )}
    </>
  );
}
