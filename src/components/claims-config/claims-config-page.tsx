"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CircleAlert,
  Copy,
  FolderKanban,
  Pencil,
  Plus,
  Trash2,
  ChevronDown,
  UserRound,
} from "lucide-react";
import {
  claimsConfigService,
  designationService,
  featureWizardService,
  formatApiError,
  getWizardFlow,
  type ClaimApprovalMode,
  type ClaimConditionalCapCondition,
  type ClaimsTemplateDocument,
  type Designation,
  type FeatureWizardDocument,
  type UdfSchemaField,
} from "@/lib/api";
import { If2Toast, type ToastState } from "@/components/accounts/if2-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { projectAdminBase } from "@/lib/nav/nav";
import { ClaimsFormBuilder } from "./claims-form-builder";

type ViewMode = "list" | "editor" | "builder";
type EditorPanel = "settings" | "window" | "types" | "approval";
type TimeWindowMode = "tminus" | "date-range";

type EditorCondition = {
  id: string;
  conditionField: string;
  operator: ClaimConditionalCapCondition["operator"];
  conditionValue: string;
  capAmount: string;
  order: string;
};

type EditorApprovalLevel = {
  id: string;
  order: string;
  designationId: string;
  mode: ClaimApprovalMode;
};

type EditorClaimType = {
  id: string;
  name: string;
  active: boolean;
  capType: "fixed" | "conditional" | "no-cap";
  fixedCap: string;
  conditionalDefaultCap: string;
  conditionalField: string;
  conditions: EditorCondition[];
  iconUrl: string;
  expanded: boolean;
};

type EditorTemplate = {
  id: string;
  templateName: string;
  designationIds: string[];
  isModuleEnabled: boolean;
  backdateEnabled: boolean;
  backdateDays: string;
  approvalEnabled: boolean;
  approvalLevels: EditorApprovalLevel[];
  claimTypes: EditorClaimType[];
};

const CLAIMS_DRAFT_STORAGE_PREFIX = "claims-template-draft";
function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function createEmptyCondition(index: number): EditorCondition {
  return {
    id: makeId("cond"),
    conditionField: "",
    operator: "eq",
    conditionValue: "",
    capAmount: "",
    order: String(index + 1),
  };
}

function createEmptyApprovalLevel(index: number): EditorApprovalLevel {
  return {
    id: makeId("approval"),
    order: String(index + 1),
    designationId: "",
    mode: "Both",
  };
}

function createEmptyClaimType(): EditorClaimType {
  return {
    id: makeId("claim_type"),
    name: "",
    active: true,
    capType: "fixed",
    fixedCap: "1000",
    conditionalDefaultCap: "1000",
    conditionalField: "",
    conditions: [],
    iconUrl: "",
    expanded: true,
  };
}

function createEmptyTemplate(): EditorTemplate {
  return {
    id: "",
    templateName: "",
    designationIds: [],
    isModuleEnabled: true,
    backdateEnabled: true,
    backdateDays: "7",
    approvalEnabled: false,
    approvalLevels: [],
    claimTypes: [createEmptyClaimType()],
  };
}

function toEditorTemplate(template: ClaimsTemplateDocument | null): EditorTemplate {
  if (!template) return createEmptyTemplate();
  return {
    id: template.id,
    templateName: template.templateName,
    designationIds: template.applicableDesignations,
    isModuleEnabled: template.isModuleEnabled,
    backdateEnabled: template.backdateConfig?.isEnabled ?? false,
    backdateDays:
      typeof template.backdateConfig?.allowedDays === "number" && template.backdateConfig.allowedDays > 0
        ? String(template.backdateConfig.allowedDays)
        : "7",
    approvalEnabled: false,
    approvalLevels: [],
    claimTypes:
      template.claimTypes.length > 0
        ? template.claimTypes.map((claimType) => ({
            id: claimType.id,
            name: claimType.name,
            active: claimType.isActive,
            capType: claimType.capType,
            fixedCap:
              typeof claimType.fixedCap === "number" ? String(claimType.fixedCap) : "1000",
            conditionalDefaultCap:
              typeof claimType.conditionalCap?.defaultCap === "number"
                ? String(claimType.conditionalCap.defaultCap)
                : "1000",
            conditionalField: claimType.conditionalCap?.conditions[0]?.conditionField ?? "",
            conditions:
              claimType.conditionalCap?.conditions.map((condition, index) => ({
                id: makeId("cond"),
                conditionField: condition.conditionField,
                operator: condition.operator,
                conditionValue: condition.conditionValue,
                capAmount: String(condition.capAmount),
                order: String(condition.order ?? index + 1),
              })) ?? [],
            iconUrl: claimType.iconUrl ?? "",
            expanded: false,
          }))
        : [createEmptyClaimType()],
  };
}

function normalizeClaimTypeSchemaKey(projectId: string, templateId: string, claimTypeId: string): string {
  return `${projectId}_${templateId}_${claimTypeId}`;
}

function storageKey(projectId: string, templateId: string): string {
  return `${CLAIMS_DRAFT_STORAGE_PREFIX}:${projectId}:${templateId}`;
}

function loadDraftClaimTypes(projectId: string, templateId: string): EditorClaimType[] | null {
  if (typeof window === "undefined" || !templateId) return null;
  const raw = window.localStorage.getItem(storageKey(projectId, templateId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { claimTypes?: EditorClaimType[] } | null;
    return Array.isArray(parsed?.claimTypes) ? parsed!.claimTypes : null;
  } catch {
    return null;
  }
}

function persistDraftClaimTypes(projectId: string, templateId: string, claimTypes: EditorClaimType[]) {
  if (typeof window === "undefined" || !templateId) return;
  window.localStorage.setItem(storageKey(projectId, templateId), JSON.stringify({ claimTypes }));
}

function removeDraftClaimTypes(projectId: string, templateId: string) {
  if (typeof window === "undefined" || !templateId) return;
  window.localStorage.removeItem(storageKey(projectId, templateId));
}

function flowCompletion(flow: FeatureWizardDocument["flows"][number] | null): {
  completed: number;
  total: number;
} {
  if (!flow) return { completed: 0, total: 0 };
  return {
    completed: flow.steps.filter((step) => step.status === "COMPLETED").length,
    total: flow.steps.length,
  };
}

function validateTemplate(template: EditorTemplate): string[] {
  const errors: string[] = [];
  if (!template.templateName.trim()) errors.push("Configuration name is required.");
  if (template.designationIds.length === 0) {
    errors.push("Select at least one designation.");
  }
  if (template.backdateEnabled) {
    const days = Number(template.backdateDays);
    if (!Number.isFinite(days) || days <= 0 || !Number.isInteger(days)) {
      errors.push("Backdate days must be a positive whole number.");
    }
  }
  if (template.approvalEnabled && template.approvalLevels.length === 0) {
    errors.push("Add at least one approval level or disable approval.");
  }
  return errors;
}

function validateClaimTypes(claimTypes: EditorClaimType[]): string[] {
  const errors: string[] = [];
  const names = new Set<string>();
  claimTypes.forEach((claimType, index) => {
    const name = claimType.name.trim();
    if (!name) errors.push(`Claim type ${index + 1}: name is required.`);
    const normalized = name.toLowerCase();
    if (normalized && names.has(normalized)) {
      errors.push(`Claim type ${index + 1}: duplicate name "${name}".`);
    }
    names.add(normalized);

    if (claimType.capType === "fixed") {
      const fixedCap = Number(claimType.fixedCap);
      if (!Number.isFinite(fixedCap) || fixedCap <= 0) {
        errors.push(`${name || `Claim type ${index + 1}`}: fixed cap must be positive.`);
      }
    }

    if (claimType.capType === "conditional") {
      if (!claimType.conditionalField.trim()) {
        errors.push(`${name || `Claim type ${index + 1}`}: condition field name is required.`);
      }
      const defaultCap = Number(claimType.conditionalDefaultCap);
      if (!Number.isFinite(defaultCap) || defaultCap <= 0) {
        errors.push(`${name || `Claim type ${index + 1}`}: default cap must be positive.`);
      }
      if (claimType.conditions.length === 0) {
        errors.push(`${name || `Claim type ${index + 1}`}: add at least one condition row.`);
      }
      claimType.conditions.forEach((condition, conditionIndex) => {
        if (!condition.conditionValue.trim()) {
          errors.push(
            `${name || `Claim type ${index + 1}`}: condition ${conditionIndex + 1} needs a value.`,
          );
        }
        const capAmount = Number(condition.capAmount);
        if (!Number.isFinite(capAmount) || capAmount <= 0) {
          errors.push(
            `${name || `Claim type ${index + 1}`}: condition ${conditionIndex + 1} needs a positive cap.`,
          );
        }
      });
    }
  });
  return errors;
}

function validateSchema(fields: UdfSchemaField[]): string[] {
  const errors: string[] = [];
  const keys = new Set<string>();
  const orders = new Set<number>();
  fields.forEach((field, index) => {
    const key = field.fieldKey.trim();
    const label = field.label.trim();
    const order = field.order ?? index + 1;
    const config =
      field.config && typeof field.config === "object"
        ? (field.config as Record<string, unknown>)
        : {};

    if (!key) errors.push(`Field ${index + 1}: field key is required.`);
    if (!label) errors.push(`Field ${index + 1}: label is required.`);
    if (keys.has(key)) errors.push(`Duplicate field key: ${key}`);
    if (orders.has(order)) errors.push(`Duplicate order value: ${order}`);
    keys.add(key);
    orders.add(order);

    if (field.type === "SELECT" || field.type === "DROPDOWN") {
      const options = Array.isArray(config.options) ? config.options : [];
      if (options.length === 0) {
        errors.push(`${label || key}: add at least one option.`);
      }
    }

    if (field.type === "API_SELECT") {
      if (!String(config.dataSource ?? "").trim()) {
        errors.push(`${label || key}: data source is required.`);
      }
      if (!String(config.labelField ?? "").trim()) {
        errors.push(`${label || key}: label field is required.`);
      }
      if (!String(config.valueField ?? "").trim()) {
        errors.push(`${label || key}: value field is required.`);
      }
    }
  });
  return errors;
}

export function ClaimsConfigPage({
  projectId,
  projectName,
  accountCode,
  projectCode,
}: {
  projectId: string;
  projectName: string;
  accountCode: string;
  projectCode: string;
}) {
  const modulesHref = `${projectAdminBase(accountCode, projectCode)}/modules`;

  const [view, setView] = useState<ViewMode>("list");
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<ClaimsTemplateDocument[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [featureWizard, setFeatureWizard] = useState<FeatureWizardDocument | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<EditorTemplate>(createEmptyTemplate());
  const [selectedBuilderClaimTypeId, setSelectedBuilderClaimTypeId] = useState("");
  const [schemasByClaimTypeId, setSchemasByClaimTypeId] = useState<Record<string, UdfSchemaField[]>>({});
  const [savedSchemasByClaimTypeId, setSavedSchemasByClaimTypeId] = useState<Record<string, UdfSchemaField[]>>({});
  const [schemaErrors, setSchemaErrors] = useState<Record<string, string | null>>({});
  const [schemaValidation, setSchemaValidation] = useState<Record<string, string[]>>({});
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [savingSchema, setSavingSchema] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ClaimsTemplateDocument | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedPanel, setExpandedPanel] = useState<EditorPanel>("settings");
  const [timeWindowMode, setTimeWindowMode] = useState<TimeWindowMode>("tminus");
  const [designationToAdd, setDesignationToAdd] = useState("");
  const [dateRangeStartDay, setDateRangeStartDay] = useState("16");
  const [dateRangeEndDay, setDateRangeEndDay] = useState("16");

  const claimsFlow = getWizardFlow(featureWizard, "claims");
  const claimsProgress = flowCompletion(claimsFlow);

  const selectedClaimType = activeTemplate.claimTypes.find(
    (claimType) => claimType.id === selectedBuilderClaimTypeId,
  ) ?? activeTemplate.claimTypes[0] ?? null;
  const selectedSchema = selectedClaimType ? schemasByClaimTypeId[selectedClaimType.id] ?? [] : [];
  const selectedSavedSchema = selectedClaimType
    ? savedSchemasByClaimTypeId[selectedClaimType.id] ?? []
    : [];

  const designationNameById = useMemo(
    () => new Map(designations.map((designation) => [designation.id, designation.name] as const)),
    [designations],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [nextTemplates, nextDesignations, nextWizard] = await Promise.all([
        claimsConfigService.listTemplates(projectId),
        designationService.listByProject(projectId),
        featureWizardService.getByProject(projectId),
      ]);
      setTemplates(nextTemplates);
      setDesignations(nextDesignations);
      setFeatureWizard(nextWizard);
    } catch (err) {
      setLoadError(formatApiError(err, "Failed to load claims configurations"));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedClaimType) return;
    if (savedSchemasByClaimTypeId[selectedClaimType.id]) return;

    let cancelled = false;
    async function loadSchema() {
      try {
        const schemaKey = normalizeClaimTypeSchemaKey(projectId, activeTemplate.id || "draft", selectedClaimType.id);
        const schema = await claimsConfigService.getUdfSchema(projectId, schemaKey);
        if (cancelled) return;
        const fields = schema?.fields ?? [];
        setSchemasByClaimTypeId((prev) => ({ ...prev, [selectedClaimType.id]: fields }));
        setSavedSchemasByClaimTypeId((prev) => ({ ...prev, [selectedClaimType.id]: fields }));
      } catch (err) {
        if (!cancelled) {
          setSchemaErrors((prev) => ({
            ...prev,
            [selectedClaimType.id]: formatApiError(err, "Failed to load form schema"),
          }));
        }
      }
    }
    void loadSchema();
    return () => {
      cancelled = true;
    };
  }, [activeTemplate.id, projectId, savedSchemasByClaimTypeId, selectedClaimType]);

  function applyTemplate(template: ClaimsTemplateDocument | null, nextView: ViewMode = "editor") {
    const editorTemplate = toEditorTemplate(template);
    const draftClaimTypes =
      template ? loadDraftClaimTypes(projectId, template.id) : null;
    if (draftClaimTypes?.length) {
      editorTemplate.claimTypes = draftClaimTypes;
    }
    setActiveTemplate(editorTemplate);
    setSelectedBuilderClaimTypeId(editorTemplate.claimTypes[0]?.id ?? "");
    setFormErrors([]);
    setSchemaErrors({});
    setSchemaValidation({});
    setExpandedPanel("settings");
    setTimeWindowMode("tminus");
    setDesignationToAdd("");
    setDateRangeStartDay("16");
    setDateRangeEndDay("16");
    setView(nextView);
  }

  function updateTemplate<K extends keyof EditorTemplate>(key: K, value: EditorTemplate[K]) {
    setActiveTemplate((prev) => ({ ...prev, [key]: value }));
    setFormErrors([]);
  }

  function updateClaimType(id: string, patch: Partial<EditorClaimType>) {
    setActiveTemplate((prev) => ({
      ...prev,
      claimTypes: prev.claimTypes.map((claimType) =>
        claimType.id === id ? { ...claimType, ...patch } : claimType,
      ),
    }));
    setFormErrors([]);
  }

  function persistCurrentClaimTypeDrafts(templateId: string, claimTypes: EditorClaimType[]) {
    if (!templateId) return;
    persistDraftClaimTypes(projectId, templateId, claimTypes);
  }

  async function handleSaveTemplate() {
    const errors = [...validateTemplate(activeTemplate), ...validateClaimTypes(activeTemplate.claimTypes)];
    setFormErrors(errors);
    if (errors.length > 0) {
      setToast({ message: "Please fix the highlighted claims configuration fields.", type: "error" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        projectId,
        templateName: activeTemplate.templateName.trim(),
        applicableDesignations: activeTemplate.designationIds,
        isModuleEnabled: activeTemplate.isModuleEnabled,
        backdateConfig: activeTemplate.backdateEnabled
          ? {
              isEnabled: true,
              allowedDays: Number(activeTemplate.backdateDays),
            }
          : {
              isEnabled: false,
              allowedDays: 0,
            },
      };

      const savedTemplate = activeTemplate.id
        ? await claimsConfigService.updateTemplate(projectId, activeTemplate.id, {
            templateName: payload.templateName,
            isModuleEnabled: payload.isModuleEnabled,
            backdateConfig: payload.backdateConfig,
          })
        : await claimsConfigService.createTemplate(payload);

      let nextTemplate = savedTemplate;
      const currentIds = new Set(savedTemplate.applicableDesignations);
      const nextIds = new Set(activeTemplate.designationIds);

      for (const designationId of activeTemplate.designationIds) {
        if (!currentIds.has(designationId)) {
          nextTemplate = await claimsConfigService.addDesignationToTemplate(
            projectId,
            savedTemplate.id,
            designationId,
          );
        }
      }

      for (const designationId of savedTemplate.applicableDesignations) {
        if (!nextIds.has(designationId)) {
          nextTemplate = await claimsConfigService.removeDesignationFromTemplate(
            projectId,
            savedTemplate.id,
            designationId,
          );
        }
      }

      persistCurrentClaimTypeDrafts(nextTemplate.id, activeTemplate.claimTypes);
      await load();
      applyTemplate(nextTemplate, "builder");
      setToast({ message: "Claims configuration saved.", type: "success" });
    } catch (err) {
      setToast({
        message: formatApiError(err, "Failed to save claims configuration"),
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleCloneTemplate(template: ClaimsTemplateDocument) {
    try {
      const cloned = await claimsConfigService.cloneTemplate(projectId, template);
      const draft = loadDraftClaimTypes(projectId, template.id);
      if (draft?.length) {
        persistDraftClaimTypes(
          projectId,
          cloned.id,
          draft.map((claimType) => ({
            ...claimType,
            id: makeId("claim_type"),
            expanded: false,
          })),
        );
      }
      await load();
      setToast({ message: `Cloned "${template.templateName}".`, type: "success" });
    } catch (err) {
      setToast({
        message: formatApiError(err, "Failed to clone configuration"),
        type: "error",
      });
    }
  }

  async function handleDeleteTemplate() {
    if (!deleteTarget) return;
    try {
      await claimsConfigService.deleteTemplate(deleteTarget.id);
      removeDraftClaimTypes(projectId, deleteTarget.id);
      setDeleteTarget(null);
      await load();
      setToast({ message: "Configuration deleted.", type: "success" });
    } catch (err) {
      setToast({
        message: formatApiError(err, "Delete is not available for this configuration yet"),
        type: "error",
      });
      setDeleteTarget(null);
    }
  }

  function updateSchema(fields: UdfSchemaField[]) {
    if (!selectedClaimType) return;
    setSchemasByClaimTypeId((prev) => ({ ...prev, [selectedClaimType.id]: fields }));
    setSchemaValidation((prev) => ({ ...prev, [selectedClaimType.id]: [] }));
    setSchemaErrors((prev) => ({ ...prev, [selectedClaimType.id]: null }));
  }

  async function handleSaveSchema() {
    if (!selectedClaimType) return;
    const validation = validateSchema(selectedSchema);
    if (validation.length > 0) {
      setSchemaValidation((prev) => ({ ...prev, [selectedClaimType.id]: validation }));
      return;
    }

    setSavingSchema(true);
    try {
      const templateId = activeTemplate.id || "draft";
      await claimsConfigService.saveUdfSchema({
        projectId,
        schemaKey: normalizeClaimTypeSchemaKey(projectId, templateId, selectedClaimType.id),
        fields: selectedSchema,
      });
      setSavedSchemasByClaimTypeId((prev) => ({ ...prev, [selectedClaimType.id]: selectedSchema }));
      setToast({ message: `${selectedClaimType.name || "Claim"} form saved.`, type: "success" });
    } catch (err) {
      setSchemaErrors((prev) => ({
        ...prev,
        [selectedClaimType.id]: formatApiError(err, "Failed to save claim form"),
      }));
    } finally {
      setSavingSchema(false);
    }
  }

  const selectedDesignationNames = activeTemplate.designationIds.map(
    (id) => designationNameById.get(id) ?? id,
  );
  const availableDesignations = designations.filter(
    (designation) => !activeTemplate.designationIds.includes(designation.id),
  );

  function toggleDesignation(designationId: string) {
    const selected = activeTemplate.designationIds.includes(designationId);
    updateTemplate(
      "designationIds",
      selected
        ? activeTemplate.designationIds.filter((id) => id !== designationId)
        : [...activeTemplate.designationIds, designationId],
    );
  }

  function formatClaimTypeSummary(claimType: EditorClaimType): string {
    if (claimType.capType === "conditional") {
      return `Conditional · ${claimType.conditions.length} condition${claimType.conditions.length !== 1 ? "s" : ""}`;
    }
    if (claimType.capType === "no-cap") {
      return "No cap";
    }
    return `Fixed ₹${claimType.fixedCap || "0"}`;
  }

  function addApprovalLevel() {
    updateTemplate("approvalLevels", [
      ...activeTemplate.approvalLevels,
      createEmptyApprovalLevel(activeTemplate.approvalLevels.length),
    ]);
  }

  function addSelectedDesignation() {
    if (!designationToAdd) return;
    toggleDesignation(designationToAdd);
    setDesignationToAdd("");
  }

  if (loading) {
    return (
      <div className="claims-page">
        <div className="edit-skeleton">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton-section" />
          ))}
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="claims-page">
        <div className="config-load-error">
          <p>{loadError}</p>
          <button className="btn btn-secondary btn-sm" onClick={() => void load()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="claims-page">
        {view === "list" ? (
          <div className="claims-listView">
            <div className="claims-listHeader">
              <div>
                <p className="claims-eyebrow">Claims Module</p>
                <h1 className="claims-title">Claims Configurations</h1>
                <p className="claims-subtitle">
                  Manage claims templates, designations, claim types, and form builders for{" "}
                  {projectName}.
                </p>
              </div>
              <Link href={modulesHref} className="claims-backLink claims-backLink--hero">
                <ArrowLeft size={14} /> Back to Modules
              </Link>
            </div>

            <div className="claims-heroStepper">
              <div className="claims-heroStepper__step claims-heroStepper__step--active">
                <span className="claims-heroStepper__bubble">1</span>
                <strong>Configuration Setup</strong>
              </div>
              <span className="claims-heroStepper__arrow">→</span>
              <div
                className={`claims-heroStepper__step${
                  claimsProgress.completed >= (claimsProgress.total || 2) ? " claims-heroStepper__step--complete" : ""
                }`}
              >
                <span className="claims-heroStepper__bubble claims-heroStepper__bubble--ghost">2</span>
                <strong>Form Builder</strong>
              </div>
            </div>

            {templates.length === 0 ? (
              <div className="claims-emptyState claims-emptyState--hero">
                <strong>No claims configurations yet</strong>
                <p>Create your first configuration to set up claim types and form rules.</p>
              </div>
            ) : (
              <div className="claims-configList">
                {templates.map((template, index) => (
                  <article
                    key={template.id}
                    className="claims-configCard"
                    onClick={() => applyTemplate(template, "editor")}
                  >
                    <div className="claims-configCard__index">{index + 1}</div>
                    <div className="claims-configCard__body">
                      <strong>{template.templateName}</strong>
                      <p>
                        {template.applicableDesignations.length
                          ? template.applicableDesignations
                              .map((id) => designationNameById.get(id) ?? id)
                              .join(", ")
                          : "No designations assigned"}
                      </p>
                    </div>
                    <div className="claims-configCard__actions" onClick={(e) => e.stopPropagation()}>
                      <button className="claims-cardBtn" onClick={() => void handleCloneTemplate(template)}>
                        <Copy size={12} /> Clone
                      </button>
                      <button className="claims-cardBtn" onClick={() => applyTemplate(template, "editor")}>
                        <Pencil size={12} /> Edit
                      </button>
                      <button
                        className="claims-cardBtn danger claims-cardBtn--iconOnly"
                        onClick={() => setDeleteTarget(template)}
                        aria-label={`Delete ${template.templateName}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <button
              type="button"
              className="claims-addStrip"
              onClick={() => applyTemplate(null, "editor")}
            >
              <Plus size={22} />
              <span>Add New Configuration</span>
            </button>
          </div>
        ) : null}

        {view === "editor" ? (
          <div className="claims-editorView">
            <div className="claims-listHeader claims-listHeader--editor">
              <div>
                <p className="claims-eyebrow">Claims Module</p>
                <h1 className="claims-title">
                  {activeTemplate.templateName.trim() || "New Claims Configuration"}
                </h1>
                <p className="claims-subtitle">
                  Configure claim types with conditional caps, time window, and approval chain.
                </p>
              </div>
              <button className="claims-backLink claims-backLink--hero" onClick={() => setView("list")}>
                <ArrowLeft size={14} /> All Configs
              </button>
            </div>

            <div className="claims-heroStepper">
              <div className="claims-heroStepper__step claims-heroStepper__step--active">
                <span className="claims-heroStepper__bubble">1</span>
                <strong>Configuration Setup</strong>
              </div>
              <span className="claims-heroStepper__arrow">→</span>
              <div className="claims-heroStepper__step">
                <span className="claims-heroStepper__bubble claims-heroStepper__bubble--ghost">2</span>
                <strong>Form Builder</strong>
              </div>
            </div>

            {formErrors.length > 0 ? (
              <div className="claims-errorBanner">
                {formErrors.map((message) => (
                  <p key={message}>{message}</p>
                ))}
              </div>
            ) : null}

            <div className="claims-editorStack">
              <section className={`claims-detailCard${expandedPanel === "settings" ? " expanded" : ""}`}>
                <button
                  type="button"
                  className="claims-detailCard__header"
                  onClick={() => setExpandedPanel(expandedPanel === "settings" ? "window" : "settings")}
                >
                  <div className="claims-detailCard__icon claims-detailCard__icon--green">
                    <FolderKanban size={22} />
                  </div>
                  <div className="claims-detailCard__title">
                    <h2>Configuration Settings</h2>
                    <p>Config name & designations</p>
                  </div>
                  <ChevronDown className="claims-detailCard__chevron" size={20} />
                </button>

                {expandedPanel === "settings" ? (
                  <div className="claims-detailCard__body">
                    <div className="claims-detailPanel">
                      <label className="claims-field">
                        <span>Configuration Name</span>
                        <input
                          className="form-input claims-input"
                          value={activeTemplate.templateName}
                          onChange={(e) => updateTemplate("templateName", e.target.value)}
                          placeholder="Executive Claims Config"
                        />
                      </label>

                      <div className="claims-field">
                        <span>Applicable Designations</span>
                        <div className="claims-selectAddRow">
                          <select
                            className="form-input claims-input"
                            value={designationToAdd}
                            onChange={(e) => setDesignationToAdd(e.target.value)}
                          >
                            <option value="">Select designation</option>
                            {availableDesignations.map((designation) => (
                              <option key={designation.id} value={designation.id}>
                                {designation.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="claims-cardBtn claims-cardBtn--detailAdd"
                            onClick={addSelectedDesignation}
                            disabled={!designationToAdd}
                          >
                            <Plus size={14} /> Add
                          </button>
                        </div>
                        <div className="claims-tagInput">
                          {selectedDesignationNames.length > 0 ? (
                            activeTemplate.designationIds.map((designationId) => (
                              <button
                                key={designationId}
                                type="button"
                                className="claims-tagChip"
                                onClick={() => toggleDesignation(designationId)}
                              >
                                {designationNameById.get(designationId) ?? designationId}
                                <span aria-hidden="true">×</span>
                              </button>
                            ))
                          ) : (
                            <span className="claims-tagInput__placeholder">
                              No designations selected yet
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </section>

              <section className={`claims-detailCard${expandedPanel === "window" ? " expanded" : ""}`}>
                <button
                  type="button"
                  className="claims-detailCard__header"
                  onClick={() => setExpandedPanel(expandedPanel === "window" ? "types" : "window")}
                >
                  <div className="claims-detailCard__icon claims-detailCard__icon--amber">
                    <CalendarDays size={22} />
                  </div>
                  <div className="claims-detailCard__title">
                    <h2>Claim Submission Time Window</h2>
                    <p>Allowed window for past-date claims</p>
                  </div>
                  <ChevronDown className="claims-detailCard__chevron" size={20} />
                </button>

                {expandedPanel === "window" ? (
                  <div className="claims-detailCard__body">
                    <div className="claims-switchRow">
                      <strong>Enable</strong>
                      <label className="toggle">
                        <input
                          type="checkbox"
                          checked={activeTemplate.backdateEnabled}
                          onChange={(e) => updateTemplate("backdateEnabled", e.target.checked)}
                        />
                        <span className="toggle-track" />
                        <span className="toggle-thumb" />
                      </label>
                    </div>
                    {activeTemplate.backdateEnabled ? (
                      <div className="claims-detailPanel">
                        <div className="claims-miniEyebrow">Time Window</div>
                        <div className="claims-field">
                          <span>Type</span>
                          <div className="claims-pillGroup">
                            <button
                              type="button"
                              className={`claims-pillBtn${timeWindowMode === "tminus" ? " active" : ""}`}
                              onClick={() => setTimeWindowMode("tminus")}
                            >
                              T-X Days
                            </button>
                            <button
                              type="button"
                              className={`claims-pillBtn${timeWindowMode === "date-range" ? " active" : ""}`}
                              onClick={() => setTimeWindowMode("date-range")}
                            >
                              Date Range
                            </button>
                          </div>
                        </div>

                        {timeWindowMode === "tminus" ? (
                          <div className="claims-tminusRow">
                            <strong>T-</strong>
                            <input
                              className="form-input claims-input claims-input--small"
                              type="number"
                              min={1}
                              step={1}
                              value={activeTemplate.backdateDays}
                              onChange={(e) => updateTemplate("backdateDays", e.target.value)}
                            />
                            <span>days</span>
                          </div>
                        ) : (
                          <div className="claims-dateRangeGrid">
                            <label className="claims-field claims-field--compact">
                              <span>From (prev month)</span>
                              <input
                                className="form-input claims-input claims-input--small"
                                type="number"
                                min={1}
                                max={31}
                                value={dateRangeStartDay}
                                onChange={(e) => setDateRangeStartDay(e.target.value)}
                              />
                            </label>
                            <label className="claims-field claims-field--compact">
                              <span>To (current month)</span>
                              <input
                                className="form-input claims-input claims-input--small"
                                type="number"
                                min={1}
                                max={31}
                                value={dateRangeEndDay}
                                onChange={(e) => setDateRangeEndDay(e.target.value)}
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </section>

              <section className={`claims-detailCard${expandedPanel === "types" ? " expanded" : ""}`}>
                <button
                  type="button"
                  className="claims-detailCard__header"
                  onClick={() => setExpandedPanel(expandedPanel === "types" ? "approval" : "types")}
                >
                  <div className="claims-detailCard__icon claims-detailCard__icon--blue">
                    <BriefcaseBusiness size={22} />
                  </div>
                  <div className="claims-detailCard__title">
                    <h2>Claim Types & Caps</h2>
                    <p>Per-type caps with conditional sub-fields</p>
                  </div>
                  <ChevronDown className="claims-detailCard__chevron" size={20} />
                </button>

                {expandedPanel === "types" ? (
                  <div className="claims-detailCard__body">
                    <div className="claims-infoStrip claims-infoStrip--detail">
                      <CircleAlert size={16} />
                      <span>
                        Each claim type can have a <strong>conditional sub-field</strong> with per-value caps.
                        This sub-field auto-appears in the mobile form.
                      </span>
                    </div>

                    <div className="claims-typeRows">
                      {activeTemplate.claimTypes.map((claimType, index) => (
                        <div
                          key={claimType.id}
                          className={`claims-typeRow${claimType.expanded ? " claims-typeRow--expanded" : ""}`}
                        >
                          <button
                            type="button"
                            className="claims-typeRow__main"
                            onClick={() =>
                              updateClaimType(claimType.id, { expanded: !claimType.expanded })
                            }
                          >
                            <ChevronDown
                              size={18}
                              className={`claims-typeRow__chevron${claimType.expanded ? " expanded" : ""}`}
                            />
                            <div className="claims-typeRow__copy">
                              <strong>{claimType.name || `Claim Type ${index + 1}`}</strong>
                              <span>{formatClaimTypeSummary(claimType)}</span>
                            </div>
                          </button>
                          <div className="claims-typeRow__status">
                            <span className={`claims-statusPill${claimType.active ? " active" : ""}`}>
                              {claimType.active ? "Active" : "Inactive"}
                            </span>
                            <label className="toggle">
                              <input
                                type="checkbox"
                                checked={claimType.active}
                                onChange={(e) =>
                                  updateClaimType(claimType.id, { active: e.target.checked })
                                }
                              />
                              <span className="toggle-track" />
                              <span className="toggle-thumb" />
                            </label>
                          </div>

                          {claimType.expanded ? (
                            <div className="claims-typeEditor">
                              <label className="claims-field">
                                <span>Claim Type Name</span>
                                <input
                                  className="form-input claims-input"
                                  value={claimType.name}
                                  onChange={(e) =>
                                    updateClaimType(claimType.id, { name: e.target.value })
                                  }
                                  placeholder={`Claim Type ${index + 1}`}
                                />
                              </label>

                              <div className="claims-field">
                                <span>Cap Type</span>
                                <div className="claims-pillGroup">
                                  <button
                                    type="button"
                                    className={`claims-pillBtn${claimType.capType === "fixed" ? " active" : ""}`}
                                    onClick={() =>
                                      updateClaimType(claimType.id, { capType: "fixed" })
                                    }
                                  >
                                    Fixed
                                  </button>
                                  <button
                                    type="button"
                                    className={`claims-pillBtn${claimType.capType === "conditional" ? " active" : ""}`}
                                    onClick={() =>
                                      updateClaimType(claimType.id, {
                                        capType: "conditional",
                                        conditions:
                                          claimType.conditions.length > 0
                                            ? claimType.conditions
                                            : [createEmptyCondition(0)],
                                      })
                                    }
                                  >
                                    Conditional
                                  </button>
                                </div>
                              </div>

                              {claimType.capType === "fixed" ? (
                                <label className="claims-field claims-field--compact">
                                  <span>Cap (₹)</span>
                                  <input
                                    className="form-input claims-input"
                                    type="number"
                                    min={1}
                                    step="0.01"
                                    value={claimType.fixedCap}
                                    onChange={(e) =>
                                      updateClaimType(claimType.id, { fixedCap: e.target.value })
                                    }
                                  />
                                </label>
                              ) : null}

                              {claimType.capType === "conditional" ? (
                                <div className="claims-conditionalEditor">
                                  <label className="claims-field claims-field--compactWide">
                                    <span>Condition Sub-field Name</span>
                                    <input
                                      className="form-input claims-input"
                                      value={claimType.conditionalField}
                                      onChange={(e) =>
                                        updateClaimType(claimType.id, {
                                          conditionalField: e.target.value,
                                          conditions: claimType.conditions.map((condition) => ({
                                            ...condition,
                                            conditionField: e.target.value,
                                          })),
                                        })
                                      }
                                      placeholder="Type"
                                    />
                                  </label>
                                  <p className="claims-inlineNote">
                                    This becomes a dropdown on the mobile form when this claim type is selected
                                  </p>

                                  <div className="claims-conditionMatrixHeader">
                                    <span>{claimType.conditionalField || "Type"}</span>
                                    <span>Cap (₹)</span>
                                    <span />
                                  </div>

                                  <div className="claims-conditionMatrix">
                                    {claimType.conditions.map((condition) => (
                                      <div key={condition.id} className="claims-conditionMatrixRow">
                                        <input
                                          className="form-input claims-input"
                                          value={condition.conditionValue}
                                          onChange={(e) =>
                                            updateClaimType(claimType.id, {
                                              conditions: claimType.conditions.map((item) =>
                                                item.id === condition.id
                                                  ? {
                                                      ...item,
                                                      conditionField: claimType.conditionalField,
                                                      conditionValue: e.target.value,
                                                    }
                                                  : item,
                                              ),
                                            })
                                          }
                                          placeholder="Handset"
                                        />
                                        <input
                                          className="form-input claims-input"
                                          type="number"
                                          min={1}
                                          step="0.01"
                                          value={condition.capAmount}
                                          onChange={(e) =>
                                            updateClaimType(claimType.id, {
                                              conditions: claimType.conditions.map((item) =>
                                                item.id === condition.id
                                                  ? { ...item, capAmount: e.target.value }
                                                  : item,
                                              ),
                                            })
                                          }
                                          placeholder="500"
                                        />
                                        <button
                                          type="button"
                                          className="claims-removeBtn"
                                          onClick={() =>
                                            updateClaimType(claimType.id, {
                                              conditions: claimType.conditions.filter(
                                                (item) => item.id !== condition.id,
                                              ),
                                            })
                                          }
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    ))}
                                  </div>

                                  <button
                                    type="button"
                                    className="claims-cardBtn claims-cardBtn--detailAdd"
                                    onClick={() =>
                                      updateClaimType(claimType.id, {
                                        conditions: [
                                          ...claimType.conditions,
                                          {
                                            ...createEmptyCondition(claimType.conditions.length),
                                            conditionField: claimType.conditionalField,
                                          },
                                        ],
                                      })
                                    }
                                  >
                                    <Plus size={14} /> Add Type
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>

                    <button
                      className="claims-cardBtn claims-cardBtn--detailAdd"
                      onClick={() =>
                        updateTemplate("claimTypes", [
                          ...activeTemplate.claimTypes,
                          createEmptyClaimType(),
                        ])
                      }
                    >
                      <Plus size={14} /> Add Claim Type
                    </button>
                  </div>
                ) : null}
              </section>

              <section className={`claims-detailCard${expandedPanel === "approval" ? " expanded" : ""}`}>
                <button
                  type="button"
                  className="claims-detailCard__header"
                  onClick={() => setExpandedPanel(expandedPanel === "approval" ? "settings" : "approval")}
                >
                  <div className="claims-detailCard__icon claims-detailCard__icon--slate">
                    <UserRound size={22} />
                  </div>
                  <div className="claims-detailCard__title">
                    <h2>Approval Workflow</h2>
                    <p>Sequential approval chain</p>
                  </div>
                  <ChevronDown className="claims-detailCard__chevron" size={20} />
                </button>

                {expandedPanel === "approval" ? (
                  <div className="claims-detailCard__body">
                    <div className="claims-switchRow">
                      <strong>Enable</strong>
                      <label className="toggle">
                        <input
                          type="checkbox"
                          checked={activeTemplate.approvalEnabled}
                          onChange={(e) => updateTemplate("approvalEnabled", e.target.checked)}
                        />
                        <span className="toggle-track" />
                        <span className="toggle-thumb" />
                      </label>
                    </div>

                    {activeTemplate.approvalEnabled ? (
                      <div className="claims-approvalFlow">
                        {activeTemplate.approvalLevels.map((level, index) => (
                          <div key={level.id} className="claims-approvalFlow__group">
                            <div className="claims-approvalFlow__row">
                              <div className="claims-approvalFlow__badge">{index + 1}</div>
                              <select
                                className="form-input claims-input claims-approvalFlow__input"
                                value={level.designationId}
                                onChange={(e) =>
                                  updateTemplate(
                                    "approvalLevels",
                                    activeTemplate.approvalLevels.map((item) =>
                                      item.id === level.id
                                        ? { ...item, designationId: e.target.value }
                                        : item,
                                    ),
                                  )
                                }
                              >
                                <option value="">{`Manager ${index + 1}`}</option>
                                {designations.map((designation) => (
                                  <option key={designation.id} value={designation.id}>
                                    {designation.name}
                                  </option>
                                ))}
                              </select>
                              <button
                                className="claims-removeBtn"
                                onClick={() =>
                                  updateTemplate(
                                    "approvalLevels",
                                    activeTemplate.approvalLevels.filter((item) => item.id !== level.id),
                                  )
                                }
                              >
                                Remove
                              </button>
                            </div>
                            {index < activeTemplate.approvalLevels.length - 1 ? (
                              <div className="claims-approvalFlow__arrow">↓</div>
                            ) : null}
                          </div>
                        ))}

                        <button className="claims-cardBtn claims-cardBtn--detailAdd" onClick={addApprovalLevel}>
                          <Plus size={14} /> Add Level
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </section>

              <div className="claims-saveBar">
                <div className="claims-saveBar__status">
                  <BadgeCheck size={18} />
                  <span>All changes saved</span>
                </div>
                <button
                  className="claims-primaryBtn claims-primaryBtn--saveBar"
                  onClick={() => void handleSaveTemplate()}
                  disabled={saving}
                >
                  <Check size={16} />
                  {saving ? "Saving…" : "Save & Proceed to Form Builder"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {view === "builder" ? (
          <div className="claims-builderView">
            <div className="claims-builderTopbar">
              <div className="claims-builderTopbar__left">
                <button className="claims-configBackBtn" onClick={() => setView("editor")}>
                  <ArrowLeft size={14} /> Configuration
                </button>
                <div>
                  <div className="claims-titleSm">
                    Form Builder ·{" "}
                    <span>{activeTemplate.templateName.trim() || "New Configuration"}</span>
                  </div>
                  <div className="claims-subtitleSm">Step 2 of 2 · Claim Form Builder</div>
                </div>
              </div>
            </div>

            <div className="claims-builderTabs">
              {activeTemplate.claimTypes.map((claimType) => (
                <button
                  key={claimType.id}
                  type="button"
                  className={`claims-builderTab${selectedClaimType?.id === claimType.id ? " active" : ""}`}
                  onClick={() => setSelectedBuilderClaimTypeId(claimType.id)}
                >
                  {claimType.name || "Untitled"}
                </button>
              ))}
            </div>

            {selectedClaimType ? (
              <ClaimsFormBuilder
                projectId={projectId}
                claimTypeName={selectedClaimType.name || "Claim"}
                fields={selectedSchema}
                savedFields={selectedSavedSchema}
                loading={false}
                saving={savingSchema}
                error={schemaErrors[selectedClaimType.id] ?? null}
                validationErrors={schemaValidation[selectedClaimType.id] ?? []}
                onChange={updateSchema}
                onSave={() => void handleSaveSchema()}
              />
            ) : (
              <div className="claims-emptyState">
                <strong>No claim type selected</strong>
                <p>Add at least one claim type in configuration before building a form.</p>
              </div>
            )}
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDeleteTemplate()}
        title="Delete Claims Configuration"
        message={
          deleteTarget
            ? `Delete "${deleteTarget.templateName}"? This action may not be available on the current backend.`
            : ""
        }
        confirmLabel="Delete"
        variant="danger"
      />

      <If2Toast toast={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
