"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal } from "@/components/project-admin/shared/modal";
import { If2Toast, type ToastState } from "@/components/accounts/if2-toast";
import {
  dynamicMenuService,
  type DynamicMenuConfig,
  type DynamicMenuItem,
  type DesignationVisibility,
  type UpdateMenuConfigInput,
} from "@/lib/api/dynamic-menu-service";
import {
  designationService,
  type Designation,
} from "@/lib/api/designation-service";

interface WebModulesPageProps {
  projectId: string;
  projectName: string;
  accountCode: string;
  projectCode: string;
}

export function WebModulesPage({
  projectId,
  projectName,
}: WebModulesPageProps) {
  // Project configs state
  const [configs, setConfigs] = useState<DynamicMenuConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Add module dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [menuItems, setMenuItems] = useState<DynamicMenuItem[]>([]);
  const [menuItemsLoading, setMenuItemsLoading] = useState(false);
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editConfig, setEditConfig] = useState<DynamicMenuConfig | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [editRoute, setEditRoute] = useState("");
  const [editDisplayOrder, setEditDisplayOrder] = useState(0);
  const [editIsEnabled, setEditIsEnabled] = useState(false);
  const [editDesignationVisibility, setEditDesignationVisibility] = useState<DesignationVisibility[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [designationsLoading, setDesignationsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch project configs
  const loadConfigs = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const list = await dynamicMenuService.listProjectConfigs(projectId);
      setConfigs(list);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load web modules"
      );
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  // Open add dialog and fetch menu items
  const handleOpenDialog = async () => {
    setDialogOpen(true);
    setSelectedMenuItemId(null);
    setMenuItemsLoading(true);
    try {
      const items = await dynamicMenuService.listMenuItems();
      const existingKeys = new Set(configs.map((c) => c.menuKey));
      setMenuItems(items.filter((item) => item.isActive && !existingKeys.has(item.key)));
    } catch {
      setMenuItems([]);
    } finally {
      setMenuItemsLoading(false);
    }
  };

  // Add selected menu item
  const handleAdd = async () => {
    if (!selectedMenuItemId) return;
    const selected = menuItems.find((m) => m.id === selectedMenuItemId);
    if (!selected) return;

    setAdding(true);
    try {
      await dynamicMenuService.enableForProject(projectId, selected.id);
      setDialogOpen(false);
      setToast({ type: "success", message: `"${selected.label}" added successfully.` });
      await loadConfigs();
    } catch (err) {
      setToast({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to add module",
      });
    } finally {
      setAdding(false);
    }
  };

  // Open edit dialog
  const handleOpenEdit = async (cfg: DynamicMenuConfig) => {
    setEditConfig(cfg);
    setEditLabel(cfg.label);
    setEditIcon(cfg.icon);
    setEditRoute(cfg.route);
    setEditDisplayOrder(cfg.displayOrder);
    setEditIsEnabled(cfg.isEnabled);
    setEditDesignationVisibility(cfg.designationVisibility);
    setEditDialogOpen(true);

    // Fetch designations for this project
    setDesignationsLoading(true);
    try {
      const list = await designationService.listByProject(projectId);
      setDesignations(list);
    } catch {
      setDesignations([]);
    } finally {
      setDesignationsLoading(false);
    }
  };

  // Toggle designation visibility
  const toggleDesignationVisibility = (designationId: string) => {
    setEditDesignationVisibility((prev) => {
      const existing = prev.find((d) => d.designationId === designationId);
      if (existing) {
        return prev.map((d) =>
          d.designationId === designationId
            ? { ...d, isVisible: !d.isVisible }
            : d
        );
      }
      return [...prev, { designationId, isVisible: true }];
    });
  };

  // Save edit
  const handleSaveEdit = async () => {
    if (!editConfig) return;
    setSaving(true);
    try {
      const input: UpdateMenuConfigInput = {
        label: editLabel,
        displayOrder: editDisplayOrder,
        isEnabled: editIsEnabled,
        designationVisibility: editDesignationVisibility,
      };
      await dynamicMenuService.updateConfig(projectId, editConfig.id, input);
      setEditDialogOpen(false);
      setToast({ type: "success", message: `"${editLabel}" updated successfully.` });
      await loadConfigs();
    } catch (err) {
      setToast({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to update module",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="att-config-page">
      {/* Header */}
      <div className="pa-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="pa-eyebrow">Setup</div>
          <div className="pa-page-title">Web Modules</div>
          <div className="pa-page-desc">
            Manage dynamic menu configurations for {projectName}.
          </div>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleOpenDialog}
          style={{ flexShrink: 0 }}
        >
          + Add Module
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          className="pa-info-banner"
          style={{
            color: "var(--red)",
            background: "var(--red-light)",
            borderColor: "var(--red-mid)",
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && !configs.length && (
        <div className="pa-loading">Loading web modules…</div>
      )}

      {/* Empty state */}
      {!loading && !error && configs.length === 0 && (
        <div className="pa-info-banner" style={{ marginBottom: 16 }}>
          No web modules configured yet. Click &ldquo;+ Add Module&rdquo; to get started.
        </div>
      )}

      {/* Configs grid — module card style */}
      {configs.length > 0 && (
        <div className="pa-mod-grid">
          {configs.map((cfg) => {
            const toggleLabel = cfg.isEnabled ? "Enabled" : "Disabled";
            return (
              <article key={cfg.id} className="pa-mod-card">
                <div className="pa-mod-icon pa-mod-icon--blue">
                  <span style={{ fontSize: 16 }} aria-hidden>
                    {cfg.icon || "📋"}
                  </span>
                </div>

                <h3 className="pa-mod-title">{cfg.label}</h3>
                <p className="pa-mod-desc">{cfg.route}</p>

                <div className="pa-mod-footer">
                  <label className="pa-mod-toggle">
                    <input
                      type="checkbox"
                      checked={cfg.isEnabled}
                      onChange={async (e) => {
                        const newEnabled = e.target.checked;
                        try {
                          await dynamicMenuService.updateConfig(projectId, cfg.id, {
                            isEnabled: newEnabled,
                          });
                          setConfigs((prev) =>
                            prev.map((c) =>
                              c.id === cfg.id ? { ...c, isEnabled: newEnabled } : c
                            )
                          );
                          setToast({
                            type: "success",
                            message: newEnabled
                              ? `${cfg.label} enabled.`
                              : `${cfg.label} disabled.`,
                          });
                        } catch (err) {
                          setToast({
                            type: "error",
                            message:
                              err instanceof Error
                                ? err.message
                                : "Failed to update status",
                          });
                        }
                      }}
                      aria-label={`${cfg.label}: ${toggleLabel}`}
                    />
                    <span className="pa-mod-toggle-track" aria-hidden />
                    <span className="pa-mod-toggle-label">{toggleLabel}</span>
                  </label>

                  <button
                    type="button"
                    className="pa-mod-config-btn"
                    onClick={() => handleOpenEdit(cfg)}
                  >
                    Edit Configuration
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Add Module Dialog */}
      <Modal
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Add Web Module"
        width={480}
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleAdd}
              disabled={!selectedMenuItemId || adding}
            >
              {adding ? "Adding…" : "Add"}
            </button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label className="form-label">Select a module to add</label>

          {menuItemsLoading ? (
            <div style={{ fontSize: 13, color: "var(--text-muted, #94a3b8)", padding: "8px 0" }}>
              Loading available modules…
            </div>
          ) : menuItems.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--text-muted, #94a3b8)", padding: "8px 0" }}>
              No modules available to add
            </div>
          ) : (
            <div
              style={{
                border: "1px solid var(--border, #e2e8f0)",
                borderRadius: 6,
                maxHeight: 280,
                overflowY: "auto",
                padding: "4px 0",
              }}
            >
              {menuItems.map((item) => {
                const isSelected = selectedMenuItemId === item.id;
                return (
                  <label
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "10px 12px",
                      cursor: "pointer",
                      background: isSelected
                        ? "var(--primary-light, #e0e7ff)"
                        : "transparent",
                      borderBottom: "1px solid var(--border, #f1f5f9)",
                    }}
                  >
                    <input
                      type="radio"
                      name="menuItem"
                      checked={isSelected}
                      onChange={() => setSelectedMenuItemId(item.id)}
                      style={{
                        accentColor: "var(--primary, #4f46e5)",
                        marginTop: 2,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#0f172a" }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted, #94a3b8)", marginTop: 2 }}>
                        {item.description}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      {/* Edit Configuration Dialog */}
      <Modal
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        title="Edit Configuration"
        width={520}
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setEditDialogOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveEdit}
              disabled={saving || !editLabel.trim()}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Key (read-only) */}
          <div className="form-group">
            <label className="form-label">Key</label>
            <input
              className="form-input"
              value={editConfig?.menuKey ?? ""}
              disabled
              style={{ background: "var(--bg-muted, #f8fafc)", cursor: "not-allowed" }}
            />
          </div>

          {/* Label */}
          <div className="form-group">
            <label className="form-label">
              Label <span className="req">*</span>
            </label>
            <input
              className="form-input"
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              placeholder="Module label"
            />
          </div>

          {/* Display Order */}
          <div className="form-group">
            <label className="form-label">Display Order</label>
            <input
              className="form-input"
              type="number"
              min={0}
              value={editDisplayOrder}
              onChange={(e) => setEditDisplayOrder(Number(e.target.value))}
            />
          </div>

          {/* Enabled */}
          <div className="form-group">
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={editIsEnabled}
                onChange={(e) => setEditIsEnabled(e.target.checked)}
                style={{ accentColor: "var(--primary, #4f46e5)" }}
              />
              Enabled
            </label>
          </div>

          {/* Designation Visibility */}
          <div className="form-group">
            <label className="form-label">Designation Visibility</label>
            {designationsLoading ? (
              <div style={{ fontSize: 13, color: "var(--text-muted, #94a3b8)", padding: "8px 0" }}>
                Loading designations…
              </div>
            ) : designations.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--text-muted, #94a3b8)", padding: "8px 0" }}>
                No designations found
              </div>
            ) : (
              <div
                style={{
                  border: "1px solid var(--border, #e2e8f0)",
                  borderRadius: 6,
                  maxHeight: 180,
                  overflowY: "auto",
                  padding: "4px 0",
                }}
              >
                {designations.map((d) => {
                  const entry = editDesignationVisibility.find(
                    (dv) => dv.designationId === d.id
                  );
                  const isVisible = entry?.isVisible ?? false;
                  return (
                    <label
                      key={d.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 12px",
                        cursor: "pointer",
                        fontSize: 13,
                        background: isVisible
                          ? "var(--primary-light, #e0e7ff)"
                          : "transparent",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isVisible}
                        onChange={() => toggleDesignationVisibility(d.id)}
                        style={{ accentColor: "var(--primary, #4f46e5)" }}
                      />
                      {d.name}
                    </label>
                  );
                })}
              </div>
            )}
            <span
              style={{
                fontSize: 11,
                color: "var(--text-muted, #94a3b8)",
                marginTop: 4,
                display: "block",
              }}
            >
              Select which designations can see this module
            </span>
          </div>
        </div>
      </Modal>

      <If2Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
