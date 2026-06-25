"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Copy,
  Pencil,
  Plus,
  Trash2,
  ChevronDown,
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
import { ClaimsFormBuilderV2 } from "./claims-form-builder-v2";

type ViewMode = "list" | "editor" | "builder";
type ConfigType = "template" | "direct";

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
  serverClaimTypeId?: string; // Backend ID after save
  udfSchemaKey?: string; // Backend-generated schema key
  name: string;
  active: boolean;
  capType: "fixed" | "conditional" | "no-cap";
  fixedCap: string;
  conditionalDefaultCap: string;
  conditionalField: string;
  conditions: EditorCondition[];
  iconUrl: string;
  expanded: boolean;
  approvalWorkflow?: {
    levels: EditorApprovalLevel[];
  };
};

type EditorTemplate = {
  id: string;
  configType: ConfigType;
  templateName: string;
  designationIds: string[];
  designationId?: string;
  isModuleEnabled: boolean;
  backdateEnabled: boolean;
  backdateDays: string;
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
    configType: "template",
    templateName: "",
    designationIds: [],
    designationId: "",
    isModuleEnabled: true,
    backdateEnabled: true,
    backdateDays: "7",
    claimTypes: [createEmptyClaimType()],
  };
}

function toEditorTemplate(template: ClaimsTemplateDocument | null): EditorTemplate {
  if (!template) return createEmptyTemplate();
  const configType: ConfigType = template.isTemplate ? "template" : "direct";
  const directDesignationId = template.designationId ?? template.applicableDesignations[0] ?? "";
  return {
    id: template.id,
    configType,
    templateName: template.templateName,
    designationIds: template.isTemplate ? template.applicableDesignations : [],
    designationId: directDesignationId,
    isModuleEnabled: template.isModuleEnabled,
    backdateEnabled: template.backdateConfig?.isEnabled ?? false,
    backdateDays:
      typeof template.backdateConfig?.allowedDays === "number" && template.backdateConfig.allowedDays > 0
        ? String(template.backdateConfig.allowedDays)
        : "7",
    claimTypes:
      template.claimTypes.length > 0
        ? template.claimTypes.map((claimType) => ({
            id: claimType.id,
            serverClaimTypeId: claimType.id, // Already saved to backend
            udfSchemaKey: claimType.udfSchemaKey, // Backend-generated
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
            approvalWorkflow: claimType.approvalWorkflow?.isEnabled
              ? {
                  levels: claimType.approvalWorkflow.levels.map((level, index) => ({
                    id: makeId("approval"),
                    order: String(level.order ?? index + 1),
                    designationId: level.designationId,
                    mode: level.mode,
                  })),
                }
              : undefined,
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
  return errors;
}

function validateDirectConfig(config: EditorTemplate): string[] {
  const errors: string[] = [];
  if (!config.designationId) {
    errors.push("Please select a designation.");
  }
  if (config.backdateEnabled) {
    const days = Number(config.backdateDays);
    if (!Number.isFinite(days) || days <= 0 || !Number.isInteger(days)) {
      errors.push("Backdate days must be a positive whole number.");
    }
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
  const [configType, setConfigType] = useState<ConfigType>("template");
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

  function getConfigDisplayName(template: ClaimsTemplateDocument): string {
    if (template.isTemplate) return template.templateName;
    const designationId = template.designationId ?? template.applicableDesignations[0] ?? "";
    const designationName = designationNameById.get(designationId);
    return designationName ? `Direct - ${designationName}` : template.templateName;
  }

  const activeConfigurationLabel =
    configType === "direct" && activeTemplate.designationId
      ? `Direct - ${designationNameById.get(activeTemplate.designationId) ?? activeTemplate.designationId}`
      : activeTemplate.templateName.trim() || "New Configuration";

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [nextTemplates, nextDesignations, nextWizard] = await Promise.all([
        claimsConfigService.listAllConfigs(projectId),
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
    
    // Only skip loading if we already have this schema loaded for this specific claim type
    const alreadyLoaded = savedSchemasByClaimTypeId[selectedClaimType.id] !== undefined;
    if (alreadyLoaded) return;

    let cancelled = false;
    async function loadSchema() {
      try {
        // Use backend-returned udfSchemaKey if available
        const schemaKey = selectedClaimType.udfSchemaKey || 
          normalizeClaimTypeSchemaKey(projectId, activeTemplate.id || "draft", selectedClaimType.id);
        
        console.log('[Form Builder] Loading schema for claim type:', {
          claimTypeName: selectedClaimType.name,
          claimTypeId: selectedClaimType.id,
          udfSchemaKey: selectedClaimType.udfSchemaKey,
          computedSchemaKey: schemaKey,
          projectId,
          templateId: activeTemplate.id
        });
        
        const schema = await claimsConfigService.getUdfSchema(projectId, schemaKey);
        if (cancelled) return;
        const fields = schema?.fields ?? [];
        
        console.log('[Form Builder] Schema loaded:', {
          schemaKey,
          fieldsCount: fields.length,
          fields: fields.map(f => ({ key: f.fieldKey, label: f.label, type: f.type }))
        });
        
        setSchemasByClaimTypeId((prev) => ({ ...prev, [selectedClaimType.id]: fields }));
        setSavedSchemasByClaimTypeId((prev) => ({ ...prev, [selectedClaimType.id]: fields }));
      } catch (err) {
        if (!cancelled) {
          console.error('[Form Builder] Failed to load schema:', err);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTemplate.id, projectId, selectedClaimType?.id, selectedClaimType?.udfSchemaKey]);

  function applyTemplate(template: ClaimsTemplateDocument | null, nextView: ViewMode = "editor") {
    const editorTemplate = toEditorTemplate(template);
    const draftClaimTypes =
      template ? loadDraftClaimTypes(projectId, template.id) : null;
    if (draftClaimTypes?.length) {
      editorTemplate.claimTypes = draftClaimTypes;
    }
    setActiveTemplate(editorTemplate);
    setConfigType(editorTemplate.configType);
    setSelectedBuilderClaimTypeId(editorTemplate.claimTypes[0]?.id ?? "");
    setFormErrors([]);
    setSchemaErrors({});
    setSchemaValidation({});
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
    const errors = configType === 'template'
      ? [...validateTemplate(activeTemplate), ...validateClaimTypes(activeTemplate.claimTypes)]
      : [...validateDirectConfig(activeTemplate), ...validateClaimTypes(activeTemplate.claimTypes)];
    
    setFormErrors(errors);
    if (errors.length > 0) {
      setToast({ message: "Please fix the highlighted fields.", type: "error" });
      return;
    }

    setSaving(true);
    try {
      if (configType === 'template') {
        // TEMPLATE MODE: Existing logic
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

        // Update designations
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

        // Save claim types with templateId
        const updatedClaimTypes: EditorClaimType[] = [];
        
        for (const claimType of activeTemplate.claimTypes) {
          const approvalWorkflow = claimType.approvalWorkflow?.levels.length
            ? {
                isEnabled: true,
                levels: claimType.approvalWorkflow.levels.map((level, i) => ({
                  order: Number(level.order) || i + 1,
                  designationId: level.designationId,
                  mode: level.mode,
                })),
              }
            : undefined;

          const claimTypePayload = {
            name: claimType.name.trim(),
            isActive: claimType.active,
            capType: claimType.capType,
            fixedCap: claimType.capType === "fixed" ? Number(claimType.fixedCap) : undefined,
            conditionalCap: claimType.capType === "conditional" ? {
              defaultCap: Number(claimType.conditionalDefaultCap),
              conditions: claimType.conditions.map((c, i) => ({
                conditionField: claimType.conditionalField,
                operator: c.operator,
                conditionValue: c.conditionValue,
                capAmount: Number(c.capAmount),
                order: i + 1,
              })),
            } : undefined,
            approvalWorkflow,
            iconUrl: claimType.iconUrl || undefined,
          };

          if (claimType.serverClaimTypeId) {
            // Update: pass projectId/templateId as separate parameters, not in payload
            await claimsConfigService.updateClaimType(claimType.serverClaimTypeId, {
              projectId,
              templateId: nextTemplate.id,
              ...claimTypePayload,
            });
            updatedClaimTypes.push(claimType);
          } else {
            // Create: include projectId and templateId in payload
            const response = await claimsConfigService.createClaimType({
              projectId,
              templateId: nextTemplate.id,
              ...claimTypePayload,
            });
            updatedClaimTypes.push({
              ...claimType,
              serverClaimTypeId: response.claimTypeId,
              udfSchemaKey: response.udfSchemaKey,
            });
          }
        }

        setActiveTemplate(prev => ({
          ...prev,
          id: nextTemplate.id,
          claimTypes: updatedClaimTypes,
        }));

        removeDraftClaimTypes(projectId, nextTemplate.id);
        await load();
        setToast({ message: "Template saved successfully.", type: "success" });
        setView("builder");
        
      } else {
        // DIRECT MODE: New logic
        const payload = {
          projectId,
          designationId: activeTemplate.designationId!,
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

        // Create direct config
        const savedConfig = await claimsConfigService.createDirectConfig(payload);

        // Save claim types with designationId
        const updatedClaimTypes: EditorClaimType[] = [];
        
        for (const claimType of activeTemplate.claimTypes) {
          const approvalWorkflow = claimType.approvalWorkflow?.levels.length
            ? {
                isEnabled: true,
                levels: claimType.approvalWorkflow.levels.map((level, i) => ({
                  order: Number(level.order) || i + 1,
                  designationId: level.designationId,
                  mode: level.mode,
                })),
              }
            : undefined;

          const claimTypePayload = {
            name: claimType.name.trim(),
            isActive: claimType.active,
            capType: claimType.capType,
            fixedCap: claimType.capType === "fixed" ? Number(claimType.fixedCap) : undefined,
            conditionalCap: claimType.capType === "conditional" ? {
              defaultCap: Number(claimType.conditionalDefaultCap),
              conditions: claimType.conditions.map((c, i) => ({
                conditionField: claimType.conditionalField,
                operator: c.operator,
                conditionValue: c.conditionValue,
                capAmount: Number(c.capAmount),
                order: i + 1,
              })),
            } : undefined,
            approvalWorkflow,
            iconUrl: claimType.iconUrl || undefined,
          };

          if (claimType.serverClaimTypeId) {
            // Update: pass projectId/designationId as separate parameters
            await claimsConfigService.updateClaimType(claimType.serverClaimTypeId, {
              projectId,
              designationId: activeTemplate.designationId!,
              ...claimTypePayload,
            });
            updatedClaimTypes.push(claimType);
          } else {
            // Create: include projectId and designationId in payload
            const response = await claimsConfigService.createClaimType({
              projectId,
              designationId: activeTemplate.designationId!,
              ...claimTypePayload,
            });
            updatedClaimTypes.push({
              ...claimType,
              serverClaimTypeId: response.claimTypeId,
              udfSchemaKey: response.udfSchemaKey,
            });
          }
        }

        setActiveTemplate(prev => ({
          ...prev,
          id: savedConfig.id,
          claimTypes: updatedClaimTypes,
        }));

        await load();
        setToast({ message: "Direct config saved successfully.", type: "success" });
        setView("builder");
      }
    } catch (err) {
      setToast({
        message: formatApiError(err, "Failed to save configuration"),
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
      // Use backend-returned udfSchemaKey if available, otherwise fallback
      const schemaKey = selectedClaimType.udfSchemaKey || 
        normalizeClaimTypeSchemaKey(projectId, activeTemplate.id || "draft", selectedClaimType.id);
      
      await claimsConfigService.saveUdfSchema({
        projectId,
        schemaKey,
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

  const claimsFlowItems = claimsFlow?.steps ?? [];

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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <strong>{getConfigDisplayName(template)}</strong>
                        <span className={`claims-statusPill ${template.isTemplate ? '' : 'active'}`} style={{ fontSize: '9px' }}>
                          {template.isTemplate ? 'TEMPLATE' : 'DIRECT'}
                        </span>
                      </div>
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
            <div className="claims-builderTopbar">
              <div className="claims-builderTopbar__left">
                <button className="claims-configBackBtn" onClick={() => setView("list")}>
                  <ArrowLeft size={14} /> Configurations
                </button>
                <div>
                  <div className="claims-titleSm">
                    Claims Setup ·{" "}
                    <span>{activeConfigurationLabel}</span>
                  </div>
                  <div className="claims-subtitleSm">Step 1 of 2 · Configuration Editor</div>
                </div>
              </div>
              <button className="claims-primaryBtn" onClick={() => void handleSaveTemplate()} disabled={saving}>
                {saving ? "Saving…" : "Save & Proceed"}
              </button>
            </div>

            {formErrors.length > 0 ? (
              <div className="claims-errorBanner">
                {formErrors.map((message) => (
                  <p key={message}>{message}</p>
                ))}
              </div>
            ) : null}

            <div className="claims-editorGrid">
              <div className="claims-editorMain">
                <section className="claims-sectionCard">
                  <div className="claims-sectionCard__head">
                    <div>
                      <p className="claims-sectionEyebrow">Mode Selection</p>
                      <h2>Configuration Type</h2>
                    </div>
                  </div>
                  <div className="claims-radioGroup">
                    <label className="claims-radioOption">
                      <input
                        type="radio"
                        name="configType"
                        value="template"
                        checked={configType === 'template'}
                        onChange={() => {
                          setConfigType('template');
                          updateTemplate('configType', 'template');
                        }}
                      />
                      <div>
                        <strong>Template (Shared Configuration)</strong>
                        <p>Apply same claims config to multiple designations</p>
                      </div>
                    </label>
                    <label className="claims-radioOption">
                      <input
                        type="radio"
                        name="configType"
                        value="direct"
                        checked={configType === 'direct'}
                        onChange={() => {
                          setConfigType('direct');
                          updateTemplate('configType', 'direct');
                        }}
                      />
                      <div>
                        <strong>Direct (Designation-Specific)</strong>
                        <p>Create config for one specific designation only</p>
                      </div>
                    </label>
                  </div>
                </section>

                <section className="claims-sectionCard">
                  <div className="claims-sectionCard__head">
                    <div>
                      <p className="claims-sectionEyebrow">S1-A</p>
                      <h2>Configuration Details</h2>
                    </div>
                  </div>
                  <div className="claims-fieldGrid two">
                    {configType === 'template' && (
                      <label className="claims-field">
                        <span>Configuration Name</span>
                        <input
                          className="form-input"
                          value={activeTemplate.templateName}
                          onChange={(e) => updateTemplate("templateName", e.target.value)}
                          placeholder="Executive Claims Config"
                        />
                      </label>
                    )}
                    <div className="claims-toggleSurface">
                      <div>
                        <strong>Module Status</strong>
                        <p>Enable or disable claims for the assigned designations.</p>
                      </div>
                      <label className="toggle">
                        <input
                          type="checkbox"
                          checked={activeTemplate.isModuleEnabled}
                          onChange={(e) => updateTemplate("isModuleEnabled", e.target.checked)}
                        />
                        <span className="toggle-track" />
                        <span className="toggle-thumb" />
                      </label>
                    </div>
                  </div>
                </section>

                <section className="claims-sectionCard">
                  <div className="claims-sectionCard__head">
                    <div>
                      <p className="claims-sectionEyebrow">S1-B</p>
                      <h2>Backdate Rules</h2>
                    </div>
                  </div>
                  <div className="claims-toggleSurface">
                    <div>
                      <strong>Allow Backdated Claims</strong>
                      <p>Version 1 follows the T-N days model from the design notes.</p>
                    </div>
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
                    <label className="claims-field claims-field--compact">
                      <span>Allowed Days (T-N)</span>
                      <input
                        className="form-input"
                        type="number"
                        min={1}
                        step={1}
                        value={activeTemplate.backdateDays}
                        onChange={(e) => updateTemplate("backdateDays", e.target.value)}
                      />
                    </label>
                  ) : null}
                </section>

                <section className="claims-sectionCard">
                  <div className="claims-sectionCard__head">
                    <div>
                      <p className="claims-sectionEyebrow">S1-C</p>
                      <h2>{configType === 'template' ? 'Applicable Designations' : 'Target Designation'}</h2>
                    </div>
                  </div>
                  {configType === 'template' ? (
                    <div className="claims-designationChips">
                      {designations.map((designation) => {
                        const selected = activeTemplate.designationIds.includes(designation.id);
                        return (
                          <button
                            key={designation.id}
                            type="button"
                            className={`claims-chipBtn${selected ? " selected" : ""}`}
                            onClick={() =>
                              updateTemplate(
                                "designationIds",
                                selected
                                  ? activeTemplate.designationIds.filter((id) => id !== designation.id)
                                  : [...activeTemplate.designationIds, designation.id],
                              )
                            }
                          >
                            {designation.name}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="claims-field">
                      <label>
                        <span>Select Designation <span style={{ color: '#ef4444' }}>*</span></span>
                        <select
                          className="form-input"
                          value={activeTemplate.designationId || ''}
                          onChange={(e) => updateTemplate("designationId", e.target.value)}
                        >
                          <option value="">Select designation...</option>
                          {designations.map((designation) => (
                            <option key={designation.id} value={designation.id}>
                              {designation.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px' }}>
                        This config applies to this designation only and takes priority over templates
                      </p>
                    </div>
                  )}
                </section>

                <section className="claims-sectionCard">
                  <div className="claims-sectionCard__head">
                    <div>
                      <p className="claims-sectionEyebrow">S1-D</p>
                      <h2>Claim Types</h2>
                    </div>
                    <button
                      className="claims-cardBtn"
                      onClick={() =>
                        updateTemplate("claimTypes", [
                          ...activeTemplate.claimTypes,
                          createEmptyClaimType(),
                        ])
                      }
                    >
                      <Plus size={12} /> Add Claim Type
                    </button>
                  </div>

                  <div className="claims-infoStrip">
                    Each claim type can have a fixed cap or a conditional sub-field with per-value caps.
                  </div>

                  <div className="claims-accordionList">
                    {activeTemplate.claimTypes.map((claimType, index) => {
                      const capLabel =
                        claimType.capType === "conditional"
                          ? `Conditional · ${claimType.conditions.length} condition${claimType.conditions.length !== 1 ? "s" : ""}`
                          : claimType.capType === "no-cap"
                            ? "No Cap"
                            : `Fixed ₹${claimType.fixedCap || "0"}`;

                      return (
                        <div
                          key={claimType.id}
                          className={`claims-accordion${claimType.expanded ? " expanded" : ""}`}
                        >
                          <button
                            type="button"
                            className="claims-accordion__head"
                            onClick={() => updateClaimType(claimType.id, { expanded: !claimType.expanded })}
                          >
                            <ChevronDown size={16} className="claims-accordion__chevron" />
                            <div className="claims-accordion__titleWrap">
                              <strong>{claimType.name || `Untitled Type ${index + 1}`}</strong>
                              <span>{capLabel}</span>
                            </div>
                            <span className={`claims-statusPill${claimType.active ? " active" : ""}`}>
                              {claimType.active ? "Active" : "Inactive"}
                            </span>
                          </button>

                          {claimType.expanded ? (
                            <div className="claims-accordion__body">
                              <div className="claims-fieldGrid two">
                                <label className="claims-field">
                                  <span>Type Name</span>
                                  <input
                                    className="form-input"
                                    value={claimType.name}
                                    onChange={(e) => updateClaimType(claimType.id, { name: e.target.value })}
                                    placeholder="Travel"
                                  />
                                </label>
                                <label className="claims-field">
                                  <span>Icon URL</span>
                                  <input
                                    className="form-input"
                                    value={claimType.iconUrl}
                                    onChange={(e) =>
                                      updateClaimType(claimType.id, { iconUrl: e.target.value })
                                    }
                                    placeholder="https://..."
                                  />
                                </label>
                              </div>

                              <div className="claims-inlineControls">
                                <div className="radio-pill-group">
                                  {["fixed", "conditional", "no-cap"].map((capType) => (
                                    <label
                                      key={capType}
                                      className={`radio-pill${claimType.capType === capType ? " selected" : ""}`}
                                    >
                                      <input
                                        type="radio"
                                        checked={claimType.capType === capType}
                                        onChange={() =>
                                          updateClaimType(claimType.id, {
                                            capType: capType as EditorClaimType["capType"],
                                          })
                                        }
                                      />
                                      {capType === "no-cap"
                                        ? "No Cap"
                                        : capType.charAt(0).toUpperCase() + capType.slice(1)}
                                    </label>
                                  ))}
                                </div>
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

                              {claimType.capType === "fixed" ? (
                                <label className="claims-field claims-field--compact">
                                  <span>Fixed Cap Amount</span>
                                  <input
                                    className="form-input"
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
                                <div className="claims-conditionalBox">
                                  <div className="claims-fieldGrid two">
                                    <label className="claims-field">
                                      <span>Condition Sub-field Name</span>
                                      <input
                                        className="form-input"
                                        value={claimType.conditionalField}
                                        onChange={(e) =>
                                          updateClaimType(claimType.id, {
                                            conditionalField: e.target.value,
                                          })
                                        }
                                        placeholder="Mode, City, Type"
                                      />
                                    </label>
                                    <label className="claims-field">
                                      <span>Default Cap</span>
                                      <input
                                        className="form-input"
                                        type="number"
                                        min={1}
                                        step="0.01"
                                        value={claimType.conditionalDefaultCap}
                                        onChange={(e) =>
                                          updateClaimType(claimType.id, {
                                            conditionalDefaultCap: e.target.value,
                                          })
                                        }
                                      />
                                    </label>
                                  </div>

                                  <div className="claims-conditionHeader">
                                    <span>{claimType.conditionalField || "Value"}</span>
                                    <span>Cap (₹)</span>
                                    <span />
                                  </div>
                                  {claimType.conditions.map((condition) => (
                                    <div key={condition.id} className="claims-conditionRow">
                                      <input
                                        className="form-input"
                                        value={condition.conditionValue}
                                        onChange={(e) =>
                                          updateClaimType(claimType.id, {
                                            conditions: claimType.conditions.map((item) =>
                                              item.id === condition.id
                                                ? { ...item, conditionValue: e.target.value }
                                                : item,
                                            ),
                                          })
                                        }
                                        placeholder="Bus"
                                      />
                                      <input
                                        className="form-input"
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
                                      />
                                      <button
                                        className="claims-cardBtn danger"
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
                                  <button
                                    className="claims-cardBtn"
                                    onClick={() =>
                                      updateClaimType(claimType.id, {
                                        conditions: [
                                          ...claimType.conditions,
                                          createEmptyCondition(claimType.conditions.length),
                                        ],
                                      })
                                    }
                                  >
                                    <Plus size={12} /> Add {claimType.conditionalField || "Condition"}
                                  </button>
                                </div>
                              ) : null}

                              {/* Approval Workflow Section - Per Claim Type */}
                              <div className="claims-approvalSection" style={{ marginTop: "1.5rem", padding: "1rem", background: "#f8f9fa", borderRadius: "8px" }}>
                                <div className="claims-toggleSurface">
                                  <div>
                                    <strong>Approval Workflow for {claimType.name || "this type"}</strong>
                                    <p>Configure approval levels specific to this claim type.</p>
                                  </div>
                                  <label className="toggle">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(claimType.approvalWorkflow?.levels.length)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          updateClaimType(claimType.id, {
                                            approvalWorkflow: {
                                              levels: [createEmptyApprovalLevel(0)],
                                            },
                                          });
                                        } else {
                                          updateClaimType(claimType.id, {
                                            approvalWorkflow: undefined,
                                          });
                                        }
                                      }}
                                    />
                                    <span className="toggle-track" />
                                    <span className="toggle-thumb" />
                                  </label>
                                </div>

                                {claimType.approvalWorkflow?.levels.length ? (
                                  <div className="claims-approvalList" style={{ marginTop: "1rem" }}>
                                    {claimType.approvalWorkflow.levels.map((level) => (
                                      <div key={level.id} className="claims-approvalRow">
                                        <input
                                          className="form-input"
                                          type="number"
                                          min={1}
                                          step={1}
                                          value={level.order}
                                          onChange={(e) =>
                                            updateClaimType(claimType.id, {
                                              approvalWorkflow: {
                                                levels: claimType.approvalWorkflow!.levels.map((item) =>
                                                  item.id === level.id ? { ...item, order: e.target.value } : item
                                                ),
                                              },
                                            })
                                          }
                                        />
                                        <select
                                          className="form-input"
                                          value={level.designationId}
                                          onChange={(e) =>
                                            updateClaimType(claimType.id, {
                                              approvalWorkflow: {
                                                levels: claimType.approvalWorkflow!.levels.map((item) =>
                                                  item.id === level.id ? { ...item, designationId: e.target.value } : item
                                                ),
                                              },
                                            })
                                          }
                                        >
                                          <option value="">Select designation</option>
                                          {designations.map((designation) => (
                                            <option key={designation.id} value={designation.id}>
                                              {designation.name}
                                            </option>
                                          ))}
                                        </select>
                                        <select
                                          className="form-input"
                                          value={level.mode}
                                          onChange={(e) =>
                                            updateClaimType(claimType.id, {
                                              approvalWorkflow: {
                                                levels: claimType.approvalWorkflow!.levels.map((item) =>
                                                  item.id === level.id ? { ...item, mode: e.target.value as ClaimApprovalMode } : item
                                                ),
                                              },
                                            })
                                          }
                                        >
                                          {["App", "Web", "Both"].map((mode) => (
                                            <option key={mode} value={mode}>{mode}</option>
                                          ))}
                                        </select>
                                        <button
                                          className="claims-cardBtn danger"
                                          onClick={() =>
                                            updateClaimType(claimType.id, {
                                              approvalWorkflow: {
                                                levels: claimType.approvalWorkflow!.levels.filter((item) => item.id !== level.id),
                                              },
                                            })
                                          }
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    ))}
                                    <button
                                      className="claims-cardBtn"
                                      onClick={() =>
                                        updateClaimType(claimType.id, {
                                          approvalWorkflow: {
                                            levels: [
                                              ...claimType.approvalWorkflow!.levels,
                                              createEmptyApprovalLevel(claimType.approvalWorkflow!.levels.length),
                                            ],
                                          },
                                        })
                                      }
                                    >
                                      <Plus size={12} /> Add Approval Level
                                    </button>
                                  </div>
                                ) : null}
                              </div>

                              <div className="claims-rowEnd">
                                <button
                                  className="claims-cardBtn danger"
                                  onClick={() =>
                                    updateTemplate(
                                      "claimTypes",
                                      activeTemplate.claimTypes.filter((item) => item.id !== claimType.id),
                                    )
                                  }
                                >
                                  <Trash2 size={12} /> Remove Type
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>

              <aside className="claims-editorSide">
                <section className="claims-sectionCard">
                  <div className="claims-sectionCard__head">
                    <div>
                      <p className="claims-sectionEyebrow">Wizard Status</p>
                      <h2>Project Completion</h2>
                    </div>
                  </div>
                  <div className="claims-wizardItems compact">
                    {claimsFlowItems.map((step) => (
                      <div key={step.key} className="claims-wizardItem">
                        <span className={`claims-wizardDot ${step.status === "COMPLETED" ? "done" : ""}`} />
                        <div>
                          <strong>{step.key.replaceAll("_", " ")}</strong>
                          <p>{step.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </aside>
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
              <ClaimsFormBuilderV2
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
                onBack={() => setView("editor")}
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
