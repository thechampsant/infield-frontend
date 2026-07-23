"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Boxes,
  CheckCircle2,
  Copy,
  GitBranch,
  Layers3,
  Pencil,
  Plus,
  Power,
  Settings2,
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
  stockConfigService,
  type Designation,
  type SalesConfiguration,
  type StockApprovalLevelRole,
  type StockConfiguration,
  type StockFieldMapping,
  type StockTrackingLevel,
  type StockType,
  type StockTypeBehavior,
  type UdfSchemaField,
} from "@/lib/api";
import { projectAdminBase } from "@/lib/nav/nav";

type View = "list" | "editor";
type EditorSection = "settings" | "mapping" | "types" | "approval" | "sales" | "activate";

interface EditorLevel {
  id: string;
  label: string;
  approverType: StockApprovalLevelRole;
  approverDesignationId: string;
  autoRejectDays: string;
}

interface EditorState {
  id?: string;
  name: string;
  applicableDesignations: string[];
  trackingLevel: StockTrackingLevel;
  productMapping: string;
  quantityMapping: string;
  approvalEnabled: boolean;
  levels: EditorLevel[];
}

interface FieldOption {
  value: string;
  label: string;
  type: string;
  mapping: StockFieldMapping;
}

const trackingLevelLabels: Record<StockTrackingLevel, string> = {
  user: "User wise",
  store: "Store wise",
  user_store: "User + Store wise",
};

const stockTypeBehaviorLabels: Record<StockTypeBehavior, string> = {
  ADD: "Add stock",
  DEDUCT: "Deduct stock",
  OPENING: "Opening stock",
  CLOSING_RECONCILIATION: "Closing reconciliation",
  ADJUSTMENT_ADD: "Adjustment add",
  ADJUSTMENT_DEDUCT: "Adjustment deduct",
};

const stockTypeBehaviors = Object.keys(stockTypeBehaviorLabels) as StockTypeBehavior[];

function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function mappingToValue(mapping?: StockFieldMapping): string {
  if (!mapping?.fieldKey) return "";
  return `${mapping.groupFieldKey ?? ""}::${mapping.fieldKey}`;
}

function valueToMapping(value: string): StockFieldMapping | undefined {
  if (!value) return undefined;
  const [groupFieldKey, fieldKey] = value.split("::");
  if (!fieldKey) return undefined;
  return {
    ...(groupFieldKey ? { groupFieldKey } : {}),
    fieldKey,
  };
}

function emptyLevel(index: number): EditorLevel {
  return {
    id: makeId("stock_level"),
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
    trackingLevel: "store",
    productMapping: "",
    quantityMapping: "",
    approvalEnabled: false,
    levels: [emptyLevel(0)],
  };
}

function toEditor(config: StockConfiguration): EditorState {
  const levels =
    config.approvalWorkflow.levels.length > 0
      ? config.approvalWorkflow.levels.map((level, index) => ({
          id: makeId("stock_level"),
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
    trackingLevel: config.trackingLevel,
    productMapping: mappingToValue(config.fieldMappings.product),
    quantityMapping: mappingToValue(config.fieldMappings.quantity),
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

function fieldOptions(fields: UdfSchemaField[]): FieldOption[] {
  return fields.flatMap<FieldOption>((field) => {
    if (field.type === "REPEATABLE_GROUP") {
      const config = field.config && typeof field.config === "object"
        ? (field.config as Record<string, unknown>)
        : {};
      const children = Array.isArray(config.fields) ? (config.fields as UdfSchemaField[]) : [];
      return children.map((child) => ({
        value: mappingToValue({ groupFieldKey: field.fieldKey, fieldKey: child.fieldKey }),
        label: `${field.label} / ${child.label}`,
        type: child.type,
        mapping: { groupFieldKey: field.fieldKey, fieldKey: child.fieldKey },
      }));
    }
    return [{
      value: mappingToValue({ fieldKey: field.fieldKey }),
      label: field.label,
      type: field.type,
      mapping: { fieldKey: field.fieldKey },
    }];
  });
}

function validate(editor: EditorState): string[] {
  const errors: string[] = [];
  const product = valueToMapping(editor.productMapping);
  const quantity = valueToMapping(editor.quantityMapping);
  if (!editor.name.trim()) errors.push("Configuration name is required.");
  if (editor.name.trim().length > 160) errors.push("Configuration name must be 160 characters or fewer.");
  if (!editor.applicableDesignations.length) errors.push("Select at least one applicable designation.");
  if (product && quantity && (product.groupFieldKey ?? "") !== (quantity.groupFieldKey ?? "")) {
    errors.push("Product and movement quantity mappings must be in the same repeatable group.");
  }
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

export function StockConfigPage({
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
  const [configs, setConfigs] = useState<StockConfiguration[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [salesConfigs, setSalesConfigs] = useState<SalesConfiguration[]>([]);
  const [editor, setEditor] = useState<EditorState>(emptyEditor);
  const [openSection, setOpenSection] = useState<EditorSection | null>("settings");
  const [stockTypes, setStockTypes] = useState<StockType[]>([]);
  const [schemaFields, setSchemaFields] = useState<UdfSchemaField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<StockConfiguration | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [stockTypeName, setStockTypeName] = useState("");
  const [stockTypeBehavior, setStockTypeBehavior] = useState<StockTypeBehavior>("ADD");
  const [stockTypeSaving, setStockTypeSaving] = useState(false);
  const [linkSalesId, setLinkSalesId] = useState("");
  const [linkProductMapping, setLinkProductMapping] = useState("");
  const [linkQuantityMapping, setLinkQuantityMapping] = useState("");
  const [salesSchemaFields, setSalesSchemaFields] = useState<UdfSchemaField[]>([]);
  const [linkSaving, setLinkSaving] = useState(false);

  const base = projectAdminBase(accountCode, projectCode);
  const options = useMemo(() => fieldOptions(schemaFields), [schemaFields]);
  const salesOptions = useMemo(() => fieldOptions(salesSchemaFields), [salesSchemaFields]);
  const selectedConfig = useMemo(
    () => configs.find((config) => config.id === editor.id) ?? null,
    [configs, editor.id],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [configList, designationList, salesList] = await Promise.all([
        stockConfigService.list(projectId),
        designationService.listByProject(projectId),
        salesConfigService.list(projectId),
      ]);
      setConfigs(configList);
      setDesignations(designationList);
      setSalesConfigs(salesList.filter((config) => config.isActive));
    } catch (error) {
      setToast({ type: "error", message: formatApiError(error, "Failed to load Stock configuration") });
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!editor.id) {
      setStockTypes([]);
      setSchemaFields([]);
      return;
    }
    let active = true;
    async function loadEditorExtras() {
      try {
        const [types, schema] = await Promise.all([
          stockConfigService.listStockTypes(editor.id as string, projectId),
          stockConfigService.getUdfSchema(editor.id as string, projectId),
        ]);
        if (!active) return;
        setStockTypes(types);
        setSchemaFields(schema.fields);
      } catch (error) {
        if (!active) return;
        setToast({ type: "error", message: formatApiError(error, "Failed to load Stock setup details") });
      }
    }
    void loadEditorExtras();
    return () => {
      active = false;
    };
  }, [editor.id, projectId]);

  useEffect(() => {
    if (!linkSalesId) {
      setSalesSchemaFields([]);
      setLinkProductMapping("");
      setLinkQuantityMapping("");
      return;
    }
    let active = true;
    async function loadSalesSchema() {
      try {
        const schema = await salesConfigService.getUdfSchema(linkSalesId, projectId);
        if (!active) return;
        setSalesSchemaFields(schema.fields);
      } catch (error) {
        if (!active) return;
        setToast({ type: "error", message: formatApiError(error, "Failed to load Sales form fields") });
      }
    }
    void loadSalesSchema();
    return () => {
      active = false;
    };
  }, [linkSalesId, projectId]);

  function startCreate() {
    setErrors([]);
    setEditor(emptyEditor());
    setOpenSection("settings");
    setView("editor");
  }

  function startEdit(config: StockConfiguration) {
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
      trackingLevel: editor.trackingLevel,
      fieldMappings: {
        ...(valueToMapping(editor.productMapping) ? { product: valueToMapping(editor.productMapping) } : {}),
        ...(valueToMapping(editor.quantityMapping) ? { quantity: valueToMapping(editor.quantityMapping) } : {}),
      },
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

  async function saveConfig(): Promise<StockConfiguration | null> {
    const nextErrors = validate(editor);
    setErrors(nextErrors);
    if (nextErrors.length) return null;

    setSaving(true);
    try {
      let saved: StockConfiguration;
      if (editor.id) {
        saved = await stockConfigService.update(editor.id, projectId, buildSaveInput());
      } else {
        saved = await stockConfigService.create({ ...buildSaveInput(), projectId });
        setEditor((current) => ({ ...current, id: saved.id }));
      }
      await load();
      setToast({ type: "success", message: "Stock configuration saved." });
      return saved;
    } catch (error) {
      setToast({ type: "error", message: formatApiError(error, "Failed to save Stock configuration") });
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function saveAndProceed() {
    const saved = await saveConfig();
    if (!saved?.id) return;
    router.push(`${base}/modules/stock/${saved.id}/form-builder`);
  }

  async function cloneConfig(config: StockConfiguration) {
    try {
      await stockConfigService.clone(config.id, projectId);
      await load();
      setToast({ type: "success", message: `Cloned "${config.name}".` });
    } catch (error) {
      setToast({ type: "error", message: formatApiError(error, "Failed to clone Stock configuration") });
    }
  }

  async function deleteConfig() {
    if (!confirmDelete) return;
    try {
      await stockConfigService.remove(confirmDelete.id, projectId);
      await load();
      setConfirmDelete(null);
      setToast({ type: "success", message: "Stock configuration deleted." });
    } catch (error) {
      setToast({ type: "error", message: formatApiError(error, "Failed to delete Stock configuration") });
    }
  }

  async function activateConfig(config: StockConfiguration) {
    setActivatingId(config.id);
    try {
      await stockConfigService.activate(config.id, projectId);
      await load();
      setToast({ type: "success", message: `${config.name} activated.` });
    } catch (error) {
      setToast({ type: "error", message: formatApiError(error, "Stock configuration could not be activated.") });
    } finally {
      setActivatingId(null);
    }
  }

  async function addStockType() {
    if (!editor.id) {
      setToast({ type: "error", message: "Save the Stock configuration before adding Stock Types." });
      return;
    }
    if (!stockTypeName.trim() || stockTypeName.trim().length > 120) {
      setToast({ type: "error", message: "Stock Type name is required and must be 120 characters or fewer." });
      return;
    }
    setStockTypeSaving(true);
    try {
      const created = await stockConfigService.createStockType(editor.id, projectId, {
        name: stockTypeName.trim(),
        behavior: stockTypeBehavior,
      });
      setStockTypes((current) => [...current, created]);
      setStockTypeName("");
      setStockTypeBehavior("ADD");
      setToast({ type: "success", message: "Stock Type added." });
    } catch (error) {
      setToast({ type: "error", message: formatApiError(error, "Failed to add Stock Type") });
    } finally {
      setStockTypeSaving(false);
    }
  }

  async function deactivateStockType(stockType: StockType) {
    if (!editor.id) return;
    try {
      await stockConfigService.deactivateStockType(editor.id, projectId, stockType.id);
      setStockTypes((current) =>
        current.map((item) => item.id === stockType.id ? { ...item, isActive: false } : item),
      );
      setToast({ type: "success", message: `${stockType.name} deactivated.` });
    } catch (error) {
      setToast({ type: "error", message: formatApiError(error, "Failed to deactivate Stock Type") });
    }
  }

  function salesDesignationsAreSubset(salesConfig: SalesConfiguration): boolean {
    return salesConfig.applicableDesignations.every((id) => editor.applicableDesignations.includes(id));
  }

  async function linkSalesConfiguration() {
    if (!editor.id) return;
    const product = valueToMapping(linkProductMapping);
    const quantity = valueToMapping(linkQuantityMapping);
    if (!linkSalesId || !product || !quantity) {
      setToast({ type: "error", message: "Select Sales configuration, product field, and sold quantity field." });
      return;
    }
    if ((product.groupFieldKey ?? "") !== (quantity.groupFieldKey ?? "")) {
      setToast({ type: "error", message: "Sales product and quantity mappings must be in the same repeatable group." });
      return;
    }
    const salesConfig = salesConfigs.find((config) => config.id === linkSalesId);
    if (salesConfig && !salesDesignationsAreSubset(salesConfig)) {
      setToast({ type: "error", message: "Linked Sales designations must be a subset of Stock designations." });
      return;
    }

    setLinkSaving(true);
    try {
      await stockConfigService.linkSalesConfiguration(editor.id, projectId, {
        salesConfigId: linkSalesId,
        product,
        quantity,
      });
      const next = await stockConfigService.get(editor.id, projectId);
      setConfigs((current) => current.map((config) => config.id === next.id ? next : config));
      setLinkSalesId("");
      setToast({ type: "success", message: "Sales configuration linked to Stock." });
    } catch (error) {
      setToast({ type: "error", message: formatApiError(error, "Failed to link Sales configuration") });
    } finally {
      setLinkSaving(false);
    }
  }

  async function unlinkSalesConfiguration(salesConfigId: string) {
    if (!editor.id) return;
    try {
      await stockConfigService.unlinkSalesConfiguration(editor.id, projectId, salesConfigId);
      const next = await stockConfigService.get(editor.id, projectId);
      setConfigs((current) => current.map((config) => config.id === next.id ? next : config));
      setToast({ type: "success", message: "Sales linkage removed." });
    } catch (error) {
      setToast({ type: "error", message: formatApiError(error, "Failed to unlink Sales configuration") });
    }
  }

  const readiness = [
    { label: "Stock UDF schema has at least one field", done: schemaFields.length > 0 },
    { label: "Product field mapping is selected", done: Boolean(editor.productMapping) },
    { label: "Movement quantity field mapping is selected", done: Boolean(editor.quantityMapping) },
    { label: "At least one active Stock Type exists", done: stockTypes.some((type) => type.isActive) },
    { label: "Approval workflow is valid if enabled", done: validate(editor).filter((error) => error.startsWith("Approval")).length === 0 },
  ];

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
          <div className="sales-eyebrow">Stock Module</div>
          <h1>
            {view === "list"
              ? "Stock Configurations"
              : editor.name || "Untitled Stock Configuration"}
          </h1>
          <p>
            {view === "list"
              ? "Each configuration defines stock movement, balance tracking, stock types, approval, and Sales deduction behavior for selected designations."
              : "Configure Stock setup first, then continue to the shared UDF form builder."}
          </p>
        </div>
        {view === "editor" && (
          <button type="button" className="sales-secondary-btn" onClick={() => setView("list")}>
            <ArrowLeft size={16} /> All Configs
          </button>
        )}
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
              <h2>No Stock configurations yet</h2>
              <p>Create the first configuration to expose Stock movement forms to matching designations.</p>
              <button type="button" className="sales-primary-btn" onClick={startCreate}>
                <Plus size={16} /> Create Configuration
              </button>
            </div>
          ) : (
            <div className="sales-config-grid">
              {configs.map((config, index) => (
                <article className="sales-config-card" key={config.id}>
                  <div className="sales-config-main">
                    <div className="sales-config-index">{index + 1}</div>
                    <div>
                      <div className="sales-config-title-row">
                        <h2>{config.name}</h2>
                        <span className={`sales-status ${config.isActive ? "active" : ""}`}>
                          {config.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p>{designationNames(config.applicableDesignations, designations)}</p>
                      <div className="sales-chip-row">
                        <span className="map">{trackingLevelLabels[config.trackingLevel]}</span>
                        {config.fieldMappings.product && <span className="zero">Product mapped</span>}
                        {config.fieldMappings.quantity && <span className="tva">Quantity mapped</span>}
                        {config.approvalWorkflow.isEnabled && (
                          <span className="approval">Approval: {config.approvalWorkflow.levels.length} levels</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="sales-card-actions">
                    {!config.isActive && (
                      <button
                        type="button"
                        className="sales-activation-btn"
                        disabled={activatingId === config.id}
                        onClick={() => void activateConfig(config)}
                        title="Activate configuration"
                      >
                        <Power size={15} />
                        {activatingId === config.id ? "Activating..." : "Activate"}
                      </button>
                    )}
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
              ))}
              <button type="button" className="sales-add-config" onClick={startCreate}>
                <Plus size={18} />
                Add New Stock Configuration
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
              description="Name, designations, and tracking level"
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
                    placeholder="ISP Executive - Stock"
                  />
                </label>
                <label>
                  <span>Tracking Level</span>
                  <select
                    value={editor.trackingLevel}
                    onChange={(event) =>
                      setEditor((current) => ({
                        ...current,
                        trackingLevel: event.target.value as StockTrackingLevel,
                      }))
                    }
                  >
                    <option value="user">User wise</option>
                    <option value="store">Store wise</option>
                    <option value="user_store">User + Store wise</option>
                  </select>
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
              icon={<Boxes size={18} />}
              title="Stock Field Mapping"
              description="Map product and movement quantity from the saved UDF schema"
              open={openSection === "mapping"}
              onToggle={() => setOpenSection((current) => current === "mapping" ? null : "mapping")}
            >
              <div className="sales-fields-grid">
                <label>
                  <span>Stock Product Field</span>
                  <select
                    value={editor.productMapping}
                    disabled={!editor.id || options.length === 0}
                    onChange={(event) => setEditor((current) => ({ ...current, productMapping: event.target.value }))}
                  >
                    <option value="">Select product field</option>
                    {options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label} ({option.type})
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Movement Quantity Field</span>
                  <select
                    value={editor.quantityMapping}
                    disabled={!editor.id || options.length === 0}
                    onChange={(event) => setEditor((current) => ({ ...current, quantityMapping: event.target.value }))}
                  >
                    <option value="">Select quantity field</option>
                    {options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label} ({option.type})
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="sales-section-note">
                {options.length
                  ? "If one field is inside a repeatable group, the other must be inside the same group."
                  : "Save this configuration, build the Stock UDF form, then return here to map product and movement quantity."}
              </p>
            </EditorAccordion>

            <EditorAccordion
              icon={<Layers3 size={18} />}
              title="Stock Types"
              description="Create movement behaviors used by Stock submissions"
              open={openSection === "types"}
              onToggle={() => setOpenSection((current) => current === "types" ? null : "types")}
            >
              <div className="sales-fields-grid">
                <label>
                  <span>Stock Type Name</span>
                  <input
                    value={stockTypeName}
                    maxLength={120}
                    disabled={!editor.id}
                    onChange={(event) => setStockTypeName(event.target.value)}
                    placeholder="Damaged Stock"
                  />
                </label>
                <label>
                  <span>Behavior</span>
                  <select
                    value={stockTypeBehavior}
                    disabled={!editor.id}
                    onChange={(event) => setStockTypeBehavior(event.target.value as StockTypeBehavior)}
                  >
                    {stockTypeBehaviors.map((behavior) => (
                      <option key={behavior} value={behavior}>{stockTypeBehaviorLabels[behavior]}</option>
                    ))}
                  </select>
                </label>
                <div className="sales-field-action">
                  <button
                    type="button"
                    className="sales-primary-btn"
                    disabled={!editor.id || stockTypeSaving}
                    onClick={() => void addStockType()}
                  >
                    <Plus size={16} /> {stockTypeSaving ? "Adding..." : "Add Stock Type"}
                  </button>
                </div>
              </div>
              <div className="sales-level-list">
                {stockTypes.length === 0 ? (
                  <div className="sales-section-note">Save the configuration to view seeded Stock Types or add new ones.</div>
                ) : stockTypes.map((type) => (
                  <div className="sales-level-row" key={type.id}>
                    <span className="sales-level-index">{type.isActive ? "A" : "I"}</span>
                    <strong>{type.name}</strong>
                    <span className={`sales-status ${type.isActive ? "active" : ""}`}>
                      {stockTypeBehaviorLabels[type.behavior]}
                    </span>
                    <button
                      type="button"
                      className="sales-icon-btn danger"
                      disabled={!type.isActive}
                      onClick={() => void deactivateStockType(type)}
                      title="Deactivate Stock Type"
                    >
                      <X size={15} /> Deactivate
                    </button>
                  </div>
                ))}
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
                description="Route Stock submissions through Inbox before balance effects are finalized."
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
                            approverType: event.target.value as StockApprovalLevelRole,
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
                        <option value="">Select approver designation</option>
                        {designations.map((designation) => (
                          <option key={designation.id} value={designation.id}>{designation.name}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={level.autoRejectDays}
                        onChange={(event) => updateLevel(level.id, { autoRejectDays: event.target.value })}
                      />
                      <button
                        type="button"
                        className="sales-icon-btn danger"
                        disabled={editor.levels.length === 1}
                        onClick={() =>
                          setEditor((current) => ({
                            ...current,
                            levels: current.levels.filter((item) => item.id !== level.id),
                          }))
                        }
                        title="Remove approval level"
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
                    <Plus size={15} /> Add Approval Level
                  </button>
                </div>
              )}
            </EditorAccordion>

            <EditorAccordion
              icon={<GitBranch size={18} />}
              title="Sales Linkage"
              description="Deduct or reserve stock from linked Sales submissions"
              open={openSection === "sales"}
              onToggle={() => setOpenSection((current) => current === "sales" ? null : "sales")}
            >
              <div className="sales-fields-grid">
                <label className="wide">
                  <span>Active Sales Configuration</span>
                  <select
                    value={linkSalesId}
                    disabled={!editor.id}
                    onChange={(event) => setLinkSalesId(event.target.value)}
                  >
                    <option value="">Select Sales configuration</option>
                    {salesConfigs.map((config) => (
                      <option key={config.id} value={config.id}>
                        {config.name} - {designationNames(config.applicableDesignations, designations)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Sales Product Field</span>
                  <select
                    value={linkProductMapping}
                    disabled={!linkSalesId || salesOptions.length === 0}
                    onChange={(event) => setLinkProductMapping(event.target.value)}
                  >
                    <option value="">Select product field</option>
                    {salesOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label} ({option.type})</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Sold Quantity Field</span>
                  <select
                    value={linkQuantityMapping}
                    disabled={!linkSalesId || salesOptions.length === 0}
                    onChange={(event) => setLinkQuantityMapping(event.target.value)}
                  >
                    <option value="">Select quantity field</option>
                    {salesOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label} ({option.type})</option>
                    ))}
                  </select>
                </label>
                <div className="sales-field-action">
                  <button
                    type="button"
                    className="sales-primary-btn"
                    disabled={!editor.id || linkSaving}
                    onClick={() => void linkSalesConfiguration()}
                  >
                    <Plus size={16} /> {linkSaving ? "Linking..." : "Link Sales"}
                  </button>
                </div>
              </div>
              <p className="sales-section-note">
                With Sales approval disabled, Stock deducts immediately. With Sales approval enabled, Stock reserves on submission and deducts after final approval.
              </p>
              <div className="sales-level-list">
                {(selectedConfig?.salesLinkages ?? []).length === 0 ? (
                  <div className="sales-section-note">No Sales configurations linked yet.</div>
                ) : selectedConfig?.salesLinkages.map((linkage) => (
                  <div className="sales-level-row" key={linkage.salesConfigId}>
                    <span className="sales-level-index">S</span>
                    <strong>{linkage.salesConfigName || linkage.salesConfigId}</strong>
                    <span className="sales-status active">
                      Product: {mappingToValue(linkage.product) || "Not mapped"}
                    </span>
                    <span className="sales-status">
                      Qty: {mappingToValue(linkage.quantity) || "Not mapped"}
                    </span>
                    <button
                      type="button"
                      className="sales-icon-btn danger"
                      onClick={() => void unlinkSalesConfiguration(linkage.salesConfigId)}
                      title="Unlink Sales configuration"
                    >
                      <X size={15} /> Unlink
                    </button>
                  </div>
                ))}
              </div>
            </EditorAccordion>

            <EditorAccordion
              icon={<CheckCircle2 size={18} />}
              title="Activation Readiness"
              description="Backend gates that must pass before Stock is active"
              open={openSection === "activate"}
              onToggle={() => setOpenSection((current) => current === "activate" ? null : "activate")}
            >
              <div className="sales-level-list">
                {readiness.map((item) => (
                  <div className="sales-level-row" key={item.label}>
                    <span className={`sales-level-index ${item.done ? "active" : ""}`}>
                      {item.done ? "✓" : "!"}
                    </span>
                    <strong>{item.label}</strong>
                  </div>
                ))}
              </div>
            </EditorAccordion>
          </div>

          <div className="sales-savebar">
            <div>
              <button type="button" className="sales-secondary-btn" onClick={() => setView("list")}>
                Cancel
              </button>
            </div>
            <div>
              <button type="button" className="sales-secondary-btn" disabled={saving} onClick={() => void saveConfig()}>
                {saving ? "Saving..." : "Save"}
              </button>
              <button type="button" className="sales-primary-btn" disabled={saving} onClick={() => void saveAndProceed()}>
                Save & Open Form Builder
              </button>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        isOpen={Boolean(confirmDelete)}
        title="Delete Stock configuration?"
        message={
          confirmDelete
            ? `This will delete "${confirmDelete.name}" unless it is the final active Stock configuration.`
            : ""
        }
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => void deleteConfig()}
        onClose={() => setConfirmDelete(null)}
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
          <span className="sales-section-icon">{icon}</span>
          <span>
            <h2>{title}</h2>
            <p>{description}</p>
          </span>
        </div>
        <span className="sales-accordion-chevron">⌄</span>
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
    <label className={`sales-toggle-card ${checked ? "checked" : ""}`}>
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
