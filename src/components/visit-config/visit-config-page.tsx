"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, MapPin, Plus, Trash2 } from "lucide-react";
import {
  designationService,
  formatApiError,
  visitConfigService,
  type Designation,
  type JourneyTabDocument,
  type StoreDetail,
  type UdfSchemaField,
  type ApprovalAutoAction,
  type UpsertVisitConfigInput,
  type VisitApprovalApproverType,
  type VisitApprovalLevel,
  type VisitConfigDocument,
} from "@/lib/api";
import { projectAdminBase } from "@/lib/nav/nav";
import { If2Toast, type ToastState } from "@/components/accounts/if2-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ClaimsFormBuilderV2 } from "@/components/claims-config/claims-form-builder-v2";
import { ResubmissionAttemptsField } from "@/components/approval/resubmission-attempts-field";
import { parseResubmissionAttempts, resubmissionAttemptsError } from "@/lib/approval/resubmission-attempts";
import { RejectionReasonsSection } from "@/components/approval/rejection-reasons-section";
import {
  emptyRejectionReasons,
  rejectionReasonsToDto,
  rejectionReasonsToForm,
  validateRejectionReasons,
  type RejectionReasonsForm,
} from "@/lib/approval/rejection-reasons";

type View = "list" | "config" | "builder" | "review";
type ScopeMode = "single" | "multiple";
type BuilderTarget =
  | { kind: "landing"; fieldSet: "pjp_only" | "all_mapped" }
  | { kind: "tab"; tab: JourneyTabDocument };

function autoActionDaysForSave(level: VisitApprovalLevel): number {
  if (level.autoAction === "None") return 0;
  return Number(level.autoActionDays) || 0;
}

function patchAutoAction(
  action: ApprovalAutoAction,
  currentDays: number,
): Pick<VisitApprovalLevel, "autoAction" | "autoActionDays"> {
  return {
    autoAction: action,
    autoActionDays: action === "None" ? 0 : currentDays || 1,
  };
}

interface ApprovalEditor {
  approvalWorkflowEnabled: boolean;
  maximumResubmissionAttempts: string;
  notifyApproverOnRoute: boolean;
  approvalLevels: VisitApprovalLevel[];
  rejectionReasons: RejectionReasonsForm;
}

interface EditorState extends ApprovalEditor {
  designationIds: string[];
  isModuleEnabled: boolean;
  mandatoryCheckIn: boolean;
  visitType: "direct" | "store";
  storeMappingMode: "direct_store" | "pjp" | null;
  storeSource?: VisitConfigDocument["storeSource"];
  daySummaryMode?: VisitConfigDocument["daySummaryMode"];
  checkoutReminder?: VisitConfigDocument["checkoutReminder"];
  allowAllMappedStores: boolean;
  geoFenceRadius: string;
  reimbursementEnabled: boolean;
  multiplicationFactor: string;
  perKmRate: string;
  fromLocationType: string;
  toLocationType: string;
  calculationMethod: string;
  daySummaryEnabled: boolean;
  blockVisitAfterAttendanceCheckout: boolean;
  odApproval?: ApprovalEditor;
  claimDistanceCappingEnabled: boolean;
  claimMaxDistanceKm: string;
  status: "draft" | "published";
  journeyTabs: JourneyTabDocument[];
  landingPageConfig: VisitConfigDocument["landingPageConfig"];
}

const EMPTY_EDITOR: EditorState = {
  designationIds: [],
  isModuleEnabled: true,
  mandatoryCheckIn: false,
  visitType: "direct",
  storeMappingMode: null,
  allowAllMappedStores: false,
  geoFenceRadius: "200",
  reimbursementEnabled: false,
  multiplicationFactor: "1",
  perKmRate: "0",
  fromLocationType: "attendance_mark_in",
  toLocationType: "attendance_mark_out",
  calculationMethod: "google_api_random",
  daySummaryEnabled: false,
  blockVisitAfterAttendanceCheckout: false,
  approvalWorkflowEnabled: false,
  maximumResubmissionAttempts: "0",
  notifyApproverOnRoute: false,
  approvalLevels: [],
  rejectionReasons: emptyRejectionReasons(),
  claimDistanceCappingEnabled: false,
  claimMaxDistanceKm: "0",
  status: "draft",
  journeyTabs: [],
  landingPageConfig: {
    udfSchemaKey: "",
    storeTypeToggle: {
      enabled: false,
      defaultMode: "pjp_only",
      pjpLabel: "PJP Today",
      allStoresLabel: "All Stores",
    },
    fieldSets: {},
  },
};

const DEFAULT_OD_APPROVAL: ApprovalEditor = {
  approvalWorkflowEnabled: true,
  maximumResubmissionAttempts: "1",
  notifyApproverOnRoute: true,
  approvalLevels: [{
    level: 1,
    label: "Mapped OD approver",
    approverType: "mapped_od_approver",
    autoAction: "AutoReject",
    autoActionDays: 10,
  }],
  rejectionReasons: emptyRejectionReasons(),
};

function workflowToEditor(workflow: VisitConfigDocument["approvalWorkflow"]): ApprovalEditor {
  return {
    approvalWorkflowEnabled: workflow.isEnabled,
    maximumResubmissionAttempts: String(workflow.maximumResubmissionAttempts ?? 0),
    notifyApproverOnRoute: Boolean(workflow.notifyApproverOnRoute),
    approvalLevels: workflow.levels.map((level, index) => ({
      ...level,
      level: index + 1,
      approverType: level.approverType ?? "direct_manager",
      autoAction: level.autoAction ?? "None",
      autoActionDays: level.autoAction === "None" ? 0 : level.autoActionDays || 1,
    })),
    rejectionReasons: rejectionReasonsToForm(workflow.rejectionReasons),
  };
}

function toEditor(config: VisitConfigDocument): EditorState {
  return {
    designationIds: [config.designationId],
    isModuleEnabled: config.isModuleEnabled,
    mandatoryCheckIn: config.mandatoryCheckIn,
    visitType: config.visitType,
    storeMappingMode: config.storeMappingMode,
    storeSource: config.storeSource,
    daySummaryMode: config.daySummaryMode,
    checkoutReminder: config.checkoutReminder,
    allowAllMappedStores: config.allowAllMappedStores,
    geoFenceRadius: String(config.geoFenceConfig.radius),
    reimbursementEnabled: config.reimbursementConfig.isEnabled,
    multiplicationFactor: String(config.reimbursementConfig.multiplicationFactor),
    perKmRate: String(config.reimbursementConfig.perKmRate),
    fromLocationType: config.distanceConfig.fromLocationType || "attendance_mark_in",
    toLocationType: config.distanceConfig.toLocationType || "attendance_mark_out",
    calculationMethod: config.distanceConfig.calculationMethod || "google_api_random",
    daySummaryEnabled: config.daySummaryEnabled,
    blockVisitAfterAttendanceCheckout: config.blockVisitAfterAttendanceCheckout,
    ...workflowToEditor(config.approvalWorkflow),
    ...(config.odApprovalWorkflow ? { odApproval: workflowToEditor(config.odApprovalWorkflow) } : {}),
    claimDistanceCappingEnabled: config.claimDistanceCapping.isEnabled,
    claimMaxDistanceKm: String(config.claimDistanceCapping.maxDistanceKm),
    status: config.status,
    journeyTabs: [...config.journeyTabs].sort((a, b) => a.order - b.order),
    landingPageConfig: config.landingPageConfig,
  };
}

export function visitApprovalWorkflowForSave(editor: ApprovalEditor & Pick<EditorState, "reimbursementEnabled">) {
  return approvalWorkflowForSave({
    ...editor,
    approvalWorkflowEnabled: editor.reimbursementEnabled && editor.approvalWorkflowEnabled,
  });
}

function approvalWorkflowForSave(editor: ApprovalEditor, saveLevels = editor.approvalWorkflowEnabled) {
  return {
    maximumResubmissionAttempts: parseResubmissionAttempts(editor.maximumResubmissionAttempts),
    isEnabled: editor.approvalWorkflowEnabled,
    notifyApproverOnRoute: editor.notifyApproverOnRoute,
    levels: saveLevels
      ? editor.approvalLevels.map((level, index) => ({
          level: index + 1,
          label: level.label?.trim() || undefined,
          approverType: level.approverType ?? "direct_manager",
          approverDesignationId: level.approverType === "mapped_od_approver" ? undefined : level.approverDesignationId || undefined,
          autoAction: level.autoAction ?? "None",
          autoActionDays: autoActionDaysForSave(level),
        }))
      : [],
    // Always sent so both settings survive switching approval off and on.
    rejectionReasons: rejectionReasonsToDto(editor.rejectionReasons),
  };
}

function isPendingTab(tab: JourneyTabDocument): boolean {
  return tab.tabId.startsWith("pending_");
}

function validate(editor: EditorState): string[] {
  const errors: string[] = [];
  const isOd = editor.daySummaryMode === "od_visit";
  const approval = isOd ? editor.odApproval : editor;
  const retryError = approval && resubmissionAttemptsError(approval.maximumResubmissionAttempts);
  if (retryError) errors.push(retryError);
  if (editor.designationIds.length === 0) errors.push("Select at least one designation.");
  if (editor.visitType === "store" && editor.storeSource !== "google_places" && !editor.storeMappingMode) {
    errors.push("Select a store mapping method.");
  }
  if (editor.checkoutReminder?.enabled && (!Number.isInteger(editor.checkoutReminder.intervalMinutes)
    || editor.checkoutReminder.intervalMinutes < 1 || editor.checkoutReminder.intervalMinutes > 1440)) {
    errors.push("Checkout reminder must be between 1 and 1440 minutes.");
  }
  if (editor.journeyTabs.some((tab) => tab.isActive && tab.isGeoFenced)) {
    const radius = Number(editor.geoFenceRadius);
    if (!Number.isFinite(radius) || radius <= 0) {
      errors.push("Geo-fence radius must be positive.");
    }
  }
  if (editor.reimbursementEnabled) {
    if (Number(editor.multiplicationFactor) <= 0) {
      errors.push("Multiplication factor must be positive.");
    }
    if (Number(editor.perKmRate) <= 0) {
      errors.push("Per-km rate must be positive.");
    }
  }
  if ((isOd || editor.reimbursementEnabled) && approval?.approvalWorkflowEnabled) {
    if (!isOd && !editor.daySummaryEnabled) {
      errors.push("Visit Day Summary should be enabled before enabling Visit day approval.");
    }
    if (approval.approvalLevels.length === 0) {
      errors.push("Visit approval workflow must include at least one approval level.");
    }
    if (approval.approvalLevels.length > 10) {
      errors.push("Visit approval workflow supports a maximum of 10 levels.");
    }
    approval.approvalLevels.forEach((level, index) => {
      const levelNumber = index + 1;
      if (levelNumber < 1 || levelNumber > 10) {
        errors.push("Visit approval levels must be between 1 and 10.");
      }
      if ((level.label ?? "").length > 100) {
        errors.push(`Approval level ${levelNumber} label must be 100 characters or fewer.`);
      }
      if (level.approverType !== "direct_manager" && level.approverType !== "designation" && !(isOd && level.approverType === "mapped_od_approver")) {
        errors.push(`Approval level ${levelNumber} must use a valid approver type.`);
      }
      if (level.approverType === "designation" && !level.approverDesignationId) {
        errors.push(`Select an approver designation for approval level ${levelNumber}.`);
      }
      if (
        level.autoAction !== "None" &&
        level.autoAction !== "AutoApprove" &&
        level.autoAction !== "AutoReject"
      ) {
        errors.push(`Approval level ${levelNumber} must use a valid auto action.`);
      }
      const autoActionDays = Number(level.autoActionDays);
      if (
        level.autoAction !== "None" &&
        (!Number.isFinite(autoActionDays) ||
          !Number.isInteger(autoActionDays) ||
          autoActionDays < 1 ||
          autoActionDays > 30)
      ) {
        errors.push(`Approval level ${levelNumber} auto action days must be between 1 and 30.`);
      }
    });
    errors.push(...validateRejectionReasons(approval.rejectionReasons));
  }
  if (editor.reimbursementEnabled && editor.claimDistanceCappingEnabled) {
    if (Number(editor.claimMaxDistanceKm) <= 0) {
      errors.push("Visit claim distance capping requires a positive maximum distance.");
    }
  }
  return errors;
}

export function VisitConfigPage({
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
  const [view, setView] = useState<View>("list");
  const [scopeMode, setScopeMode] = useState<ScopeMode>("single");
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [configs, setConfigs] = useState<VisitConfigDocument[]>([]);
  const [editor, setEditor] = useState<EditorState>(EMPTY_EDITOR);
  const isOdDaySummary = editor.daySummaryMode === "od_visit";
  const approval = isOdDaySummary ? editor.odApproval ?? DEFAULT_OD_APPROVAL : editor;
  const [activeDesignationId, setActiveDesignationId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<VisitConfigDocument | null>(null);
  const [newTabName, setNewTabName] = useState("");
  const [builderTarget, setBuilderTarget] = useState<BuilderTarget | null>(null);
  const [builderFields, setBuilderFields] = useState<UdfSchemaField[]>([]);
  const [savedBuilderFields, setSavedBuilderFields] = useState<UdfSchemaField[]>([]);
  const [builderLoading, setBuilderLoading] = useState(false);
  const [builderError, setBuilderError] = useState<string | null>(null);
  const [schemaFieldsByKey, setSchemaFieldsByKey] = useState<Record<string, UdfSchemaField[]>>({});
  const [landingStores, setLandingStores] = useState<{ pjp: StoreDetail[]; all: StoreDetail[] }>({ pjp: [], all: [] });
  const [storesLoading, setStoresLoading] = useState(false);

  const base = projectAdminBase(accountCode, projectCode);
  const activeConfig = configs.find((item) => item.designationId === activeDesignationId) ?? null;
  const activeDesignation = designations.find((item) => item.id === activeDesignationId);
  const pjpSchemaKey = activeDesignationId
    ? editor.landingPageConfig.fieldSets.pjp_only?.udfSchemaKey ||
      `${projectId}_${activeDesignationId}_landing_page_pjp`
    : "";
  const allStoresSchemaKey = activeDesignationId
    ? editor.landingPageConfig.fieldSets.all_mapped?.udfSchemaKey ||
      `${projectId}_${activeDesignationId}_landing_page_all_mapped`
    : "";
  const hasPjpLandingForm = Boolean(
    editor.landingPageConfig.fieldSets.pjp_only?.udfSchemaKey ||
      schemaFieldsByKey[pjpSchemaKey]?.length,
  );
  const hasAllStoresLandingForm = Boolean(
    editor.landingPageConfig.fieldSets.all_mapped?.udfSchemaKey ||
      schemaFieldsByKey[allStoresSchemaKey]?.length,
  );
  const showLandingForms =
    editor.designationIds.length > 0 &&
    editor.visitType === "store" &&
    (editor.storeMappingMode === "pjp" || hasPjpLandingForm || hasAllStoresLandingForm);
  const schemaKeys = useMemo(
    () =>
      [
        ...(editor.visitType === "store" && editor.storeMappingMode === "pjp"
          ? [pjpSchemaKey, allStoresSchemaKey]
          : []),
        ...editor.journeyTabs.map((tab) => tab.udfSchemaKey),
      ].filter((key): key is string => Boolean(key)),
    [
      allStoresSchemaKey,
      editor.journeyTabs,
      editor.storeMappingMode,
      editor.visitType,
      pjpSchemaKey,
    ],
  );
  const schemaSignature = schemaKeys.join("|");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const designationList = await designationService.listByProject(projectId);
      const values = await Promise.all(
        designationList.map((designation) =>
          visitConfigService.getConfig(projectId, designation.id),
        ),
      );
      setDesignations(designationList);
      setConfigs(values.filter((value): value is VisitConfigDocument => Boolean(value)));
    } catch (error) {
      setToast({ type: "error", message: formatApiError(error, "Failed to load visit configurations") });
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const keys = schemaSignature ? schemaSignature.split("|") : [];
    if (!activeDesignationId || keys.length === 0) {
      setSchemaFieldsByKey({});
      return;
    }
    let cancelled = false;
    async function preloadSchemas() {
      const entries = await Promise.all(
        keys.map(async (schemaKey) => {
          try {
            const schema = await visitConfigService.getUdfSchema(projectId, schemaKey);
            return [schemaKey, schema?.fields ?? []] as const;
          } catch {
            return [schemaKey, []] as const;
          }
        }),
      );
      if (!cancelled) setSchemaFieldsByKey(Object.fromEntries(entries));
    }
    void preloadSchemas();
    return () => {
      cancelled = true;
    };
  }, [activeDesignationId, projectId, schemaSignature]);

  // Fetch stores for landing page preview when a config with store type is selected
  useEffect(() => {
    if (!activeDesignationId || !showLandingForms) {
      setLandingStores({ pjp: [], all: [] });
      return;
    }
    let cancelled = false;
    async function fetchStores() {
      setStoresLoading(true);
      try {
        const pjpResult = await visitConfigService.getStoresForType(
          projectId,
          activeDesignationId,
          "pjp_only",
        );
        const allResult = editor.allowAllMappedStores
          ? await visitConfigService.getStoresForType(projectId, activeDesignationId, "all_mapped")
          : { storeType: "all_mapped", stores: [] as StoreDetail[], fieldSet: undefined };
        if (!cancelled) {
          setLandingStores({ pjp: pjpResult.stores, all: allResult.stores });
          setSchemaFieldsByKey((current) => ({
            ...current,
            ...(pjpResult.fieldSet?.udfSchemaKey
              ? { [pjpResult.fieldSet.udfSchemaKey]: pjpResult.fieldSet.fields }
              : {}),
            ...(allResult.fieldSet?.udfSchemaKey
              ? { [allResult.fieldSet.udfSchemaKey]: allResult.fieldSet.fields }
              : {}),
          }));
          setEditor((current) => ({
            ...current,
            landingPageConfig: {
              ...current.landingPageConfig,
              fieldSets: {
                ...current.landingPageConfig.fieldSets,
                ...(pjpResult.fieldSet?.udfSchemaKey
                  ? { pjp_only: { udfSchemaKey: pjpResult.fieldSet.udfSchemaKey } }
                  : {}),
                ...(allResult.fieldSet?.udfSchemaKey
                  ? { all_mapped: { udfSchemaKey: allResult.fieldSet.udfSchemaKey } }
                  : {}),
              },
            },
          }));
        }
      } catch {
        // Store preview is non-critical; silently handle failure
        if (!cancelled) {
          setLandingStores({ pjp: [], all: [] });
        }
      } finally {
        if (!cancelled) setStoresLoading(false);
      }
    }
    void fetchStores();
    return () => { cancelled = true; };
  }, [activeDesignationId, showLandingForms, projectId, editor.allowAllMappedStores]);

  function selectDesignation(id: string) {
    setEditor((current) => ({
      ...current,
      designationIds:
        scopeMode === "single"
          ? [id]
          : current.designationIds.includes(id)
            ? current.designationIds.filter((value) => value !== id)
            : [...current.designationIds, id],
    }));
  }

  function updateApproval(update: (current: ApprovalEditor) => ApprovalEditor) {
    setEditor((current) => current.daySummaryMode === "od_visit"
      ? { ...current, odApproval: update(current.odApproval ?? DEFAULT_OD_APPROVAL) }
      : { ...current, ...update(current) });
  }

  function addApprovalLevel() {
    updateApproval((current) => {
      if (current.approvalLevels.length >= 10) return current;
      return {
        ...current,
        approvalLevels: [
          ...current.approvalLevels,
          {
            level: current.approvalLevels.length + 1,
            label: current.approvalLevels.length === 0 ? "Manager Approval" : "",
            approverType: "direct_manager",
            autoAction: "None",
            autoActionDays: 0,
          },
        ],
      };
    });
  }

  function patchApprovalLevel(index: number, patch: Partial<VisitApprovalLevel>) {
    updateApproval((current) => ({
      ...current,
      approvalLevels: current.approvalLevels.map((level, levelIndex) =>
        levelIndex === index
          ? {
              ...level,
              ...patch,
              ...(!isOdDaySummary ? {
                approverDesignationId: patch.approverDesignationId ?? level.approverDesignationId,
              } : {}),
            }
          : level,
      ),
    }));
  }

  function moveApprovalLevel(index: number, direction: -1 | 1) {
    updateApproval((current) => {
      const next = [...current.approvalLevels];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return {
        ...current,
        approvalLevels: next.map((level, levelIndex) => ({ ...level, level: levelIndex + 1 })),
      };
    });
  }

  function removeApprovalLevel(index: number) {
    updateApproval((current) => ({
      ...current,
      approvalLevels: current.approvalLevels
        .filter((_, levelIndex) => levelIndex !== index)
        .map((level, levelIndex) => ({ ...level, level: levelIndex + 1 })),
    }));
  }

  function toggleClaimDistanceCapping(enabled: boolean) {
    setEditor((current) => ({
      ...current,
      claimDistanceCappingEnabled: enabled,
      claimMaxDistanceKm:
        enabled && Number(current.claimMaxDistanceKm) <= 0 ? "100" : current.claimMaxDistanceKm,
    }));
  }

  function startCreate() {
    setScopeMode("single");
    setEditor({ 
      ...EMPTY_EDITOR, 
      designationIds: [],
      // Auto-enable landing page when creating new config with PJP
      landingPageConfig: {
        udfSchemaKey: "",
        storeTypeToggle: {
          enabled: true,
          defaultMode: "pjp_only",
          pjpLabel: "PJP Today",
          allStoresLabel: "All Stores",
        },
        fieldSets: {},
      },
    });
    setActiveDesignationId("");
    setErrors([]);
    setSchemaFieldsByKey({});
    setView("config");
  }

  async function startEdit(config: VisitConfigDocument) {
    setLoading(true);
    setScopeMode("single");
    try {
      const current =
        (await visitConfigService.getConfig(projectId, config.designationId)) ??
        config;
      setEditor(toEditor(current));
      setActiveDesignationId(current.designationId);
      setErrors([]);
      setView("config");
    } catch (error) {
      setToast({
        type: "error",
        message: formatApiError(error, "Failed to load current visit configuration"),
      });
    } finally {
      setLoading(false);
    }
  }

  function buildPayload(designationId: string, status: "draft" | "published"): UpsertVisitConfigInput {
    return {
      projectId,
      designationId,
      isModuleEnabled: editor.isModuleEnabled,
      mandatoryCheckIn: editor.mandatoryCheckIn,
      visitType: editor.visitType,
      storeMappingMode: editor.visitType === "store" && editor.storeSource !== "google_places" ? editor.storeMappingMode : null,
      ...(editor.storeSource ? { storeSource: editor.storeSource } : {}),
      ...(editor.daySummaryMode ? { daySummaryMode: editor.daySummaryMode } : {}),
      ...(editor.checkoutReminder ? { checkoutReminder: editor.checkoutReminder } : {}),
      allowAllMappedStores:
        editor.storeMappingMode === "pjp" && editor.allowAllMappedStores,
      geoFenceConfig: { radius: Number(editor.geoFenceRadius) || 0 },
      reimbursementConfig: {
        isEnabled: editor.reimbursementEnabled,
        multiplicationFactor: Number(editor.multiplicationFactor) || 0,
        perKmRate: Number(editor.perKmRate) || 0,
      },
      distanceConfig: {
        fromLocationType: editor.fromLocationType,
        toLocationType: editor.toLocationType,
        calculationMethod: editor.calculationMethod,
      },
      ...(!isOdDaySummary ? { daySummaryEnabled: editor.reimbursementEnabled && editor.daySummaryEnabled } : {}),
      blockVisitAfterAttendanceCheckout: editor.blockVisitAfterAttendanceCheckout,
      ...(!isOdDaySummary
        ? { approvalWorkflow: visitApprovalWorkflowForSave(editor) }
        : editor.odApproval
          ? { odApprovalWorkflow: approvalWorkflowForSave(editor.odApproval, true) }
          : {}),
      claimDistanceCapping: {
        isEnabled: editor.reimbursementEnabled && editor.claimDistanceCappingEnabled,
        maxDistanceKm: Number(editor.claimMaxDistanceKm) || 0,
      },
      ...(editor.visitType === "store" && editor.storeMappingMode === "pjp"
        ? { landingPageConfig: editor.landingPageConfig }
        : {}),
      status,
    };
  }

  async function saveConfig(draft: boolean, proceed = false) {
    const validationErrors = validate(editor);
    if (validationErrors.length) {
      setErrors(validationErrors);
      return;
    }
    setSaving(true);
    setErrors([]);
    try {
      const pendingTabs = editor.journeyTabs.filter(isPendingTab).sort((a, b) => a.order - b.order);
      const saved = await Promise.all(
        editor.designationIds.map((designationId) =>
          visitConfigService.save(buildPayload(designationId, draft ? "draft" : editor.status), draft),
        ),
      );
      if (pendingTabs.length > 0) {
        await Promise.all(
          editor.designationIds.map(async (designationId) => {
            for (const tab of pendingTabs) {
              await visitConfigService.addTab({
                projectId,
                designationId,
                name: tab.name,
                isMandatory: tab.isMandatory,
                isGeoFenced: tab.isGeoFenced,
                isActive: tab.isActive,
                isRequiredForAdvancement: tab.isRequiredForAdvancement,
              });
            }
          }),
        );
      }
      await load();
      const primary =
        (await visitConfigService.getConfig(projectId, saved[0].designationId)) ??
        saved[0];
      setActiveDesignationId(primary.designationId);
      setEditor(toEditor(primary));
      setToast({
        type: "success",
        message:
          saved.length > 1
            ? `Configuration saved for ${saved.length} designations. Configure forms for each designation separately.`
            : draft
              ? "Draft saved."
              : "Configuration saved.",
      });
      if (proceed) {
        if (primary.visitType === "store" && primary.storeMappingMode === "pjp") {
          await openLandingBuilder("pjp_only", primary);
        } else {
          setView("config");
        }
      }
    } catch (error) {
      setToast({ type: "error", message: formatApiError(error, "Failed to save visit configuration") });
    } finally {
      setSaving(false);
    }
  }

  async function refreshActiveConfig() {
    if (!activeDesignationId) return null;
    const config = await visitConfigService.getConfig(projectId, activeDesignationId);
    if (config) {
      setSavedJourneyTabs(config);
      setConfigs((current) => [
        ...current.filter((item) => item.designationId !== config.designationId),
        config,
      ]);
    }
    return config;
  }

  function setSavedJourneyTabs(config: VisitConfigDocument) {
    setEditor((current) => ({
      ...current,
      journeyTabs: [...config.journeyTabs].sort((a, b) => a.order - b.order),
    }));
  }

  async function addTab() {
    if (!newTabName.trim()) return;
    if (!activeDesignationId) {
      setEditor((current) => ({
        ...current,
        journeyTabs: [
          ...current.journeyTabs,
          {
            tabId: `pending_${Date.now()}`,
            name: newTabName.trim(),
            order: current.journeyTabs.length + 1,
            isMandatory: false,
            isGeoFenced: false,
            isActive: true,
            isRequiredForAdvancement: false,
            udfSchemaKey: "",
          },
        ],
      }));
      setNewTabName("");
      return;
    }
    setSaving(true);
    try {
      await visitConfigService.addTab({
        projectId,
        designationId: activeDesignationId,
        name: newTabName.trim(),
      });
      setNewTabName("");
      await refreshActiveConfig();
      setToast({ type: "success", message: "Journey tab added." });
    } catch (error) {
      setToast({ type: "error", message: formatApiError(error, "Failed to add journey tab") });
    } finally {
      setSaving(false);
    }
  }

  async function patchTab(tab: JourneyTabDocument, patch: Partial<JourneyTabDocument>) {
    if (isPendingTab(tab)) {
      setEditor((current) => ({
        ...current,
        journeyTabs: current.journeyTabs.map((item) =>
          item.tabId === tab.tabId ? { ...item, ...patch } : item,
        ),
      }));
      return;
    }
    try {
      const config = await visitConfigService.updateTab(
        tab.tabId,
        projectId,
        activeDesignationId,
        patch,
      );
      setSavedJourneyTabs(config);
    } catch (error) {
      setToast({ type: "error", message: formatApiError(error, "Failed to update journey tab") });
    }
  }

  async function moveTab(tabId: string, direction: -1 | 1) {
    const ordered = [...editor.journeyTabs].sort((a, b) => a.order - b.order);
    const index = ordered.findIndex((tab) => tab.tabId === tabId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) return;
    [ordered[index], ordered[targetIndex]] = [ordered[targetIndex], ordered[index]];
    if (!activeDesignationId || ordered.some(isPendingTab)) {
      setEditor((current) => ({
        ...current,
        journeyTabs: ordered.map((tab, tabIndex) => ({
          ...tab,
          order: tabIndex + 1,
        })),
      }));
      return;
    }
    try {
      const config = await visitConfigService.reorderTabs(
        projectId,
        activeDesignationId,
        ordered,
      );
      setSavedJourneyTabs(config);
    } catch (error) {
      setToast({ type: "error", message: formatApiError(error, "Failed to reorder journey tabs") });
    }
  }

  async function openLandingBuilder(
    fieldSet: "pjp_only" | "all_mapped",
    config = activeConfig,
  ) {
    // For new configs that haven't been saved yet, use editor state
    const designationId = config?.designationId || activeDesignationId || editor.designationIds[0];
    if (!designationId) return;

    const schemaKey = config?.landingPageConfig.fieldSets[fieldSet]?.udfSchemaKey ||
      editor.landingPageConfig.fieldSets[fieldSet]?.udfSchemaKey ||
      (fieldSet === "pjp_only"
        ? `${projectId}_${designationId}_landing_page_pjp`
        : `${projectId}_${designationId}_landing_page_all_mapped`);
    setBuilderTarget({ kind: "landing", fieldSet });
    setBuilderLoading(true);
    setBuilderError(null);
    setView("builder");
    try {
      const cachedFields = schemaKey ? schemaFieldsByKey[schemaKey] : undefined;
      const fields =
        cachedFields ??
        (schemaKey
          ? (await visitConfigService.getUdfSchema(projectId, schemaKey))?.fields ?? []
          : []);
      setBuilderFields(fields);
      setSavedBuilderFields(fields);
    } catch {
      // If schema doesn't exist yet (404), start with empty form
      setBuilderError(null);
      setBuilderFields([]);
      setSavedBuilderFields([]);
    } finally {
      setBuilderLoading(false);
    }
  }

  async function openTabBuilder(tab: JourneyTabDocument) {
    setBuilderTarget({ kind: "tab", tab });
    setBuilderLoading(true);
    setBuilderError(null);
    setView("builder");
    try {
      const fields =
        schemaFieldsByKey[tab.udfSchemaKey] ??
        (await visitConfigService.getUdfSchema(projectId, tab.udfSchemaKey))?.fields ??
        [];
      setBuilderFields(fields);
      setSavedBuilderFields(fields);
    } catch (error) {
      setBuilderError(formatApiError(error, "Failed to load journey form"));
      setBuilderFields([]);
      setSavedBuilderFields([]);
    } finally {
      setBuilderLoading(false);
    }
  }

  async function saveBuilder() {
    if (!builderTarget) return;
    const designationId = activeDesignationId || editor.designationIds[0];
    if (!designationId) return;
    setSaving(true);
    setBuilderError(null);
    try {
      if (builderTarget.kind === "tab") {
        await visitConfigService.publishTab(
          builderTarget.tab.tabId,
          projectId,
          designationId,
          builderFields,
        );
      } else {
        // For new configs that don't exist yet, just save as draft with inline fields
        await visitConfigService.save({
          ...buildPayload(designationId, "draft"),
          landingPageConfig: {
            ...editor.landingPageConfig,
            storeTypeToggle: {
              ...editor.landingPageConfig.storeTypeToggle,
              enabled: editor.storeMappingMode === "pjp",
            },
            fieldSets: {
              pjp_only:
                builderTarget.fieldSet === "pjp_only"
                  ? { fields: builderFields }
                  : editor.landingPageConfig.fieldSets.pjp_only,
              all_mapped:
                builderTarget.fieldSet === "all_mapped"
                  ? { fields: builderFields }
                  : editor.landingPageConfig.fieldSets.all_mapped,
            },
          },
        }, true);
      }
      setSavedBuilderFields(builderFields);
      // Update activeDesignationId if this was a first save
      if (!activeDesignationId) {
        setActiveDesignationId(designationId);
      }
      const refreshed = await visitConfigService.getConfig(projectId, designationId);
      if (refreshed) {
        if (builderTarget.kind === "tab") {
          setSavedJourneyTabs(refreshed);
        } else {
          setEditor(toEditor(refreshed));
        }
        setConfigs((current) => [
          ...current.filter((item) => item.designationId !== refreshed.designationId),
          refreshed,
        ]);
        const schemaKey =
          builderTarget.kind === "tab"
            ? builderTarget.tab.udfSchemaKey
            : refreshed.landingPageConfig.fieldSets[builderTarget.fieldSet]?.udfSchemaKey;
        if (schemaKey) {
          setSchemaFieldsByKey((current) => ({
            ...current,
            [schemaKey]: builderFields,
          }));
        }
      }
      setToast({ type: "success", message: "Form saved and published." });
    } catch (error) {
      setBuilderError(formatApiError(error, "Failed to publish form"));
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    const validationErrors = validate(editor);
    if (validationErrors.length) {
      setErrors(validationErrors);
      setView("config");
      return;
    }
    const activeTabs = editor.journeyTabs.filter((tab) => tab.isActive);
    if (editor.storeSource !== "google_places" && activeTabs.length === 0) {
      setErrors(["Add at least one active journey tab before publishing."]);
      setView("config");
      return;
    }
    setSaving(true);
    try {
      const config = await visitConfigService.save(
        buildPayload(activeDesignationId, "published"),
      );
      setEditor(toEditor(config));
      await load();
      setToast({ type: "success", message: "Visit configuration published." });
      setView("list");
    } catch (error) {
      setToast({ type: "error", message: formatApiError(error, "Failed to publish visit configuration") });
    } finally {
      setSaving(false);
    }
  }

  const builderTitle = useMemo(() => {
    if (!builderTarget) return "Visit Form";
    if (builderTarget.kind === "tab") return builderTarget.tab.name;
    return builderTarget.fieldSet === "pjp_only" ? "PJP Today · Landing Page" : "All Stores · Landing Page";
  }, [builderTarget]);

  if (view === "builder" && builderTarget) {
    return (
      <>
        <ClaimsFormBuilderV2
          projectId={projectId}
          claimTypeName={builderTitle}
          fields={builderFields}
          savedFields={savedBuilderFields}
          loading={builderLoading}
          saving={saving}
          error={builderError}
          validationErrors={[]}
          onChange={setBuilderFields}
          onSave={() => void saveBuilder()}
          onBack={() => setView("config")}
          moduleLabel="Visit Form"
          showSystemFields={false}
          enableDatasourceFilters
        />
        <If2Toast toast={toast} onDismiss={() => setToast(null)} />
      </>
    );
  }

  if (loading && view === "list") {
    return <div className="visit-config-page"><div className="edit-skeleton"><div className="skeleton-section" /><div className="skeleton-section" /></div></div>;
  }

  return (
    <div className="visit-config-page">
      {view === "list" ? (
        <>
          <div className="visit-page-head">
            <div>
              <Link href={`${base}/modules`} className="visit-back-link">← Modules</Link>
              <div className="visit-eyebrow">Visit & Journey</div>
              <h1>Visit Configurations</h1>
              <p>{projectName} · Configure each designation’s field journey.</p>
            </div>
            <button className="visit-primary-btn" onClick={startCreate}><Plus size={16} /> New Configuration</button>
          </div>
          {configs.length === 0 ? (
            <div className="visit-empty"><MapPin size={34} /><h2>No visit configurations yet</h2><p>Create the first designation workflow.</p></div>
          ) : (
            <div className="visit-config-grid">
              {configs.map((config) => (
                <article className="visit-config-card" key={config.designationId}>
                  <div>
                    <span className={`visit-status ${config.status}`}>{config.status}</span>
                    <h2>{designations.find((item) => item.id === config.designationId)?.name ?? config.designationId}</h2>
                    <p>{config.visitType === "direct" ? "Direct visit" : config.storeMappingMode === "pjp" ? "PJP store visit" : "Direct-store visit"} · {config.journeyTabs.filter((tab) => tab.isActive).length} tabs</p>
                  </div>
                  <div className="visit-card-actions">
                    <button onClick={() => void startEdit(config)}>Edit</button>
                    <button className="danger" onClick={() => setConfirmDelete(config)}><Trash2 size={14} /> Delete</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="visit-page-head compact">
            <div>
              <button className="visit-back-link button" onClick={() => setView("list")}><ArrowLeft size={14} /> Configurations</button>
              <div className="visit-eyebrow">{activeDesignation?.name ?? "New configuration"}</div>
              <h1>Visit setup — configuration</h1>
              <p>Configure journey rules, landing forms, tabs, and reimbursement.</p>
            </div>
          </div>
          <div className="visit-stepper">
            {["Configuration", "Form Builder", "Review & Publish"].map((label, index) => (
              <div className={`visit-step ${view === "review" ? index <= 2 ? "active" : "" : index === 0 ? "active" : ""}`} key={label}><span>{index + 1}</span>{label}</div>
            ))}
          </div>
          {view === "review" ? (
            <div className="visit-review-card">
              <h2>Ready to publish</h2>
              <p>{activeDesignation?.name} · {editor.journeyTabs.filter((tab) => tab.isActive).length} active journey tabs</p>
              <div className="visit-review-actions">
                <button className="visit-secondary-btn" onClick={() => setView("config")}>Back to configuration</button>
                <button className="visit-primary-btn" disabled={saving} onClick={() => void publish()}>{saving ? "Publishing…" : "Publish configuration"}</button>
              </div>
            </div>
          ) : (
            <>
              <section className="visit-section-card">
                <div className="visit-section-title"><span>1</span> Configuration scope</div>
                <div className="visit-scope-tabs">
                  <button className={scopeMode === "single" ? "active" : ""} disabled={Boolean(activeDesignationId)} onClick={() => { setScopeMode("single"); setEditor((current) => ({ ...current, designationIds: current.designationIds.slice(0, 1) })); }}>Single designation</button>
                  <button className={scopeMode === "multiple" ? "active" : ""} disabled={Boolean(activeDesignationId)} onClick={() => setScopeMode("multiple")}>Multiple designations</button>
                </div>
                <div className="visit-designation-grid">
                  {designations.map((designation) => (
                    <label className={editor.designationIds.includes(designation.id) ? "selected" : ""} key={designation.id}>
                      <input type={scopeMode === "single" ? "radio" : "checkbox"} checked={editor.designationIds.includes(designation.id)} disabled={Boolean(activeDesignationId)} onChange={() => selectDesignation(designation.id)} />
                      <span>{designation.name}</span>
                    </label>
                  ))}
                </div>
              </section>

              <section className="visit-section-card">
                <div className="visit-section-title"><span>2</span> Visit type</div>
                <div className="visit-sub-options visit-module-options">
                  <label><input type="checkbox" checked={editor.isModuleEnabled} onChange={(event) => setEditor((current) => ({ ...current, isModuleEnabled: event.target.checked }))} /> Visit module enabled</label>
                  <span className={`visit-status ${editor.status}`}>{editor.status}</span>
                </div>
                <div className="visit-choice-grid">
                  <button className={editor.visitType === "direct" ? "selected" : ""} onClick={() => setEditor((current) => ({ ...current, visitType: "direct", storeMappingMode: null, allowAllMappedStores: false, storeSource: current.storeSource ? "store_master" : undefined, daySummaryMode: current.daySummaryMode === "od_visit" ? "claim" : current.daySummaryMode }))}><strong>Direct visit</strong><small>No store selection or landing page.</small></button>
                  <button className={editor.visitType === "store" ? "selected" : ""} onClick={() => setEditor((current) => ({ ...current, visitType: "store", storeMappingMode: current.storeMappingMode ?? "direct_store" }))}><strong>Store / location visit</strong><small>Use direct mapping or PJP.</small></button>
                </div>
                {editor.visitType === "store" && (
                  <div className="visit-sub-options">
                    <label><input type="radio" checked={editor.storeSource !== "google_places" && editor.storeMappingMode === "direct_store"} onChange={() => setEditor((current) => ({ ...current, storeSource: current.storeSource ? "store_master" : undefined, storeMappingMode: "direct_store", allowAllMappedStores: false }))} /> Direct store mapping</label>
                    <label><input type="radio" checked={editor.storeSource !== "google_places" && editor.storeMappingMode === "pjp"} onChange={() => setEditor((current) => ({ ...current, storeSource: current.storeSource ? "store_master" : undefined, storeMappingMode: "pjp" }))} /> PJP</label>
                    <label><input type="radio" checked={editor.storeSource === "google_places"} onChange={() => setEditor((current) => ({ ...current, storeSource: "google_places", storeMappingMode: null, allowAllMappedStores: false }))} /> Google Places with manual entry</label>
                    {editor.storeMappingMode === "pjp" && <label><input type="checkbox" checked={editor.allowAllMappedStores} onChange={(event) => setEditor((current) => ({ ...current, allowAllMappedStores: event.target.checked }))} /> Allow all mapped stores</label>}
                  </div>
                )}
              </section>

              <section className="visit-section-card">
                <div className="visit-section-title"><span>3</span> Operational rules</div>
                <div className="visit-fields-grid">
                  <label>Geo-fence radius<input type="number" value={editor.geoFenceRadius} onChange={(event) => setEditor((current) => ({ ...current, geoFenceRadius: event.target.value }))} /></label>
                  <label>Distance method<select value={editor.calculationMethod} onChange={(event) => setEditor((current) => ({ ...current, calculationMethod: event.target.value }))}><option value="google_api_random">Google API — Random</option><option value="google_api_breadcrumb">Google API — Breadcrumb</option></select></label>
                  <label>Distance from<select value={editor.fromLocationType} onChange={(event) => setEditor((current) => ({ ...current, fromLocationType: event.target.value }))}><option value="attendance_mark_in">Attendance mark-in</option><option value="first_visit_store">First visit store</option><option value="base_location">Base location</option><option value="attendance_mark_in_if_near_base">Attendance mark-in if near base</option></select></label>
                  <label>Distance to<select value={editor.toLocationType} onChange={(event) => setEditor((current) => ({ ...current, toLocationType: event.target.value }))}><option value="attendance_mark_out">Attendance mark-out</option><option value="last_visit_store">Last visit store</option><option value="base_location">Base location</option><option value="attendance_mark_out_if_near_base">Attendance mark-out if near base</option></select></label>
                  <label className="visit-check"><input type="checkbox" checked={editor.mandatoryCheckIn} onChange={(event) => setEditor((current) => ({ ...current, mandatoryCheckIn: event.target.checked }))} /> Require attendance check-in</label>
                  <label className="visit-check"><input type="checkbox" checked={editor.blockVisitAfterAttendanceCheckout} onChange={(event) => setEditor((current) => ({ ...current, blockVisitAfterAttendanceCheckout: event.target.checked }))} /> Block visit after attendance checkout</label>
                  {editor.visitType === "store" && <>
                    <label className="visit-check"><input type="checkbox" checked={editor.daySummaryMode === "od_visit"}
                      onChange={(event) => setEditor((current) => ({ ...current, daySummaryMode: event.target.checked ? "od_visit" : "claim" }))} /> OD visit approval without reimbursement</label>
                    <label className="visit-check"><input type="checkbox" checked={editor.checkoutReminder?.enabled ?? false}
                      onChange={(event) => setEditor((current) => ({ ...current, checkoutReminder: { enabled: event.target.checked, intervalMinutes: current.checkoutReminder?.intervalMinutes ?? 15 } }))} /> Remind users to check out</label>
                    {editor.checkoutReminder?.enabled && <label>Reminder interval (minutes)<input type="number" min={1} max={1440}
                      value={editor.checkoutReminder.intervalMinutes || ""}
                      onChange={(event) => setEditor((current) => ({ ...current, checkoutReminder: { enabled: true, intervalMinutes: Number(event.target.value) } }))} /></label>}
                  </>}
                  <label className="visit-check"><input type="checkbox" checked={editor.reimbursementEnabled} onChange={(event) => setEditor((current) => ({ ...current, reimbursementEnabled: event.target.checked }))} /> Enable reimbursement</label>
                  {editor.reimbursementEnabled && <>
                    <label>Multiplication factor<input type="number" value={editor.multiplicationFactor} onChange={(event) => setEditor((current) => ({ ...current, multiplicationFactor: event.target.value }))} /></label>
                    <label>Per-km rate<input type="number" value={editor.perKmRate} onChange={(event) => setEditor((current) => ({ ...current, perKmRate: event.target.value }))} /></label>
                  </>}
                </div>
              </section>

              {(editor.reimbursementEnabled || isOdDaySummary) && <section className="visit-section-card">
                <div className="visit-section-title"><span>4</span> {isOdDaySummary ? "OD Day Summary" : "Day summary & claims"}</div>
                <div className="visit-config-stack">
                  {isOdDaySummary ? (
                    <div className="visit-setting-row">
                      <div className="visit-switch-row">
                        <span>
                          <strong>Visit Day Summary enabled</strong>
                          <small>Mobile shows the day’s completed stores and travel distance.</small>
                        </span>
                      </div>
                    </div>
                  ) : (
                  <div className="visit-setting-row">
                    <label className="visit-switch-row">
                      <input
                        type="checkbox"
                        checked={editor.daySummaryEnabled}
                        onChange={(event) =>
                          setEditor((current) => ({
                            ...current,
                            daySummaryEnabled: event.target.checked,
                          }))
                        }
                      />
                      <span>
                        <strong>Enable Visit Day Summary</strong>
                        <small>Allows mobile users to view daily visit travel legs, total distance, and total amount.</small>
                      </span>
                    </label>
                  </div>

                  )}
                  <details className="visit-config-details" open={approval.approvalWorkflowEnabled}>
                    <summary>
                      <span>
                        <strong>Approval Workflow</strong>
                        <small>{isOdDaySummary ? "Review completed OD visits and daily travel distance." : "Allows mobile users to raise approval for the selected day summary amount and distance."}</small>
                      </span>
                    </summary>
                    {isOdDaySummary && !editor.odApproval ? (
                      <>
                        <p className="visit-preview-note">The approver on the linked OD reviews submissions. Pending submissions auto-reject after 10 days, and rejected submissions can be retried.</p>
                        <div className="visit-add-tab">
                          <button type="button" onClick={() => updateApproval(() => DEFAULT_OD_APPROVAL)}>Customize approval workflow</button>
                        </div>
                      </>
                    ) : <>
                    <label className="visit-switch-row">
                      <input
                        type="checkbox"
                        checked={approval.approvalWorkflowEnabled}
                        onChange={(event) =>
                          updateApproval((current) => ({
                            ...current,
                            approvalWorkflowEnabled: event.target.checked,
                            approvalLevels:
                              event.target.checked && current.approvalLevels.length === 0
                                ? [
                                    {
                                      level: 1,
                                      label: "Manager Approval",
                                      approverType: "direct_manager",
                                      autoAction: "None",
                                      autoActionDays: 0,
                                    },
                                  ]
                                : current.approvalLevels,
                          }))
                        }
                      />
                      <span>
                        <strong>Enable Visit Day Approval Workflow</strong>
                        <small>Approval depends on Visit Day Summary being enabled.</small>
                      </span>
                    </label>
                    <ResubmissionAttemptsField
                      value={approval.maximumResubmissionAttempts}
                      onChange={(value) => updateApproval((current) => ({ ...current, maximumResubmissionAttempts: value }))}
                      disabled={saving}
                      hint={isOdDaySummary ? "Applies to each OD date." : "Visit Day Claims have no resubmission time limit."}
                    />
                    {!isOdDaySummary && approval.approvalWorkflowEnabled && !editor.daySummaryEnabled && (
                      <div className="visit-legacy-note">
                        Visit Day Summary should be enabled before enabling Visit day approval.
                      </div>
                    )}
                    {approval.approvalWorkflowEnabled && (
                      <>
                        <label className="visit-switch-row">
                          <input
                            type="checkbox"
                            checked={approval.notifyApproverOnRoute}
                            onChange={(event) =>
                              updateApproval((current) => ({
                                ...current,
                                notifyApproverOnRoute: event.target.checked,
                              }))
                            }
                          />
                          <span>
                            <strong>Email manager when request reaches Inbox</strong>
                            <small>Sends email to the current approver when the request is assigned to them.</small>
                          </span>
                        </label>
                        <div className="visit-approval-list">
                          {approval.approvalLevels.map((level, index) => (
                            <div className="visit-approval-row" key={index}>
                              <span className="visit-tab-order">{index + 1}</span>
                              <label>
                                Level Label
                                <input
                                  maxLength={100}
                                  value={level.label ?? ""}
                                  onChange={(event) =>
                                    patchApprovalLevel(index, { label: event.target.value })
                                  }
                                  placeholder="Manager Approval"
                                />
                              </label>
                              <label>
                                Approver Type
                                <select
                                  value={level.approverType ?? "direct_manager"}
                                  onChange={(event) =>
                                    patchApprovalLevel(index, {
                                      approverType: event.target.value as VisitApprovalApproverType,
                                    })
                                  }
                                >
                                  {isOdDaySummary && <option value="mapped_od_approver">Mapped OD approver</option>}
                                  <option value="direct_manager">Direct Manager</option>
                                  <option value="designation">Designation</option>
                                </select>
                              </label>
                              <label>
                                Approver Designation
                                <select
                                  disabled={level.approverType === "mapped_od_approver"}
                                  value={level.approverType === "mapped_od_approver" ? "" : level.approverDesignationId ?? ""}
                                  onChange={(event) =>
                                    patchApprovalLevel(index, {
                                      approverDesignationId: event.target.value || undefined,
                                    })
                                  }
                                >
                                  <option value="">
                                    {level.approverType === "designation"
                                      ? "Select designation"
                                      : "Optional fallback"}
                                  </option>
                                  {designations.map((designation) => (
                                    <option value={designation.id} key={designation.id}>
                                      {designation.name}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label>
                                Auto Action
                                <select
                                  value={level.autoAction ?? "None"}
                                  onChange={(event) =>
                                    patchApprovalLevel(
                                      index,
                                      patchAutoAction(
                                        event.target.value as ApprovalAutoAction,
                                        Number(level.autoActionDays),
                                      ),
                                    )
                                  }
                                >
                                  <option value="None">None</option>
                                  <option value="AutoApprove">Auto Approve</option>
                                  <option value="AutoReject">Auto Reject</option>
                                </select>
                              </label>
                              <label>
                                After days
                                <input
                                  type="number"
                                  min={1}
                                  max={30}
                                  step={1}
                                  disabled={(level.autoAction ?? "None") === "None"}
                                  value={(level.autoAction ?? "None") === "None" ? 0 : level.autoActionDays}
                                  onChange={(event) =>
                                    patchApprovalLevel(index, {
                                      autoActionDays: Number(event.target.value),
                                    })
                                  }
                                />
                              </label>
                              <div className="visit-order-actions">
                                <button title="Move up" onClick={() => moveApprovalLevel(index, -1)}>↑</button>
                                <button title="Move down" onClick={() => moveApprovalLevel(index, 1)}>↓</button>
                              </div>
                              <button
                                className="danger"
                                title="Remove level"
                                onClick={() => removeApprovalLevel(index)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="visit-add-tab">
                          <button
                            disabled={approval.approvalLevels.length >= 10}
                            onClick={addApprovalLevel}
                          >
                            <Plus size={14} /> Add approval level
                          </button>
                        </div>
                        <RejectionReasonsSection
                          value={approval.rejectionReasons}
                          onChange={(next) => updateApproval((current) => ({ ...current, rejectionReasons: next }))}
                          error={errors.length ? validateRejectionReasons(approval.rejectionReasons)[0] : undefined}
                          requestNoun={isOdDaySummary ? "OD visit submission" : "visit claim"}
                        />
                      </>
                    )}
                    </>}
                  </details>

                  {!isOdDaySummary && <details className="visit-config-details" open={editor.claimDistanceCappingEnabled}>
                    <summary>
                      <span>
                        <strong>Claim Distance Capping</strong>
                        <small>Claims process only up to the configured distance; actual distance remains visible in reports.</small>
                      </span>
                    </summary>
                    <label className="visit-switch-row">
                      <input
                        type="checkbox"
                        checked={editor.claimDistanceCappingEnabled}
                        onChange={(event) => toggleClaimDistanceCapping(event.target.checked)}
                      />
                      <span>
                        <strong>Enable Distance Capping For Visit Claims</strong>
                        <small>Caps claimable distance and amount while preserving actual travelled distance in Day Summary.</small>
                      </span>
                    </label>
                    {editor.claimDistanceCappingEnabled && (
                      <>
                        <div className="visit-fields-grid">
                          <label>
                            Maximum Claimable Distance (KM)
                            <input
                              type="number"
                              min={0}
                              value={editor.claimMaxDistanceKm}
                              onChange={(event) =>
                                setEditor((current) => ({
                                  ...current,
                                  claimMaxDistanceKm: event.target.value,
                                }))
                              }
                            />
                          </label>
                        </div>
                        <div className="visit-preview-note">
                          Example: For 126 KM actual distance and a {Number(editor.claimMaxDistanceKm) || 0} KM cap at INR {(Number(editor.perKmRate) || 0).toFixed(2)}/KM, claim amount will be INR {(
                            Math.min(126, Number(editor.claimMaxDistanceKm) || 0) *
                            (Number(editor.perKmRate) || 0) *
                            (Number(editor.multiplicationFactor) || 0)
                          ).toFixed(2)}.
                        </div>
                      </>
                    )}
                  </details>}

                </div>
              </section>}

              {showLandingForms && (
                <section className="visit-section-card">
                  <div className="visit-section-title"><span>{editor.reimbursementEnabled || isOdDaySummary ? "5" : "4"}</span> Landing page forms</div>
                  <div className="visit-form-links">
                    <button onClick={() => void openLandingBuilder("pjp_only")}><strong>{editor.landingPageConfig.storeTypeToggle.pjpLabel || "PJP Today"}</strong><small>{hasPjpLandingForm ? `${schemaFieldsByKey[pjpSchemaKey]?.length ?? 0} existing fields · Edit or add fields.` : "Create fields shown with today’s planned stores."}</small></button>
                    {(editor.allowAllMappedStores || hasAllStoresLandingForm) && <button onClick={() => void openLandingBuilder("all_mapped")}><strong>{editor.landingPageConfig.storeTypeToggle.allStoresLabel || "All Stores"}</strong><small>{hasAllStoresLandingForm ? `${schemaFieldsByKey[allStoresSchemaKey]?.length ?? 0} existing fields · Edit or add fields.` : "Create separate fields for all mapped stores."}</small></button>}
                  </div>
                  {/* Store preview */}
                  {storesLoading ? (
                    <div className="visit-store-preview"><em>Loading stores…</em></div>
                  ) : (landingStores.pjp.length > 0 || landingStores.all.length > 0) ? (
                    <div className="visit-store-preview">
                      {landingStores.pjp.length > 0 && (
                        <div className="visit-store-group">
                          <h4>{editor.landingPageConfig.storeTypeToggle.pjpLabel || "PJP Today"} ({landingStores.pjp.length} stores)</h4>
                          <div className="visit-store-list">
                            {landingStores.pjp.slice(0, 10).map((store) => (
                              <div className="visit-store-chip" key={store.id}>
                                <span className="visit-store-name">{store.name}</span>
                                <span className="visit-store-code">{store.code}</span>
                              </div>
                            ))}
                            {landingStores.pjp.length > 10 && (
                              <div className="visit-store-chip more">+{landingStores.pjp.length - 10} more</div>
                            )}
                          </div>
                        </div>
                      )}
                      {landingStores.all.length > 0 && (
                        <div className="visit-store-group">
                          <h4>{editor.landingPageConfig.storeTypeToggle.allStoresLabel || "All Stores"} ({landingStores.all.length} stores)</h4>
                          <div className="visit-store-list">
                            {landingStores.all.slice(0, 10).map((store) => (
                              <div className="visit-store-chip" key={store.id}>
                                <span className="visit-store-name">{store.name}</span>
                                <span className="visit-store-code">{store.code}</span>
                              </div>
                            ))}
                            {landingStores.all.length > 10 && (
                              <div className="visit-store-chip more">+{landingStores.all.length - 10} more</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : activeDesignationId ? (
                    <div className="visit-store-preview"><em>No stores found. Ensure PJP data is uploaded and users have store mappings.</em></div>
                  ) : null}
                  <div className="visit-fields-grid visit-landing-settings">
                    <label>PJP label<input value={editor.landingPageConfig.storeTypeToggle.pjpLabel} onChange={(event) => setEditor((current) => ({ ...current, landingPageConfig: { ...current.landingPageConfig, storeTypeToggle: { ...current.landingPageConfig.storeTypeToggle, pjpLabel: event.target.value } } }))} /></label>
                    <label>All Stores label<input value={editor.landingPageConfig.storeTypeToggle.allStoresLabel} onChange={(event) => setEditor((current) => ({ ...current, landingPageConfig: { ...current.landingPageConfig, storeTypeToggle: { ...current.landingPageConfig.storeTypeToggle, allStoresLabel: event.target.value } } }))} /></label>
                    {editor.allowAllMappedStores && <label>Default store view<select value={editor.landingPageConfig.storeTypeToggle.defaultMode} onChange={(event) => setEditor((current) => ({ ...current, landingPageConfig: { ...current.landingPageConfig, storeTypeToggle: { ...current.landingPageConfig.storeTypeToggle, defaultMode: event.target.value === "all_mapped" ? "all_mapped" : "pjp_only" } } }))}><option value="pjp_only">PJP Today</option><option value="all_mapped">All Stores</option></select></label>}
                  </div>
                </section>
              )}

              <section className="visit-section-card">
                  <div className="visit-section-title"><span>{4 + Number(editor.reimbursementEnabled || isOdDaySummary) + Number(showLandingForms)}</span> Journey tabs</div>
                  {!activeDesignationId && (
                    <div className="visit-legacy-note">
                      Add tabs now. They will be created automatically when you save the configuration.
                    </div>
                  )}
                  <div className="visit-tabs-list">
                    {editor.journeyTabs.map((tab) => (
                      <div className={!tab.isActive ? "inactive" : ""} key={tab.tabId}>
                        <span className="visit-tab-order">{tab.order}</span>
                        <input value={tab.name} onChange={(event) => setEditor((current) => ({ ...current, journeyTabs: current.journeyTabs.map((item) => item.tabId === tab.tabId ? { ...item, name: event.target.value } : item) }))} onBlur={() => void patchTab(tab, { name: editor.journeyTabs.find((item) => item.tabId === tab.tabId)?.name })} />
                        <label><input type="checkbox" checked={tab.isMandatory} onChange={(event) => void patchTab(tab, { isMandatory: event.target.checked })} /> Mandatory</label>
                        <label><input type="checkbox" checked={tab.isGeoFenced} onChange={(event) => void patchTab(tab, { isGeoFenced: event.target.checked })} /> Geo-fence</label>
                        <label><input type="checkbox" checked={tab.isRequiredForAdvancement} onChange={(event) => void patchTab(tab, { isRequiredForAdvancement: event.target.checked })} /> Required to advance</label>
                        <label><input type="checkbox" checked={tab.isActive} onChange={(event) => void patchTab(tab, { isActive: event.target.checked })} /> Active</label>
                        <div className="visit-order-actions">
                          <button title="Move up" onClick={() => void moveTab(tab.tabId, -1)}>↑</button>
                          <button title="Move down" onClick={() => void moveTab(tab.tabId, 1)}>↓</button>
                        </div>
                        <button disabled={isPendingTab(tab)} title={isPendingTab(tab) ? "Save configuration before building the form" : ""} onClick={() => void openTabBuilder(tab)}>Build form ({schemaFieldsByKey[tab.udfSchemaKey]?.length ?? 0})</button>
                        <button disabled={isPendingTab(tab)} title="Clone tab" onClick={async () => { await visitConfigService.cloneTab(tab.tabId, projectId, activeDesignationId); await refreshActiveConfig(); }}><Copy size={14} /></button>
                        <button className="danger" onClick={async () => {
                          if (isPendingTab(tab)) {
                            setEditor((current) => ({
                              ...current,
                              journeyTabs: current.journeyTabs.filter((item) => item.tabId !== tab.tabId),
                            }));
                            return;
                          }
                          await visitConfigService.deactivateTab(tab.tabId, projectId, activeDesignationId);
                          await refreshActiveConfig();
                        }}><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                  <div className="visit-add-tab"><input placeholder="New tab name" value={newTabName} onChange={(event) => setNewTabName(event.target.value)} /><button disabled={!newTabName.trim() || saving} onClick={() => void addTab()}><Plus size={14} /> Add tab</button></div>
                </section>

              {errors.length > 0 && <div className="visit-errors">{errors.map((error) => <div key={error}>{error}</div>)}</div>}
              <div className="visit-savebar">
                <span>{activeDesignationId ? "Changes update the existing database configuration." : "Configuration and journey tabs will be created together."}</span>
                <div>
                  <button className="visit-secondary-btn" disabled={saving} onClick={() => void saveConfig(true)}>{saving ? "Saving…" : "Save draft"}</button>
                  {!activeDesignationId && <button className="visit-primary-btn" disabled={saving} onClick={() => void saveConfig(true, true)}>Save & continue</button>}
                  {activeDesignationId && <button className="visit-primary-btn" onClick={() => setView("review")}>Review & publish</button>}
                </div>
              </div>
            </>
          )}
        </>
      )}
      <ConfirmDialog
        isOpen={Boolean(confirmDelete)}
        title="Delete visit configuration?"
        message="This is a soft delete. Historical data remains preserved."
        confirmLabel="Delete"
        variant="danger"
        onClose={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (!confirmDelete) return;
          try {
            await visitConfigService.softDelete(projectId, confirmDelete.designationId);
            setConfirmDelete(null);
            await load();
            setToast({ type: "success", message: "Visit configuration deleted." });
          } catch (error) {
            setToast({ type: "error", message: formatApiError(error, "Failed to delete visit configuration") });
          }
        }}
      />
      <If2Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
