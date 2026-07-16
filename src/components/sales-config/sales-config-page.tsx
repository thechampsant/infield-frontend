"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Box,
  ChevronDown,
  Copy,
  CheckCircle2,
  Layers3,
  Pencil,
  Plus,
  Settings2,
  Target,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { If2Toast, type ToastState } from "@/components/accounts/if2-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  designationService,
  formatApiError,
  salesConfigService,
  type Designation,
  type SalesApprovalLevelRole,
  type SalesConfiguration,
} from "@/lib/api";
import { projectAdminBase } from "@/lib/nav/nav";

type View = "list" | "editor";
type EditorSection = "settings" | "mapping" | "zero" | "target" | "approval";

interface EditorLevel {
  id: string;
  label: string;
  approverType: SalesApprovalLevelRole;
  approverDesignationId: string;
  autoRejectDays: string;
}

interface EditorState {
  id?: string;
  name: string;
  applicableDesignations: string[];
  productStoreMappingEnabled: boolean;
  zeroSalesEnabled: boolean;
  targetVsAchievementLinked: boolean;
  approvalEnabled: boolean;
  levels: EditorLevel[];
}

function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function emptyLevel(index: number): EditorLevel {
  return {
    id: makeId("sales_level"),
    label: index === 0 ? "Manager Approval" : `Approval Level ${index + 1}`,
    approverType: index === 0 ? "direct_manager" : "designation",
    approverDesignationId: "",
    autoRejectDays: "3",
  };
}

function emptyEditor(): EditorState {
  return {
    name: "",
    applicableDesignations: [],
    productStoreMappingEnabled: true,
    zeroSalesEnabled: true,
    targetVsAchievementLinked: false,
    approvalEnabled: false,
    levels: [emptyLevel(0)],
  };
}

function toEditor(config: SalesConfiguration): EditorState {
  const levels =
    config.approvalWorkflow.levels.length > 0
      ? config.approvalWorkflow.levels.map((level, index) => ({
          id: makeId("sales_level"),
          label: level.label || `Approval Level ${index + 1}`,
          approverType: level.approverType,
          approverDesignationId: level.approverDesignationId ?? "",
          autoRejectDays: String(level.autoRejectDays || 3),
        }))
      : [emptyLevel(0)];

  return {
    id: config.id,
    name: config.name,
    applicableDesignations: config.applicableDesignations,
    productStoreMappingEnabled: config.productStoreMappingEnabled,
    zeroSalesEnabled: config.zeroSalesEnabled,
    targetVsAchievementLinked: config.targetVsAchievementLinked,
    approvalEnabled: config.approvalWorkflow.isEnabled,
    levels,
  };
}

function designationNames(ids: string[], designations: Designation[]): string {
  if (!ids.length) return "No designations";
  const names = ids
    .map((id) => designations.find((designation) => designation.id === id)?.name)
    .filter(Boolean);
  if (!names.length) return `${ids.length} designation${ids.length === 1 ? "" : "s"}`;
  if (names.length <= 2) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
}

function validate(editor: EditorState): string[] {
  const errors: string[] = [];
  if (!editor.name.trim()) errors.push("Configuration name is required.");
  if (editor.name.trim().length > 160) errors.push("Configuration name must be 160 characters or fewer.");
  if (!editor.applicableDesignations.length) errors.push("Select at least one applicable designation.");
  if (editor.approvalEnabled) {
    if (!editor.levels.length) errors.push("Add at least one approval level.");
    if (editor.levels.length > 10) errors.push("Approval workflow can have up to 10 levels.");
    editor.levels.forEach((level, index) => {
      if (!level.label.trim()) errors.push(`Approval level ${index + 1}: label is required.`);
      const days = Number(level.autoRejectDays);
      if (!Number.isInteger(days) || days < 1 || days > 30) {
        errors.push(`Approval level ${index + 1}: auto reject days must be between 1 and 30.`);
      }
      if (level.approverType === "designation" && !level.approverDesignationId) {
        errors.push(`Approval level ${index + 1}: select an approver designation.`);
      }
    });
  }
  return errors;
}

export function SalesConfigPage({
  projectId,
  accountCode,
  projectCode,
}: {
  projectId: string;
  projectName: string;
  accountCode: string;
  projectCode: string;
}) {
  const router = useRouter();
  const [view, setView] = useState<View>("list");
  const [configs, setConfigs] = useState<SalesConfiguration[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [editor, setEditor] = useState<EditorState>(emptyEditor);
  const [openSection, setOpenSection] = useState<EditorSection | null>("settings");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<SalesConfiguration | null>(null);

  const base = projectAdminBase(accountCode, projectCode);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [configList, designationList] = await Promise.all([
        salesConfigService.list(projectId),
        designationService.listByProject(projectId),
      ]);
      setConfigs(configList);
      setDesignations(designationList);
    } catch (error) {
      setToast({ type: "error", message: formatApiError(error, "Failed to load Sales configuration") });
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  function startCreate() {
    setErrors([]);
    setEditor(emptyEditor());
    setOpenSection("settings");
    setView("editor");
  }

  function startEdit(config: SalesConfiguration) {
    setErrors([]);
    setEditor(toEditor(config));
    setOpenSection("settings");
    setView("editor");
  }

  function toggleDesignation(id: string) {
    setEditor((current) => ({
      ...current,
      applicableDesignations: current.applicableDesignations.includes(id)
        ? current.applicableDesignations.filter((item) => item !== id)
        : [...current.applicableDesignations, id],
    }));
  }

  function updateLevel(id: string, patch: Partial<EditorLevel>) {
    setEditor((current) => ({
      ...current,
      levels: current.levels.map((level) =>
        level.id === id ? { ...level, ...patch } : level,
      ),
    }));
  }

  function buildSaveInput() {
    return {
      name: editor.name.trim(),
      applicableDesignations: editor.applicableDesignations,
      productStoreMappingEnabled: editor.productStoreMappingEnabled,
      zeroSalesEnabled: editor.zeroSalesEnabled,
      targetVsAchievementLinked: editor.targetVsAchievementLinked,
      approvalWorkflow: {
        isEnabled: editor.approvalEnabled,
        levels: editor.approvalEnabled
          ? editor.levels.map((level, index) => ({
              level: index + 1,
              label: level.label.trim(),
              approverType: level.approverType,
              approverDesignationId:
                level.approverType === "designation"
                  ? level.approverDesignationId
                  : undefined,
              autoRejectDays: Number(level.autoRejectDays),
            }))
          : [],
      },
    };
  }

  async function saveConfig(): Promise<SalesConfiguration | null> {
    const nextErrors = validate(editor);
    setErrors(nextErrors);
    if (nextErrors.length) return null;

    setSaving(true);
    try {
      let saved: SalesConfiguration;
      if (editor.id) {
        saved = await salesConfigService.update(editor.id, projectId, buildSaveInput());
      } else {
        saved = await salesConfigService.create({ ...buildSaveInput(), projectId });
        setEditor((current) => ({ ...current, id: saved.id }));
      }
      await load();
      setToast({ type: "success", message: "Sales configuration saved." });
      return saved;
    } catch (error) {
      setToast({ type: "error", message: formatApiError(error, "Failed to save Sales configuration") });
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function saveAndProceed() {
    const saved = await saveConfig();
    if (!saved?.id) return;
    router.push(`${base}/modules/sales/${saved.id}/form-builder`);
  }

  async function cloneConfig(config: SalesConfiguration) {
    try {
      await salesConfigService.clone(config.id, projectId);
      await load();
      setToast({ type: "success", message: `Cloned "${config.name}".` });
    } catch (error) {
      setToast({ type: "error", message: formatApiError(error, "Failed to clone Sales configuration") });
    }
  }

  async function deleteConfig() {
    if (!confirmDelete) return;
    try {
      await salesConfigService.remove(confirmDelete.id, projectId);
      await load();
      setConfirmDelete(null);
      setToast({ type: "success", message: "Sales configuration deleted." });
    } catch (error) {
      setToast({ type: "error", message: formatApiError(error, "Failed to delete Sales configuration") });
    }
  }

  if (loading) {
    return (
      <div className="sales-config-page">
        <div className="edit-skeleton">
          <div className="skeleton-section" />
          <div className="skeleton-section" />
          <div className="skeleton-section" />
        </div>
      </div>
    );
  }

  return (
    <div className="sales-config-page">
      <div className="sales-header">
        <div>
          <div className="sales-eyebrow">Sales Module</div>
          <h1>
            {view === "list"
              ? "Sales Configurations"
              : editor.name || "Untitled Sales Configuration"}
          </h1>
          <p>
            {view === "list"
              ? "Each configuration defines how Sales behaves for a set of designations. Field-level settings (entry mode, columns, filters, backdating, invoice, customer details) are managed in the Form Builder."
              : "Configure the form, runtime behavior, and approval workflow for this Sales configuration."}
          </p>
        </div>
        <div className="sales-header-actions">
          {view === "list" ? (
            null
          ) : (
            <button type="button" className="sales-secondary-btn" onClick={() => setView("list")}>
              <ArrowLeft size={16} /> All Configs
            </button>
          )}
        </div>
      </div>

      {view === "list" ? (
        <>
          <div className="sales-list-toolbar">
            <Link href={`${base}/modules`} className="sales-back-link">
              <ArrowLeft size={16} /> Back to Modules
            </Link>
          </div>

          <div className="sales-stepper">
            <div className="sales-step active">
              <span>1</span>
              <strong>Configuration Setup</strong>
            </div>
            <div className="sales-step-arrow">→</div>
            <div className="sales-step">
              <span>2</span>
              <strong>Form Builder</strong>
            </div>
          </div>

          {configs.length === 0 ? (
            <div className="sales-empty">
              <Layers3 size={28} />
              <h2>No Sales configurations yet</h2>
              <p>Create the first configuration to expose Sales entry forms to matching designations.</p>
              <button type="button" className="sales-primary-btn" onClick={startCreate}>
                <Plus size={16} /> Create Configuration
              </button>
            </div>
          ) : (
            <div className="sales-config-grid">
              {configs.map((config, index) => {
                return (
                  <article className="sales-config-card" key={config.id}>
                    <div className="sales-config-main">
                      <div className="sales-config-index">{index + 1}</div>
                      <div>
                      <h2>{config.name}</h2>
                      <p>{designationNames(config.applicableDesignations, designations)}</p>
                      <div className="sales-chip-row">
                        {config.productStoreMappingEnabled && <span className="map">Store-Product Mapping</span>}
                        {config.zeroSalesEnabled && <span className="zero">Zero Sales</span>}
                        {config.targetVsAchievementLinked && <span className="tva">T vs A Linked</span>}
                        {config.approvalWorkflow.isEnabled && (
                          <span className="approval">Approval: {config.approvalWorkflow.levels.length} levels</span>
                        )}
                      </div>
                      </div>
                    </div>
                    <div className="sales-card-actions">
                      <button type="button" onClick={() => startEdit(config)} title="Edit">
                        <Pencil size={15} /> Edit
                      </button>
                      <button type="button" onClick={() => void cloneConfig(config)} title="Clone">
                        <Copy size={15} /> Clone
                      </button>
                      <button type="button" className="danger" onClick={() => setConfirmDelete(config)} title="Delete">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </article>
                );
              })}
              <button type="button" className="sales-add-config" onClick={startCreate}>
                <Plus size={18} />
                Add New Sales Configuration
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="sales-breadcrumb">
            <button type="button" onClick={() => setView("list")}>All Configs</button>
            <span>/</span>
            <strong>{editor.name || (editor.id ? "Edit Configuration" : "New Configuration")}</strong>
          </div>

          {errors.length > 0 && (
            <div className="sales-errors">
              {errors.map((error) => <div key={error}>{error}</div>)}
            </div>
          )}

          <div className="sales-stepper">
            <div className="sales-step active">
              <span>1</span>
              <strong>Configuration Setup</strong>
            </div>
            <div className="sales-step-arrow">→</div>
            <div className="sales-step">
              <span>2</span>
              <strong>Form Builder</strong>
            </div>
          </div>

          <div className="sales-editor sales-editor--accordion">
          <EditorAccordion
            icon={<Settings2 size={18} />}
            title="Configuration Settings"
            description="Name and applicable designations"
            open={openSection === "settings"}
            onToggle={() => setOpenSection((current) => current === "settings" ? null : "settings")}
          >
            <div className="sales-fields-grid">
              <label className="wide">
                <span>Config Name</span>
                <input
                  value={editor.name}
                  maxLength={160}
                  onChange={(event) => setEditor((current) => ({ ...current, name: event.target.value }))}
                  placeholder="ISP Executive - Sales"
                />
              </label>
            </div>
            <div className="sales-designation-grid">
              {designations.map((designation) => {
                const selected = editor.applicableDesignations.includes(designation.id);
                return (
                  <label className={selected ? "selected" : ""} key={designation.id}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleDesignation(designation.id)}
                    />
                    <span>{designation.name}</span>
                  </label>
                );
              })}
            </div>
          </EditorAccordion>

          <EditorAccordion
            icon={<Box size={18} />}
            title="Product-Store Mapping"
            description="Filter products by store assignment"
            open={openSection === "mapping"}
            onToggle={() => setOpenSection((current) => current === "mapping" ? null : "mapping")}
          >
            <div className="sales-toggle-grid">
              <ToggleCard
                title="Product-store mapping"
                description="Restrict product options to the selected store mapping."
                checked={editor.productStoreMappingEnabled}
                onChange={(checked) => setEditor((current) => ({ ...current, productStoreMappingEnabled: checked }))}
              />
            </div>
          </EditorAccordion>

          <EditorAccordion
            icon={<X size={18} />}
            title="Zero Sales Declaration"
            description="One-way lock when ISP has no sales for the day"
            open={openSection === "zero"}
            onToggle={() => setOpenSection((current) => current === "zero" ? null : "zero")}
          >
            <div className="sales-toggle-grid">
              <ToggleCard
                title="Zero Sales"
                description="Allow users to declare no sales for a config and date."
                checked={editor.zeroSalesEnabled}
                onChange={(checked) => setEditor((current) => ({ ...current, zeroSalesEnabled: checked }))}
              />
            </div>
          </EditorAccordion>

          <EditorAccordion
            icon={<Target size={18} />}
            title="Target vs Achievement Linkage"
            description="Link sales entries to T vs A module"
            open={openSection === "target"}
            onToggle={() => setOpenSection((current) => current === "target" ? null : "target")}
          >
            <div className="sales-toggle-grid">
              <ToggleCard
                title="Target vs Achievement"
                description="Save the linkage flag for future achievement calculations."
                checked={editor.targetVsAchievementLinked}
                onChange={(checked) => setEditor((current) => ({ ...current, targetVsAchievementLinked: checked }))}
              />
            </div>
          </EditorAccordion>

          <EditorAccordion
            icon={<UserRound size={18} />}
            title="Approval Workflow"
            description="Sequential approval chain with auto-reject timers"
            open={openSection === "approval"}
            onToggle={() => setOpenSection((current) => current === "approval" ? null : "approval")}
          >
            <ToggleCard
              title="Approval required"
              description="Route Sales submissions through Inbox before finalization."
              checked={editor.approvalEnabled}
              onChange={(checked) => setEditor((current) => ({ ...current, approvalEnabled: checked }))}
            />

            {editor.approvalEnabled && (
              <div className="sales-level-list">
                {editor.levels.map((level, index) => (
                  <div className="sales-level-row" key={level.id}>
                    <span className="sales-level-index">{index + 1}</span>
                    <input
                      value={level.label}
                      onChange={(event) => updateLevel(level.id, { label: event.target.value })}
                      placeholder="Approval label"
                    />
                    <select
                      value={level.approverType}
                      onChange={(event) =>
                        updateLevel(level.id, {
                          approverType: event.target.value as SalesApprovalLevelRole,
                          approverDesignationId: "",
                        })
                      }
                    >
                      <option value="direct_manager">Direct manager</option>
                      <option value="designation">Designation</option>
                    </select>
                    <select
                      value={level.approverDesignationId}
                      disabled={level.approverType !== "designation"}
                      onChange={(event) => updateLevel(level.id, { approverDesignationId: event.target.value })}
                    >
                      <option value="">Approver designation</option>
                      {designations.map((designation) => (
                        <option value={designation.id} key={designation.id}>{designation.name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={level.autoRejectDays}
                      onChange={(event) => updateLevel(level.id, { autoRejectDays: event.target.value })}
                      aria-label={`Auto reject days for level ${index + 1}`}
                    />
                    <button
                      type="button"
                      className="sales-icon-btn danger"
                      disabled={editor.levels.length <= 1}
                      onClick={() =>
                        setEditor((current) => ({
                          ...current,
                          levels: current.levels.filter((item) => item.id !== level.id),
                        }))
                      }
                      title="Remove level"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="sales-secondary-btn"
                  disabled={editor.levels.length >= 10}
                  onClick={() =>
                    setEditor((current) => ({
                      ...current,
                      levels: [...current.levels, emptyLevel(current.levels.length)],
                    }))
                  }
                >
                  <Plus size={14} /> Add approval level
                </button>
              </div>
            )}
          </EditorAccordion>

          <div className="sales-savebar">
            <div>
              <CheckCircle2 size={15} />
              All changes saved
            </div>
            <div>
              <button type="button" className="sales-primary-btn" disabled={saving} onClick={() => void saveAndProceed()}>
                <ChevronDown size={14} className="sales-proceed-icon" />
                {saving ? "Saving..." : "Save & Proceed to Form Builder"}
              </button>
            </div>
          </div>
          </div>
        </>
      )}

      <ConfirmDialog
        isOpen={Boolean(confirmDelete)}
        title="Delete Sales configuration?"
        message="This soft deletes the configuration. The backend may prevent deleting the last active Sales configuration."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => void deleteConfig()}
      />
      <If2Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

function EditorAccordion({
  icon,
  title,
  description,
  open,
  onToggle,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className={`sales-section-card sales-accordion ${open ? "open" : ""}`}>
      <button type="button" className="sales-accordion-head" onClick={onToggle}>
        <div className="sales-section-title-wrap">
          <div className="sales-section-icon">{icon}</div>
          <div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
        </div>
        <ChevronDown size={18} className="sales-accordion-chevron" />
      </button>
      {open && <div className="sales-accordion-body">{children}</div>}
    </section>
  );
}

function ToggleCard({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={`sales-toggle-card${checked ? " selected" : ""}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
    </label>
  );
}
