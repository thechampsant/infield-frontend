"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Crosshair,
  Download,
  Info,
  Layers,
  Pencil,
  Plus,
  Power,
  Save,
  Target,
  Trash2,
  TrendingUp,
  UploadCloud,
  Users,
  X,
} from "lucide-react";
import { If2Toast, type ToastState } from "@/components/accounts/if2-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  designationService,
  featureConfigService,
  formatApiError,
  salesConfigService,
  targetVsAchievementConfigModuleKey,
  targetVsAchievementService,
  type Designation,
  type SalesConfiguration,
  type TargetAssignmentScope,
  type TargetBasis,
  type TargetFieldOption,
  type TargetFieldReference,
  type TargetPeriodType,
  type TargetVsAchievementConfiguration,
} from "@/lib/api";
import { projectAdminBase } from "@/lib/nav/nav";

type View = "list" | "editor";
type EditorSection =
  | "settings"
  | "measurement"
  | "scope"
  | "product"
  | "focus"
  | "period"
  | "achievement"
  | "upload";
type UploadKind = "target" | "focus";

interface EditorState {
  id?: string;
  name: string;
  salesConfigId: string;
  applicableDesignations: string[];
  targetBasis: TargetBasis;
  assignmentScope: TargetAssignmentScope;
  achievementFieldValue: string;
  productSplitEnabled: boolean;
  salesProductFieldValue: string;
  focusEnabled: boolean;
  periodType: TargetPeriodType;
  fiscalYearStartMonth: string;
}

interface CustomRange {
  id: string;
  from: string;
  to: string;
}

const periodLabels: Record<TargetPeriodType, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  custom: "Custom",
};

const scopeLabels: Record<TargetAssignmentScope, string> = {
  store: "Store-wise",
  user: "User-wise",
};

const sectionMeta: Array<{
  id: EditorSection;
  title: string;
  description: string;
  icon: ReactNode;
  tone: "green" | "blue" | "purple" | "pink" | "yellow" | "orange";
}> = [
  {
    id: "settings",
    title: "Configuration Settings",
    description: "Name and applicable designations",
    icon: <Target size={22} />,
    tone: "green",
  },
  {
    id: "measurement",
    title: "Target Measurement",
    description: "Value-based or volume-based targets",
    icon: <TrendingUp size={22} />,
    tone: "blue",
  },
  {
    id: "scope",
    title: "Target Assignment Scope",
    description: "Store-level or user-level targets",
    icon: <Users size={22} />,
    tone: "purple",
  },
  {
    id: "product",
    title: "Product Hierarchy (Optional)",
    description: "Split targets by a product dimension from Product Master",
    icon: <Layers size={22} />,
    tone: "purple",
  },
  {
    id: "focus",
    title: "Focus Model Targets",
    description: "Track achievement separately for priority SKUs flagged in Product Master",
    icon: <Crosshair size={22} />,
    tone: "pink",
  },
  {
    id: "period",
    title: "Target Period",
    description: "Monthly, quarterly, or custom date ranges",
    icon: <CalendarDays size={22} />,
    tone: "yellow",
  },
  {
    id: "achievement",
    title: "Sales Field for Achievement",
    description: "Select the sales form field used for achievement calculation across mobile & web reports",
    icon: <TrendingUp size={22} />,
    tone: "green",
  },
  {
    id: "upload",
    title: "Target Upload Format",
    description: "Auto-generated template - upload via Uploaders in Masters",
    icon: <UploadCloud size={22} />,
    tone: "orange",
  },
];

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const fallbackAchievementOptions: TargetFieldOption[] = [
  {
    value: "sales_qty",
    fieldKey: "sales_qty",
    label: "Sales Qty",
    type: "quantity",
  },
  {
    value: "sales_value",
    fieldKey: "sales_value",
    label: "Sales Value",
    type: "value",
  },
  {
    value: "mrp_value",
    fieldKey: "mrp_value",
    label: "MRP Value",
    type: "value",
  },
  {
    value: "total_sales_value",
    fieldKey: "total_sales_value",
    label: "Total Sales Value",
    type: "formula",
  },
  {
    value: "net_amount",
    fieldKey: "net_amount",
    label: "Net Amount",
    type: "formula",
  },
  {
    value: "invoice_value",
    fieldKey: "invoice_value",
    label: "Invoice Value",
    type: "value",
  },
];

const fallbackProductOptions: TargetFieldOption[] = [
  { value: "category", fieldKey: "category", label: "Category" },
  { value: "sku_code", fieldKey: "sku_code", label: "SKU Code" },
  { value: "brand", fieldKey: "brand", label: "Brand" },
  { value: "model", fieldKey: "model", label: "Model" },
];

function emptyEditor(): EditorState {
  return {
    name: "",
    salesConfigId: "",
    applicableDesignations: [],
    targetBasis: "value",
    assignmentScope: "store",
    achievementFieldValue: "",
    productSplitEnabled: false,
    salesProductFieldValue: "",
    focusEnabled: false,
    periodType: "monthly",
    fiscalYearStartMonth: "4",
  };
}

function fieldValue(field?: TargetFieldReference): string {
  if (!field?.fieldKey) return "";
  return field.groupFieldKey ? `${field.groupFieldKey}::${field.fieldKey}` : field.fieldKey;
}

function fieldFromValue(value: string, options: TargetFieldOption[]): TargetFieldReference | undefined {
  const option = options.find((item) => item.value === value);
  if (option) {
    return {
      fieldKey: option.fieldKey,
      label: option.label,
      ...(option.groupFieldKey ? { groupFieldKey: option.groupFieldKey } : {}),
    };
  }
  const [groupFieldKey, fieldKey] = value.split("::");
  if (!fieldKey) return value ? { fieldKey: value, label: value } : undefined;
  return { groupFieldKey, fieldKey, label: fieldKey };
}

function fieldOptionBaseValue(option: TargetFieldOption, index: number): string {
  if (option.value) return option.value;
  const fieldPath = [option.groupFieldKey, option.fieldKey].filter(Boolean).join("::");
  if (fieldPath) return fieldPath;
  const labelValue = fieldOptionLabel(option, index).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return labelValue || `field_${index}`;
}

function fieldOptionLabel(option: TargetFieldOption, index: number): string {
  return option.label || option.fieldKey || option.value || `Field ${index + 1}`;
}

function normalizeFieldOptions(options: TargetFieldOption[]): TargetFieldOption[] {
  const seen = new Map<string, number>();
  return options.map((option, index) => {
    const baseValue = fieldOptionBaseValue(option, index);
    const count = seen.get(baseValue) ?? 0;
    seen.set(baseValue, count + 1);
    return {
      ...option,
      label: fieldOptionLabel(option, index),
      value: count === 0 ? baseValue : `${baseValue}__${count}`,
    };
  });
}

function toEditor(config: TargetVsAchievementConfiguration): EditorState {
  return {
    id: config.id,
    name: config.name,
    salesConfigId: config.salesConfigId,
    applicableDesignations: config.applicableDesignations,
    targetBasis: config.targetBasis,
    assignmentScope: config.assignmentScope,
    achievementFieldValue: fieldValue(config.achievementField),
    productSplitEnabled: config.productSplit.enabled,
    salesProductFieldValue: fieldValue(config.salesProductField) || config.productSplit.productFieldKey || "",
    focusEnabled: config.focus.enabled,
    periodType: config.period.type,
    fiscalYearStartMonth: String(config.period.fiscalYearStartMonth || 4),
  };
}

function sameSet(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  const values = new Set(left);
  return right.every((item) => values.has(item));
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

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function chipText(config: TargetVsAchievementConfiguration): string[] {
  const chips = [
    config.targetBasis === "value" ? "₹ Value" : "Volume",
    scopeLabels[config.assignmentScope],
  ];
  if (config.productSplit.enabled) chips.push(config.productSplit.productFieldLabel || "Product split");
  chips.push(periodLabels[config.period.type]);
  if (config.achievementField?.label) chips.push(config.achievementField.label);
  if (config.focus.enabled) chips.push("Focus Models");
  return chips;
}

function toneForChip(chip: string): string {
  if (chip.includes("Value") || chip.includes("Qty")) return "green";
  if (chip.includes("Store") || chip.includes("User")) return "purple";
  if (chip.includes("Category") || chip.includes("SKU") || chip.includes("Product")) return "blue";
  if (chip.includes("Monthly") || chip.includes("Quarterly") || chip.includes("Custom")) return "yellow";
  if (chip.includes("Focus")) return "pink";
  return "slate";
}

function validate(
  editor: EditorState,
  salesConfigs: SalesConfiguration[],
  achievementOptions: TargetFieldOption[],
  productOptions: TargetFieldOption[],
): string[] {
  const errors: string[] = [];
  const salesConfig = salesConfigs.find((config) => config.id === editor.salesConfigId);
  const achievementField = fieldFromValue(editor.achievementFieldValue, achievementOptions);
  const productField = fieldFromValue(editor.salesProductFieldValue, productOptions);

  if (!editor.name.trim()) errors.push("Configuration name is required.");
  if (editor.name.trim().length > 160) errors.push("Configuration name must be 160 characters or fewer.");
  if (!editor.salesConfigId) errors.push("Select a Sales configuration.");
  if (!salesConfig) errors.push("Selected Sales configuration was not found.");
  if (salesConfig && !sameSet(editor.applicableDesignations, salesConfig.applicableDesignations)) {
    errors.push("Applicable designations must exactly match the linked Sales configuration.");
  }
  if (!achievementField) errors.push("Select an achievement field.");
  if (editor.productSplitEnabled && !productField) {
    errors.push("Select the Product Master field when product split is enabled.");
  }
  const fiscalMonth = Number(editor.fiscalYearStartMonth);
  if (!Number.isInteger(fiscalMonth) || fiscalMonth < 1 || fiscalMonth > 12) {
    errors.push("Fiscal year start month must be between 1 and 12.");
  }
  return errors;
}

function quarterGroups(fiscalStartMonth: string) {
  const start = Math.max(1, Math.min(12, Number(fiscalStartMonth) || 4)) - 1;
  return [0, 1, 2, 3].map((quarter) => ({
    label: `Q${quarter + 1}`,
    months: [0, 1, 2].map((offset) => monthNames[(start + quarter * 3 + offset) % 12]),
  }));
}

export function TargetVsAchievementConfigPage({
  projectId,
  accountCode,
  projectCode,
}: {
  projectId: string;
  projectName: string;
  accountCode: string;
  projectCode: string;
}) {
  const [view, setView] = useState<View>("list");
  const [configs, setConfigs] = useState<TargetVsAchievementConfiguration[]>([]);
  const [salesConfigs, setSalesConfigs] = useState<SalesConfiguration[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [achievementOptions, setAchievementOptions] = useState<TargetFieldOption[]>([]);
  const [productOptions, setProductOptions] = useState<TargetFieldOption[]>([]);
  const [editor, setEditor] = useState<EditorState>(emptyEditor);
  const [openSection, setOpenSection] = useState<EditorSection | null>("settings");
  const [customRanges, setCustomRanges] = useState<CustomRange[]>([
    { id: "range_1", from: "1", to: "15" },
    { id: "range_2", from: "16", to: "30" },
  ]);
  const [loading, setLoading] = useState(true);
  const [fieldOptionsLoading, setFieldOptionsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeConfigIds, setActiveConfigIds] = useState<Set<string>>(() => new Set());
  const [togglingConfigId, setTogglingConfigId] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<TargetVsAchievementConfiguration | null>(null);

  const base = projectAdminBase(accountCode, projectCode);
  const selectedSalesConfig = useMemo(
    () => salesConfigs.find((config) => config.id === editor.salesConfigId),
    [editor.salesConfigId, salesConfigs],
  );
  const currentConfig = useMemo(
    () => configs.find((config) => config.id === editor.id) ?? null,
    [configs, editor.id],
  );
  const effectiveAchievementOptions = useMemo(
    () => normalizeFieldOptions(achievementOptions.length ? achievementOptions : fallbackAchievementOptions),
    [achievementOptions],
  );
  const effectiveProductOptions = useMemo(
    () => normalizeFieldOptions(productOptions.length ? productOptions : fallbackProductOptions),
    [productOptions],
  );
  const selectedAchievement = fieldFromValue(editor.achievementFieldValue, effectiveAchievementOptions);
  const selectedProduct = fieldFromValue(editor.salesProductFieldValue, effectiveProductOptions);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [configList, salesList, designationList, featureConfig] = await Promise.all([
        targetVsAchievementService.list(projectId),
        salesConfigService.list(projectId),
        designationService.listByProject(projectId),
        featureConfigService.getRawByProject(projectId),
      ]);
      const activeKeys = new Set(
        featureConfig.modules
          .filter((module) => module.isActive)
          .map((module) => module.key),
      );
      setConfigs(configList);
      setSalesConfigs(salesList);
      setDesignations(designationList);
      setActiveConfigIds(
        new Set(
          configList
            .filter((config) => activeKeys.has(targetVsAchievementConfigModuleKey(config.id)))
            .map((config) => config.id),
        ),
      );
    } catch (error) {
      setToast({
        type: "error",
        message: formatApiError(error, "Failed to load Target vs Achievement configuration"),
      });
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!editor.salesConfigId) {
      setAchievementOptions([]);
      setProductOptions([]);
      return;
    }

    const salesConfig = salesConfigs.find((config) => config.id === editor.salesConfigId);
    if (salesConfig) {
      setEditor((current) =>
        sameSet(current.applicableDesignations, salesConfig.applicableDesignations)
          ? current
          : { ...current, applicableDesignations: [...salesConfig.applicableDesignations] },
      );
    }

    let active = true;
    setFieldOptionsLoading(true);
    Promise.all([
      targetVsAchievementService.getSalesFieldOptions(projectId, editor.salesConfigId),
      targetVsAchievementService.getProductFieldOptions(projectId).catch(() => [] as TargetFieldOption[]),
    ])
      .then(([salesOptions, productMasterOptions]) => {
        if (!active) return;
        setAchievementOptions(salesOptions.achievementFields);
        setProductOptions(productMasterOptions.length ? productMasterOptions : salesOptions.productFields);
      })
      .catch((error) => {
        if (!active) return;
        setToast({ type: "error", message: formatApiError(error, "Failed to load field options") });
        setAchievementOptions([]);
        setProductOptions([]);
      })
      .finally(() => {
        if (active) setFieldOptionsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [editor.salesConfigId, projectId, salesConfigs]);

  function startCreate() {
    setErrors([]);
    setEditor(emptyEditor());
    setOpenSection("settings");
    setView("editor");
  }

  function startEdit(config: TargetVsAchievementConfiguration) {
    setErrors([]);
    setEditor(toEditor(config));
    setOpenSection("settings");
    setView("editor");
  }

  function buildSaveInput() {
    const achievementField = fieldFromValue(editor.achievementFieldValue, effectiveAchievementOptions);
    const salesProductField = fieldFromValue(editor.salesProductFieldValue, effectiveProductOptions);
    const selectedProductOption = effectiveProductOptions.find((option) => option.value === editor.salesProductFieldValue);
    return {
      name: editor.name.trim(),
      salesConfigId: editor.salesConfigId,
      applicableDesignations: editor.applicableDesignations,
      targetBasis: editor.targetBasis,
      assignmentScope: editor.assignmentScope,
      productSplit: {
        enabled: editor.productSplitEnabled,
        ...(editor.productSplitEnabled && salesProductField
          ? {
              productFieldKey: salesProductField.fieldKey,
              productFieldLabel: salesProductField.label,
              productFieldIsUdf: Boolean(selectedProductOption?.isUdf),
            }
          : {}),
      },
      focus: { enabled: editor.focusEnabled },
      period: {
        type: editor.periodType,
        fiscalYearStartMonth: Number(editor.fiscalYearStartMonth),
      },
      achievementField: achievementField as TargetFieldReference,
      ...(editor.productSplitEnabled && salesProductField ? { salesProductField } : {}),
    };
  }

  async function saveConfig() {
    const nextErrors = validate(editor, salesConfigs, effectiveAchievementOptions, effectiveProductOptions);
    setErrors(nextErrors);
    if (nextErrors.length) return;

    setSaving(true);
    try {
      const saved = editor.id
        ? await targetVsAchievementService.update(editor.id, projectId, buildSaveInput())
        : await targetVsAchievementService.create({ ...buildSaveInput(), projectId });
      await load();
      setEditor(toEditor(saved));
      setToast({ type: "success", message: "Target configuration saved." });
    } catch (error) {
      setToast({ type: "error", message: formatApiError(error, "Failed to save Target vs Achievement configuration") });
    } finally {
      setSaving(false);
    }
  }

  async function cloneConfig(config: TargetVsAchievementConfiguration) {
    try {
      await targetVsAchievementService.clone(config.id, projectId);
      await load();
      setToast({ type: "success", message: `Cloned "${config.name}".` });
    } catch (error) {
      setToast({ type: "error", message: formatApiError(error, "Failed to clone Target vs Achievement configuration") });
    }
  }

  async function deleteConfig() {
    if (!confirmDelete) return;
    try {
      await targetVsAchievementService.remove(confirmDelete.id, projectId);
      await load();
      setConfirmDelete(null);
      setToast({ type: "success", message: "Target vs Achievement configuration deleted." });
    } catch (error) {
      setToast({ type: "error", message: formatApiError(error, "Failed to delete Target vs Achievement configuration") });
    }
  }

  async function toggleConfigActivation(config: TargetVsAchievementConfiguration, enabled: boolean) {
    setTogglingConfigId(config.id);
    try {
      await targetVsAchievementService.setActive(config.id, projectId, enabled);
      await load();
      setToast({
        type: "success",
        message: enabled
          ? `${config.name} enabled for matching designations.`
          : `${config.name} disabled.`,
      });
    } catch (error) {
      setToast({
        type: "error",
        message: formatApiError(
          error,
          enabled
            ? "Target vs Achievement configuration could not be activated. Complete the setup requirements first."
            : "Target vs Achievement configuration could not be disabled.",
        ),
      });
    } finally {
      setTogglingConfigId(null);
    }
  }

  async function downloadTemplate(config: TargetVsAchievementConfiguration | null, kind: UploadKind) {
    if (!config) {
      setToast({ type: "error", message: "Save this configuration before downloading a template." });
      return;
    }
    try {
      const blob = kind === "target"
        ? await targetVsAchievementService.downloadTargetTemplate(config.id, projectId)
        : await targetVsAchievementService.downloadFocusTemplate(config.id, projectId);
      downloadBlob(blob, `${config.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${kind}-template.xlsx`);
    } catch (error) {
      setToast({ type: "error", message: formatApiError(error, "Failed to download template") });
    }
  }

  function updateRange(id: string, patch: Partial<CustomRange>) {
    setCustomRanges((current) => current.map((range) => (range.id === id ? { ...range, ...patch } : range)));
  }

  function addRange() {
    setCustomRanges((current) => [
      ...current,
      { id: `range_${Date.now()}`, from: "", to: "" },
    ]);
  }

  if (loading) {
    return (
      <div className="tva-workspace min-h-[70vh] space-y-4 rounded-xl p-5">
        <div className="h-24 rounded-xl bg-white shadow-sm" />
        <div className="h-32 rounded-xl bg-white shadow-sm" />
      </div>
    );
  }

  return (
    <div className="tva-workspace min-h-[calc(100vh-8rem)] rounded-xl p-5">
      <div className="space-y-5">
        <div className="pa-page-header mb-0">
          <div>
            <div className="pa-eyebrow">Target vs Achievement</div>
            <div className="pa-page-title">
              {view === "list" ? "Target Configurations" : editor.name || "New Target Configuration"}
            </div>
            <div className="pa-page-desc max-w-5xl">
              {view === "list"
                ? "Each configuration defines how targets are structured and measured for a set of designations. Linked to the Sales module for automatic achievement calculation."
                : "Define target structure, upload format, and mobile display settings."}
            </div>
          </div>
          {view === "editor" && (
            <button type="button" className="btn btn-secondary" onClick={() => setView("list")}>
              <ArrowLeft size={14} /> All Configs
            </button>
          )}
        </div>

        {view === "list" && (
          <Link href={`${base}/modules`} className="btn btn-secondary w-fit">
            <ArrowLeft size={14} /> Back to Modules
          </Link>
        )}

        <TargetStepper />

        {view === "list" ? (
          <div className="space-y-4">
            {configs.length === 0 ? (
              <button type="button" className="tva-add-card h-24" onClick={startCreate}>
                <Plus size={18} /> Add New Target Configuration
              </button>
            ) : (
              <>
                {configs.map((config, index) => (
                  <ConfigListCard
                    key={config.id}
                    config={config}
                    index={index}
                    active={activeConfigIds.has(config.id)}
                    toggling={togglingConfigId === config.id}
                    designationLabel={designationNames(config.applicableDesignations, designations)}
                    onEdit={() => startEdit(config)}
                    onToggleActive={(enabled) => void toggleConfigActivation(config, enabled)}
                    onClone={() => void cloneConfig(config)}
                    onDelete={() => setConfirmDelete(config)}
                  />
                ))}
                <button type="button" className="tva-add-card h-20" onClick={startCreate}>
                  <Plus size={18} /> Add New Target Configuration
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            {errors.length > 0 && (
              <div className="rounded-lg border border-[#fecaca] bg-[#fef2f2] p-3 text-xs font-semibold text-[#b42318]">
                {errors.map((error) => <div key={error}>{error}</div>)}
              </div>
            )}

            <div className="space-y-4 pb-24">
              {sectionMeta.map((section) => (
                <SectionCard
                  key={section.id}
                  icon={section.icon}
                  tone={section.tone}
                  title={section.title}
                  description={section.description}
                  open={openSection === section.id}
                  onToggle={() => setOpenSection(openSection === section.id ? null : section.id)}
                >
                  {section.id === "settings" && (
                    <div className="space-y-4">
                      <label className="tva-field">
                        <span>Sales Configuration *</span>
                        <select
                          value={editor.salesConfigId}
                          onChange={(event) =>
                            setEditor((current) => ({
                              ...current,
                              salesConfigId: event.target.value,
                              achievementFieldValue: "",
                              salesProductFieldValue: "",
                            }))
                          }
                        >
                          <option value="">Select Sales configuration</option>
                          {salesConfigs.map((config) => (
                            <option key={config.id} value={config.id}>{config.name}</option>
                          ))}
                        </select>
                      </label>
                      <label className="tva-field">
                        <span>Configuration Name <strong>*</strong></span>
                        <input
                          value={editor.name}
                          maxLength={160}
                          onChange={(event) => setEditor((current) => ({ ...current, name: event.target.value }))}
                          placeholder="ISP Executive - Monthly Store Targets"
                        />
                      </label>
                      <div className="tva-field">
                        <span>Applicable Designations</span>
                        <div className="min-h-12 rounded-lg border border-[#d8e4f1] bg-white px-3 py-2.5">
                          {selectedSalesConfig ? (
                            <div className="flex flex-wrap gap-2">
                              {selectedSalesConfig.applicableDesignations.map((id) => (
                                <span key={id} className="inline-flex items-center gap-2 rounded-full border border-[#cfe4ff] bg-[#eff7ff] px-2.5 py-1 text-xs font-bold text-[#2166b1]">
                                  {designations.find((designation) => designation.id === id)?.name || id}
                                  <X size={12} />
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs font-medium text-[#8aa2c0]">Select a Sales configuration to sync designations.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {section.id === "measurement" && (
                    <div className="space-y-3">
                      <FieldLabel>Target Type *</FieldLabel>
                      <div className="grid gap-3 lg:grid-cols-2">
                        <ChoiceTile
                          selected={editor.targetBasis === "value"}
                          title="Value Based (₹)"
                          description="Track in monetary value. Best for revenue goals."
                          onClick={() => setEditor((current) => ({ ...current, targetBasis: "value" }))}
                        />
                        <ChoiceTile
                          selected={editor.targetBasis === "volume"}
                          title="Volume Based (Units)"
                          description="Track in unit quantities. Best for distribution goals."
                          onClick={() => setEditor((current) => ({ ...current, targetBasis: "volume" }))}
                        />
                      </div>
                    </div>
                  )}

                  {section.id === "scope" && (
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <FieldLabel>Assignment Level *</FieldLabel>
                        <div className="grid gap-3 lg:grid-cols-2">
                          <ChoiceTile
                            selected={editor.assignmentScope === "store"}
                            title="Store-wise"
                            description="Targets per store. Aggregated to user via mapping."
                            onClick={() => setEditor((current) => ({ ...current, assignmentScope: "store" }))}
                          />
                          <ChoiceTile
                            selected={editor.assignmentScope === "user"}
                            title="User-wise"
                            description="Targets directly to employees."
                            onClick={() => setEditor((current) => ({ ...current, assignmentScope: "user" }))}
                          />
                        </div>
                      </div>
                      {editor.assignmentScope === "store" && (
                        <WarningBanner>
                          <strong>Requires upload:</strong> User-Store Mapping must be uploaded under <strong>Uploaders</strong> for store-level aggregation.
                        </WarningBanner>
                      )}
                    </div>
                  )}

                  {section.id === "product" && (
                    <div className="space-y-4">
                      <ToggleRow
                        checked={editor.productSplitEnabled}
                        title="Enable Product-Level Target Split"
                        description="When disabled, targets are set at store level only without any product breakdown."
                        onChange={(checked) => setEditor((current) => ({ ...current, productSplitEnabled: checked }))}
                      />
                      {editor.productSplitEnabled && (
                        <>
                          <label className="tva-field max-w-xl">
                            <span>Product Master Field <strong>*</strong></span>
                            <small>Select which field from the Product Master to use for target split</small>
                            <select
                              value={editor.salesProductFieldValue}
                              disabled={!editor.salesConfigId || fieldOptionsLoading}
                              onChange={(event) => setEditor((current) => ({ ...current, salesProductFieldValue: event.target.value }))}
                            >
                              <option value="">{fieldOptionsLoading ? "Loading fields..." : "Select field"}</option>
                              {effectiveProductOptions.map((field, index) => (
                                <option key={field.value} value={field.value}>{fieldOptionLabel(field, index)}</option>
                              ))}
                            </select>
                          </label>
                          <div className="tva-summary-strip">
                            <span>Target split on:</span>
                            <ConfigChip tone="blue">Store</ConfigChip>
                            <X size={17} className="text-[#c5d4e6]" />
                            <ConfigChip tone="purple">{selectedProduct?.label || "Product field"}</ConfigChip>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {section.id === "focus" && (
                    <div className="space-y-4">
                      <ToggleRow
                        checked={editor.focusEnabled}
                        title="Enable Focus Model Targets"
                        description="Track a separate lumpsum target for SKUs flagged as Focus = Yes in Product Master."
                        onChange={(checked) => setEditor((current) => ({ ...current, focusEnabled: checked }))}
                      />
                      <InfoBanner>
                        <strong>Inclusive model:</strong> Focus targets are a subset of the overall target. All focus SKU sales count toward both the overall achievement and the focus achievement. Example: Store target = ₹1L, Focus target = ₹50K. If focus sales = ₹40K and total sales = ₹85K {"->"} Overall Ach = 85%, Focus Ach = 80%.
                      </InfoBanner>
                      <div className="rounded-lg border border-[#d9e5f2] bg-[#f7f9fc] p-4 text-xs leading-6 text-[#445b78]">
                        <h3 className="text-sm font-extrabold text-[var(--text)]">Achievement Formulas</h3>
                        <p className="mt-2"><strong>Overall Ach %</strong> = Total Sales (all SKUs) ÷ Overall Target × 100</p>
                        <p><strong>Focus Ach %</strong> = Sales of Focus-flagged SKUs only ÷ Focus Target × 100</p>
                      </div>
                      <WarningBanner>
                        <strong>Validation Rule</strong><br />
                        Focus Target must be ≤ Overall Target for each store. Rows violating this will be rejected during upload.
                      </WarningBanner>
                      <div className="rounded-lg border border-[#d9e5f2] bg-[#f7f9fc] p-4 text-xs leading-6 text-[#445b78]">
                        <h3 className="text-sm font-extrabold text-[var(--text)]">Upload</h3>
                        Focus targets are uploaded separately via <strong>Uploaders {"->"} Focus Target Master</strong>. The format is simpler - just Store ID, Focus Target, and period columns. See the Upload Format section below for the auto-generated template.
                      </div>
                      <div className="rounded-lg border border-[#d9b8ff] bg-[#f3e8ff] p-4 text-xs font-semibold leading-6 text-[#6b2db5]">
                        <strong>Focus Flag Timing</strong><br />
                        Changes to the Focus flag (Yes/No) in Product Master take effect from the <strong>next target period</strong> only. Mid-period changes are held until the current period ends to maintain calculation consistency.
                      </div>
                    </div>
                  )}

                  {section.id === "period" && (
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <FieldLabel>Period Type *</FieldLabel>
                        <ChoiceTile
                          selected={editor.periodType === "monthly"}
                          title="Monthly"
                          description="Separate targets per calendar month."
                          onClick={() => setEditor((current) => ({ ...current, periodType: "monthly" }))}
                        />
                        <ChoiceTile
                          selected={editor.periodType === "quarterly"}
                          title="Quarterly"
                          description="Targets per quarter. Define quarter months below."
                          onClick={() => setEditor((current) => ({ ...current, periodType: "quarterly" }))}
                        />
                        <ChoiceTile
                          selected={editor.periodType === "custom"}
                          title="Custom Date Ranges"
                          description="Define custom periods (e.g. 1st-15th, 16th-30th). Achievement calculated based on uploaded date ranges."
                          onClick={() => setEditor((current) => ({ ...current, periodType: "custom" }))}
                        />
                      </div>

                      {editor.periodType === "quarterly" && (
                        <div className="space-y-5">
                          <div>
                            <FieldLabel>Fiscal Year Start</FieldLabel>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {monthNames.map((month, index) => (
                                <button
                                  key={month}
                                  type="button"
                                  className={`h-9 min-w-14 rounded-lg border px-3 text-xs font-extrabold ${
                                    editor.fiscalYearStartMonth === String(index + 1)
                                      ? "border-[#2166b1] bg-[#2166b1] text-white"
                                      : "border-[#d8e4f1] bg-white text-[#425776] hover:border-[#2166b1]"
                                  }`}
                                  onClick={() => setEditor((current) => ({ ...current, fiscalYearStartMonth: String(index + 1) }))}
                                >
                                  {month}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <FieldLabel>Quarter Definition</FieldLabel>
                            <p className="mt-1 text-xs font-medium text-[#8aa2c0]">
                              Fiscal year from {monthNames[(Number(editor.fiscalYearStartMonth) || 4) - 1]}
                            </p>
                            <div className="mt-3 grid gap-3 lg:grid-cols-4">
                              {quarterGroups(editor.fiscalYearStartMonth).map((quarter) => (
                                <div key={quarter.label} className="rounded-lg border border-[#cfe4ff] bg-[#eff7ff] p-4 text-center">
                                  <h3 className="text-base font-extrabold text-[#2166b1]">{quarter.label}</h3>
                                  <div className="mt-3 space-y-2">
                                    {quarter.months.map((month) => (
                                      <div key={month} className="rounded-md bg-white py-1.5 text-xs font-bold text-[#425776]">{month}</div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {editor.periodType === "custom" && (
                        <div className="space-y-4">
                          <InfoBanner>
                            Custom ranges let you define how the month is split. The upload template will include <strong>From Date</strong> and <strong>To Date</strong> columns. Achievement is calculated against the matching range.
                          </InfoBanner>
                          <div>
                            <FieldLabel>Custom Date Ranges</FieldLabel>
                            <p className="mt-1 text-xs font-medium text-[#8aa2c0]">Define date-of-month splits. Example: 1-15 and 16-30.</p>
                          </div>
                          <div className="space-y-3">
                            {customRanges.map((range, index) => (
                              <div key={range.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-[#d8e4f1] bg-white p-3">
                                <span className="text-sm font-extrabold text-[var(--text)]">Range {index + 1}</span>
                                <span className="text-xs font-semibold text-[#8aa2c0]">From day</span>
                                <input className="tva-small-input" value={range.from} onChange={(event) => updateRange(range.id, { from: event.target.value })} />
                                <span className="text-xs font-semibold text-[#8aa2c0]">to day</span>
                                <input className="tva-small-input" value={range.to} onChange={(event) => updateRange(range.id, { to: event.target.value })} />
                                <button
                                  type="button"
                                  className="ml-auto flex h-9 w-9 items-center justify-center rounded-md text-[#ff4d4d] hover:bg-[#fff1f1]"
                                  onClick={() => setCustomRanges((current) => current.filter((item) => item.id !== range.id))}
                                  title="Remove range"
                                >
                                  <X size={18} />
                                </button>
                              </div>
                            ))}
                          </div>
                          <button type="button" className="btn btn-secondary" onClick={addRange}>
                            <Plus size={14} /> Add Range
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {section.id === "achievement" && (
                    <div className="space-y-4">
                      <InfoBanner>
                        This setting determines how achievement is computed against targets. It applies to <strong>both the mobile Tgt vs Ach screen and web-based reports</strong>. Fields below are sourced from the <strong>Sales Form Builder</strong> configuration.
                      </InfoBanner>
                      <div>
                        <FieldLabel>Select Sales Form Field *</FieldLabel>
                        <p className="mt-1 text-xs font-medium text-[#8aa2c0]">
                          Choose which field from the sales form to use. Only value, quantity, and formula fields from the configured sales form are shown.
                        </p>
                      </div>
                      <div className="space-y-3">
                        {fieldOptionsLoading ? (
                          <div className="rounded-lg border border-[#d8e4f1] bg-white p-4 text-xs font-semibold text-[#7f99bd]">
                            Loading sales fields...
                          </div>
                        ) : effectiveAchievementOptions.length > 0 ? (
                          effectiveAchievementOptions.map((field, index) => (
                            <AchievementOptionRow
                              key={field.value}
                              field={field}
                              index={index}
                              selected={editor.achievementFieldValue === field.value}
                              onClick={() => setEditor((current) => ({ ...current, achievementFieldValue: field.value }))}
                            />
                          ))
                        ) : (
                          <div className="rounded-lg border border-[#ffdc83] bg-[#fff3bf] p-4 text-xs font-semibold leading-6 text-[#a34d15]">
                            No value, quantity, or formula fields were returned for the selected Sales configuration.
                          </div>
                        )}
                      </div>
                      <div className="rounded-lg border border-[#bdebdc] bg-[#e6f7f1] p-4 text-xs leading-6 text-[#087456]">
                        <h3 className="text-sm font-extrabold">Achievement Calculation</h3>
                        <p className="mt-1"><strong>Achievement</strong> = <em>{selectedAchievement?.label || "Selected Sales Field"}</em> (from sales entries)</p>
                        <p><strong>Achievement %</strong> = ( <em>{selectedAchievement?.label || "Selected Sales Field"}</em> ÷ Target ) × 100</p>
                      </div>
                    </div>
                  )}

                  {section.id === "upload" && (
                    <div className="space-y-4">
                      <WarningBanner>
                        Columns are <strong>auto-generated</strong> from your selections. Download the template and upload it via <strong>Uploaders {"->"} Target Master</strong>.
                      </WarningBanner>
                      <div className="flex flex-wrap gap-2">
                        <ConfigChip tone="green">{editor.targetBasis === "value" ? "₹ Value" : "Volume"}</ConfigChip>
                        <ConfigChip tone="purple">{scopeLabels[editor.assignmentScope]}</ConfigChip>
                        {editor.productSplitEnabled && <ConfigChip tone="blue">{selectedProduct?.label || "Product"}</ConfigChip>}
                        <ConfigChip tone="yellow">{periodLabels[editor.periodType]}</ConfigChip>
                      </div>
                      <TemplatePreview
                        targetBasis={editor.targetBasis}
                        productLabel={editor.productSplitEnabled ? selectedProduct?.label : undefined}
                        periodType={editor.periodType}
                        focus={false}
                      />
                      <button type="button" className="btn btn-secondary" onClick={() => void downloadTemplate(currentConfig, "target")}>
                        <Download size={14} /> Download Template (.xlsx)
                      </button>
                      {editor.focusEnabled && (
                        <>
                          <div className="border-t border-[#dbe6f3]" />
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-3">
                              <ConfigChip tone="pink">Focus Target Upload</ConfigChip>
                              <h3 className="text-sm font-extrabold text-[var(--text)]">Separate template for focus lumpsum targets</h3>
                            </div>
                            <p className="text-xs font-medium leading-6 text-[#7f99bd]">
                              This is a simpler format - always at store level without product breakdown. Upload via <strong>Uploaders {"->"} Focus Target Master</strong>.
                            </p>
                          </div>
                          <TemplatePreview
                            targetBasis={editor.targetBasis}
                            periodType={editor.periodType}
                            focus
                          />
                          <button type="button" className="btn btn-secondary" onClick={() => void downloadTemplate(currentConfig, "focus")}>
                            <Download size={14} /> Download Focus Template (.xlsx)
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </SectionCard>
              ))}
            </div>

            <div className="sticky bottom-0 z-20 -mx-5 border-t border-[#dbe6f3] bg-white/95 px-5 py-3 shadow-[0_-8px_24px_rgba(31,67,114,0.08)] backdrop-blur">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#7f99bd]">
                  <Check size={14} className="text-[#10b981]" /> All changes saved
                </div>
                <button type="button" className="btn btn-primary min-w-48" disabled={saving} onClick={() => void saveConfig()}>
                  <Save size={14} /> {saving ? "Saving..." : "Save Configuration"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={Boolean(confirmDelete)}
        title="Delete Target vs Achievement configuration?"
        message="Deletion is blocked by the backend if this is the only active Target vs Achievement configuration."
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

function TargetStepper() {
  return (
    <div className="tva-stepper">
      <span className="tva-stepper-num active">1</span>
      <span className="text-[#087456]">Target Structure</span>
      <span className="text-[#cbd8e8]">{"->"}</span>
      <span className="tva-stepper-num">2</span>
      <span className="text-[#7f99bd]">Upload via Masters</span>
    </div>
  );
}

function ConfigListCard({
  config,
  index,
  active,
  toggling,
  designationLabel,
  onEdit,
  onToggleActive,
  onClone,
  onDelete,
}: {
  config: TargetVsAchievementConfiguration;
  index: number;
  active: boolean;
  toggling: boolean;
  designationLabel: string;
  onEdit: () => void;
  onToggleActive: (enabled: boolean) => void;
  onClone: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="tva-section-card px-4 py-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#008b67] text-base font-extrabold text-white">
            {index + 1}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-[15px] font-extrabold text-[var(--text)]">{config.name}</h2>
              <span className={`tva-status-pill ${active ? "active" : ""}`}>
                {active ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="mt-1 text-xs font-semibold text-[#7f99bd]">{designationLabel}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {chipText(config).map((chip) => (
                <ConfigChip key={chip} tone={toneForChip(chip)}>{chip}</ConfigChip>
              ))}
            </div>
          </div>
        </div>
        <div className="sales-card-actions flex lg:shrink-0">
          <button
            type="button"
            className={`sales-activation-btn ${active ? "active" : ""}`}
            disabled={toggling}
            onClick={() => onToggleActive(!active)}
            title={active ? "Disable configuration" : "Enable configuration"}
          >
            <Power size={15} />
            {toggling ? "Saving..." : active ? "Disable" : "Enable"}
          </button>
          <button type="button" onClick={onEdit} title="Edit">
            <Pencil size={15} /> Edit
          </button>
          <button type="button" onClick={onClone} title="Clone">
            <Copy size={15} /> Clone
          </button>
          <button type="button" className="danger" onClick={onDelete} title="Delete">
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </article>
  );
}

function SectionCard({
  icon,
  tone,
  title,
  description,
  open,
  onToggle,
  children,
}: {
  icon: ReactNode;
  tone: "green" | "blue" | "purple" | "pink" | "yellow" | "orange";
  title: string;
  description: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="tva-section-card overflow-hidden">
      <button type="button" className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left" onClick={onToggle}>
        <div className="flex min-w-0 items-center gap-4">
          <div className={`tva-section-icon tva-tone-${tone}`}>{icon}</div>
          <div className="min-w-0">
            <h2 className="text-[15px] font-extrabold leading-tight text-[var(--text)]">{title}</h2>
            <p className="mt-1 text-xs font-semibold leading-5 text-[#7f99bd]">{description}</p>
          </div>
        </div>
        <span className="shrink-0 text-[#7f99bd]">{open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</span>
      </button>
      {open && <div className="border-t border-[#dbe6f3] px-4 py-4">{children}</div>}
    </section>
  );
}

function ChoiceTile({
  selected,
  title,
  description,
  onClick,
}: {
  selected: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className={`tva-choice-card ${selected ? "selected" : ""}`} onClick={onClick}>
      <span className="tva-radio-dot">{selected && <span />}</span>
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
    </button>
  );
}

function ToggleRow({
  checked,
  title,
  description,
  onChange,
}: {
  checked: boolean;
  title: string;
  description: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button type="button" className="tva-toggle-row" onClick={() => onChange(!checked)}>
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <span className={`tva-switch ${checked ? "on" : ""}`} aria-hidden="true"><span /></span>
    </button>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <h3 className="text-sm font-extrabold text-[#425776]">{children}</h3>;
}

function InfoBanner({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-lg border border-[#cfe4ff] bg-[#eff7ff] p-3 text-xs font-semibold leading-6 text-[#2166b1]">
      <Info size={16} className="mt-1 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

function WarningBanner({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-lg border border-[#ffdc83] bg-[#fff3bf] p-3 text-xs font-semibold leading-6 text-[#a34d15]">
      <AlertTriangle size={16} className="mt-1 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

function ConfigChip({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className={`tva-chip tva-chip-${tone}`}>{children}</span>;
}

function AchievementOptionRow({
  field,
  index,
  selected,
  onClick,
}: {
  field: TargetFieldOption;
  index: number;
  selected: boolean;
  onClick: () => void;
}) {
  const type = field.type || "value";
  const tone = type.toLowerCase().includes("formula") ? "purple" : type.toLowerCase().includes("quantity") ? "yellow" : "green";
  const label = fieldOptionLabel(field, index);
  return (
    <button type="button" className={`tva-choice-card w-full ${selected ? "selected" : ""}`} onClick={onClick}>
      <span className="tva-radio-dot">{selected && <span />}</span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-3">
          <strong>{label}</strong>
          <ConfigChip tone={tone}>{type.charAt(0).toUpperCase() + type.slice(1)}</ConfigChip>
        </span>
        <small>{achievementDescription(field)}</small>
      </span>
    </button>
  );
}

function achievementDescription(field: TargetFieldOption): string {
  const key = `${field.label} ${field.type || ""}`.toLowerCase();
  if (key.includes("qty") || key.includes("quantity")) return "Unit quantity entered per line item";
  if (key.includes("formula") || key.includes("total")) return "Auto-calculated from form formula";
  if (key.includes("mrp")) return "MRP-based value from Product Master";
  if (key.includes("invoice")) return "Invoice-level total entered by user";
  return "Per-line item value entered by field user";
}

function TemplatePreview({
  targetBasis,
  productLabel,
  periodType,
  focus,
}: {
  targetBasis: TargetBasis;
  productLabel?: string;
  periodType: TargetPeriodType;
  focus: boolean;
}) {
  const columns = ["Store ID"];
  if (productLabel && !focus) columns.push(productLabel);
  columns.push(focus ? "Focus Target Value" : targetBasis === "value" ? "Target Value" : "Target Units");
  if (periodType === "custom") columns.push("From Date", "To Date");
  columns.push("Month", "Year");

  return (
    <div className="overflow-hidden rounded-xl border border-[#dbe6f3]">
      <table className="tva-table">
        <thead>
          <tr>
            {columns.map((column) => <th key={column}>{column}</th>)}
          </tr>
        </thead>
        <tbody>
          {[0, 1, 2].map((row) => (
            <tr key={row}>
              {columns.map((column) => <td key={column}>{sampleValue(column, focus)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function sampleValue(column: string, focus: boolean): string {
  const normalized = column.toLowerCase();
  if (normalized.includes("store")) return "STR-001";
  if (normalized.includes("category")) return "Beverages";
  if (normalized.includes("sku")) return "SKU-001";
  if (normalized.includes("brand")) return "Brand A";
  if (normalized.includes("model")) return "Model A";
  if (normalized.includes("focus")) return "50000";
  if (normalized.includes("target")) return focus ? "50000" : "150000";
  if (normalized.includes("from")) return "01";
  if (normalized.includes("to")) return "15";
  if (normalized.includes("month")) return "Apr";
  if (normalized.includes("year")) return "2026";
  return "Beverages";
}
