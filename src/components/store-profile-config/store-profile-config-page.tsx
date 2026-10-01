"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Copy, Pencil, Plus, Power, Store, Trash2 } from "lucide-react";
import { If2Toast, type ToastState } from "@/components/accounts/if2-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  ApiError,
  designationService,
  featureConfigService,
  formatApiError,
  storeProfileConfigModuleKey,
  storeProfileConfigService,
  type Designation,
  type StoreProfileConfiguration,
  type StoreProfileField,
  type StoreProfileFieldOption,
} from "@/lib/api";
import { StoreFieldSelectionPanel } from "./store-field-selection-panel";

type View = "list" | "editor";

interface EditorState {
  id?: string;
  name: string;
  applicableDesignations: string[];
  selectedFields: StoreProfileField[];
}

function emptyEditor(): EditorState {
  return { name: "", applicableDesignations: [], selectedFields: [] };
}

function toEditor(config: StoreProfileConfiguration): EditorState {
  return {
    id: config.id,
    name: config.name,
    applicableDesignations: config.applicableDesignations,
    selectedFields: config.selectedFields,
  };
}

function designationNames(ids: string[], designations: Designation[]): string {
  if (!ids.length) return "No designations";
  const names = ids
    .map((id) => designations.find((designation) => designation.id === id)?.name)
    .filter(Boolean) as string[];
  if (!names.length) return `${ids.length} designation${ids.length === 1 ? "" : "s"}`;
  if (names.length <= 2) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
}

function validate(editor: EditorState): string[] {
  const errors: string[] = [];
  if (!editor.name.trim()) errors.push("Configuration name is required.");
  if (editor.name.trim().length > 160) {
    errors.push("Configuration name must be 160 characters or fewer.");
  }
  if (!editor.applicableDesignations.length) {
    errors.push("Select at least one applicable designation.");
  }
  if (!editor.selectedFields.length) {
    errors.push("Select at least one field to display.");
  }
  return errors;
}

interface StoreProfileConfigPageProps {
  projectId: string;
  projectName?: string;
  accountCode?: string;
  projectCode?: string;
}

export function StoreProfileConfigPage({ projectId }: StoreProfileConfigPageProps) {
  const [view, setView] = useState<View>("list");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configs, setConfigs] = useState<StoreProfileConfiguration[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [activeConfigIds, setActiveConfigIds] = useState<Set<string>>(new Set());
  const [togglingConfigId, setTogglingConfigId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<StoreProfileConfiguration | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const [editor, setEditor] = useState<EditorState>(emptyEditor());
  const [errors, setErrors] = useState<string[]>([]);
  const [conflictDesignationIds, setConflictDesignationIds] = useState<string[]>([]);

  const [catalogue, setCatalogue] = useState<StoreProfileFieldOption[] | null>(null);
  const [catalogueError, setCatalogueError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [configList, designationList, featureConfig] = await Promise.all([
        storeProfileConfigService.list(projectId),
        designationService.listByProject(projectId),
        featureConfigService.getRawByProject(projectId),
      ]);
      const activeKeys = new Set(
        (featureConfig?.modules ?? [])
          .filter((module) => module.isActive)
          .map((module) => module.key),
      );
      setConfigs(configList);
      setDesignations(designationList);
      setActiveConfigIds(
        new Set(
          configList
            .filter((config) => activeKeys.has(storeProfileConfigModuleKey(config.id)))
            .map((config) => config.id),
        ),
      );
    } catch (err) {
      setToast({ type: "error", message: formatApiError(err, "Failed to load Store Profile configurations") });
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Lazy — the list view never needs the catalogue. */
  const ensureCatalogue = useCallback(async () => {
    if (catalogue) return;
    try {
      const fields = await storeProfileConfigService.getFieldCatalogue(projectId);
      setCatalogue(fields);
      setCatalogueError(
        fields.length === 0
          ? "This project has no Store Master fields yet. Add stores or Store UDFs first."
          : null,
      );
    } catch (err) {
      setCatalogue(null);
      setCatalogueError(
        formatApiError(err, "Could not load Store Master fields. A configuration cannot be built without them."),
      );
    }
  }, [catalogue, projectId]);

  const startCreate = useCallback(() => {
    setEditor(emptyEditor());
    setErrors([]);
    setConflictDesignationIds([]);
    setView("editor");
    void ensureCatalogue();
  }, [ensureCatalogue]);

  const startEdit = useCallback(
    (config: StoreProfileConfiguration) => {
      setEditor(toEditor(config));
      setErrors([]);
      setConflictDesignationIds([]);
      setView("editor");
      void ensureCatalogue();
    },
    [ensureCatalogue],
  );

  /** Designations claimed by OTHER configs — no extra fetch needed. */
  const usedDesignations = useMemo(() => {
    const used = new Map<string, string>();
    configs.forEach((config, index) => {
      if (editor.id && config.id === editor.id) return;
      const label = config.name?.trim() || `Configuration ${index + 1}`;
      config.applicableDesignations.forEach((id) => used.set(id, label));
    });
    return used;
  }, [configs, editor.id]);

  const toggleDesignation = useCallback((id: string) => {
    setConflictDesignationIds([]);
    setEditor((current) => ({
      ...current,
      applicableDesignations: current.applicableDesignations.includes(id)
        ? current.applicableDesignations.filter((value) => value !== id)
        : [...current.applicableDesignations, id],
    }));
  }, []);

  const saveConfig = useCallback(async () => {
    const validationErrors = validate(editor);
    setErrors(validationErrors);
    if (validationErrors.length > 0) return;

    setSaving(true);
    try {
      const input = {
        name: editor.name,
        applicableDesignations: editor.applicableDesignations,
        selectedFields: editor.selectedFields,
      };
      if (editor.id) {
        await storeProfileConfigService.update(editor.id, projectId, input);
      } else {
        await storeProfileConfigService.create({ ...input, projectId });
      }
      await load();
      setToast({ type: "success", message: "Store Profile configuration saved." });
      setView("list");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const details = (err.details ?? {}) as Record<string, unknown>;
        const ids = Array.isArray(details.conflictingDesignationIds)
          ? details.conflictingDesignationIds.map(String).filter(Boolean)
          : [];
        if (ids.length) setConflictDesignationIds(ids);
      }
      setToast({ type: "error", message: formatApiError(err, "Failed to save Store Profile configuration") });
    } finally {
      setSaving(false);
    }
  }, [editor, load, projectId]);

  const cloneConfig = useCallback(
    async (config: StoreProfileConfiguration) => {
      try {
        await storeProfileConfigService.clone(config.id, projectId);
        await load();
        setToast({ type: "success", message: `Cloned "${config.name}". Assign designations to the copy.` });
      } catch (err) {
        setToast({ type: "error", message: formatApiError(err, "Failed to clone configuration") });
      }
    },
    [load, projectId],
  );

  const deleteConfig = useCallback(async () => {
    if (!confirmDelete) return;
    try {
      await storeProfileConfigService.remove(confirmDelete.id, projectId);
      await load();
      setToast({ type: "success", message: `Deleted "${confirmDelete.name}".` });
    } catch (err) {
      setToast({ type: "error", message: formatApiError(err, "Failed to delete configuration") });
    } finally {
      setConfirmDelete(null);
    }
  }, [confirmDelete, load, projectId]);

  const toggleConfigActivation = useCallback(
    async (config: StoreProfileConfiguration, enabled: boolean) => {
      setTogglingConfigId(config.id);
      try {
        if (enabled) {
          await storeProfileConfigService.activateConfiguration(config.id, projectId);
        } else {
          await storeProfileConfigService.deactivateConfiguration(config.id, projectId);
        }
        await load();
        setToast({
          type: "success",
          message: `${config.name} ${enabled ? "enabled" : "disabled"}.`,
        });
      } catch (err) {
        setToast({ type: "error", message: formatApiError(err, "Failed to update configuration status") });
      } finally {
        setTogglingConfigId(null);
      }
    },
    [load, projectId],
  );

  if (loading) {
    return (
      <div className="sp-config-page">
        <div className="edit-skeleton">
          <div className="skeleton-section" />
          <div className="skeleton-section" />
        </div>
      </div>
    );
  }

  // ── Editor ────────────────────────────────────────────────────────────────
  if (view === "editor") {
    const catalogueMissing = catalogue === null;
    return (
      <div className="sp-config-page">
        <header className="sp-page-head">
          <button type="button" className="sp-back" onClick={() => setView("list")}>
            <ArrowLeft size={16} /> All configurations
          </button>
          <h1>{editor.id ? "Edit Store Profile configuration" : "New Store Profile configuration"}</h1>
          <p>Choose which Store Master fields appear on the store profile tab, and in what order.</p>
        </header>

        {errors.length > 0 ? (
          <ul className="sp-errors">
            {errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        ) : null}

        {catalogueError ? <div className="sp-banner-error">{catalogueError}</div> : null}

        <section className="sp-section-card">
          <h2>Configuration name</h2>
          <input
            className="form-input"
            value={editor.name}
            maxLength={160}
            placeholder="e.g. ISP - Store Profile"
            aria-label="Configuration name"
            onChange={(event) => setEditor((current) => ({ ...current, name: event.target.value }))}
          />
        </section>

        <section className="sp-section-card">
          <h2>Applicable designations</h2>
          <p className="sp-section-hint">
            One configuration per designation. Designations already assigned elsewhere cannot be picked.
          </p>
          <div className="sp-designation-grid">
            {designations.map((designation) => {
              const selected = editor.applicableDesignations.includes(designation.id);
              const usedBy = usedDesignations.get(designation.id);
              const blocked = Boolean(usedBy && !selected);
              const conflict = conflictDesignationIds.includes(designation.id);
              return (
                <label
                  key={designation.id}
                  className={`sp-designation-option${selected ? " selected" : ""}${
                    blocked ? " disabled" : ""
                  }${conflict ? " conflict" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    disabled={blocked || saving}
                    onChange={() => toggleDesignation(designation.id)}
                  />
                  <span>{designation.name}</span>
                  {usedBy ? <small>Assigned to {usedBy}</small> : null}
                </label>
              );
            })}
          </div>
        </section>

        <section className="sp-section-card">
          <h2>Fields to display</h2>
          <StoreFieldSelectionPanel
            available={catalogue ?? []}
            selected={editor.selectedFields}
            disabled={saving || catalogueMissing}
            error={errors.includes("Select at least one field to display.") ? "Select at least one field." : undefined}
            onSelectionChange={(next) => setEditor((current) => ({ ...current, selectedFields: next }))}
          />
        </section>

        <footer className="sp-editor-actions">
          <button type="button" className="btn btn-secondary" onClick={() => setView("list")} disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void saveConfig()}
            disabled={saving || catalogueMissing}
            title={catalogueMissing ? "Store Master fields could not be loaded" : undefined}
          >
            {saving ? "Saving..." : "Submit"}
          </button>
        </footer>

        {toast ? <If2Toast toast={toast} onDismiss={() => setToast(null)} /> : null}
      </div>
    );
  }

  // ── List ──────────────────────────────────────────────────────────────────
  return (
    <div className="sp-config-page">
      <header className="sp-page-head">
        <h1>Store Profile</h1>
        <p>
          Shows a read-only Store Profile tab on the app Profile screen, with the fields you pick here.
        </p>
      </header>

      {configs.length === 0 ? (
        <div className="sp-empty">
          <Store size={28} aria-hidden="true" />
          <h2>No Store Profile configurations yet</h2>
          <p>Create the first configuration to choose which Store Master fields appear in the app.</p>
          <button type="button" className="btn btn-primary" onClick={startCreate}>
            <Plus size={15} /> Create configuration
          </button>
        </div>
      ) : (
        <div className="sp-config-grid">
          {configs.map((config, index) => {
            const enabled = activeConfigIds.has(config.id);
            const previewLabels = config.selectedFields.slice(0, 3).map((field) => field.headerName);
            return (
              <article key={config.id} className="sp-config-card">
                <span className="sp-config-index">{index + 1}</span>
                <h2>{config.name}</h2>
                <span className={`sp-status${enabled ? " active" : ""}`}>
                  {enabled ? "Enabled" : "Disabled"}
                </span>
                <p className="sp-config-designations">
                  {designationNames(config.applicableDesignations, designations)}
                </p>
                <p className="sp-config-fields">
                  <span className="sp-chip">
                    {config.selectedFields.length} field{config.selectedFields.length === 1 ? "" : "s"}
                  </span>
                  {previewLabels.length > 0 ? <span className="sp-muted">{previewLabels.join(" · ")}</span> : null}
                </p>
                <div className="sp-card-actions">
                  <button
                    type="button"
                    disabled={togglingConfigId === config.id}
                    onClick={() => void toggleConfigActivation(config, !enabled)}
                  >
                    <Power size={15} /> {togglingConfigId === config.id ? "Saving..." : enabled ? "Disable" : "Enable"}
                  </button>
                  <button type="button" onClick={() => startEdit(config)}>
                    <Pencil size={15} /> Edit
                  </button>
                  <button type="button" onClick={() => void cloneConfig(config)}>
                    <Copy size={15} /> Clone
                  </button>
                  <button type="button" className="danger" onClick={() => setConfirmDelete(config)}>
                    <Trash2 size={15} /> Delete
                  </button>
                </div>
              </article>
            );
          })}

          <button type="button" className="sp-add-config" onClick={startCreate}>
            <Plus size={18} /> Add new configuration
          </button>
        </div>
      )}

      {confirmDelete ? (
        <ConfirmDialog
          isOpen
          variant="danger"
          title="Delete configuration"
          message={`Delete "${confirmDelete.name}"? The Store Profile tab will disappear for its designations.`}
          confirmLabel="Delete"
          onConfirm={() => void deleteConfig()}
          onClose={() => setConfirmDelete(null)}
        />
      ) : null}

      {toast ? <If2Toast toast={toast} onDismiss={() => setToast(null)} /> : null}
    </div>
  );
}
