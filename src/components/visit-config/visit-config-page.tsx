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
  type UpsertVisitConfigInput,
  type VisitConfigDocument,
} from "@/lib/api";
import { projectAdminBase } from "@/lib/nav/nav";
import { If2Toast, type ToastState } from "@/components/accounts/if2-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ClaimsFormBuilderV2 } from "@/components/claims-config/claims-form-builder-v2";

type View = "list" | "config" | "builder" | "review";
type ScopeMode = "single" | "multiple";
type BuilderTarget =
  | { kind: "landing"; fieldSet: "pjp_only" | "all_mapped" }
  | { kind: "tab"; tab: JourneyTabDocument };

interface EditorState {
  designationIds: string[];
  isModuleEnabled: boolean;
  mandatoryCheckIn: boolean;
  visitType: "direct" | "store";
  storeMappingMode: "direct_store" | "pjp" | null;
  allowAllMappedStores: boolean;
  geoFenceRadius: string;
  reimbursementEnabled: boolean;
  multiplicationFactor: string;
  perKmRate: string;
  fromLocationType: string;
  toLocationType: string;
  calculationMethod: string;
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

function toEditor(config: VisitConfigDocument): EditorState {
  return {
    designationIds: [config.designationId],
    isModuleEnabled: config.isModuleEnabled,
    mandatoryCheckIn: config.mandatoryCheckIn,
    visitType: config.visitType,
    storeMappingMode: config.storeMappingMode,
    allowAllMappedStores: config.allowAllMappedStores,
    geoFenceRadius: String(config.geoFenceConfig.radius),
    reimbursementEnabled: config.reimbursementConfig.isEnabled,
    multiplicationFactor: String(config.reimbursementConfig.multiplicationFactor),
    perKmRate: String(config.reimbursementConfig.perKmRate),
    fromLocationType: config.distanceConfig.fromLocationType || "attendance_mark_in",
    toLocationType: config.distanceConfig.toLocationType || "attendance_mark_out",
    calculationMethod: config.distanceConfig.calculationMethod || "google_api_random",
    status: config.status,
    journeyTabs: [...config.journeyTabs].sort((a, b) => a.order - b.order),
    landingPageConfig: config.landingPageConfig,
  };
}

function isPendingTab(tab: JourneyTabDocument): boolean {
  return tab.tabId.startsWith("pending_");
}

function validate(editor: EditorState): string[] {
  const errors: string[] = [];
  if (editor.designationIds.length === 0) errors.push("Select at least one designation.");
  if (editor.visitType === "store" && !editor.storeMappingMode) {
    errors.push("Select a store mapping method.");
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
    Boolean(activeDesignationId) &&
    editor.visitType === "store" &&
    editor.storeMappingMode === "pjp";
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
      storeMappingMode: editor.visitType === "store" ? editor.storeMappingMode : null,
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
      const pendingTabs = editor.journeyTabs.filter(isPendingTab);
      const saved = await Promise.all(
        editor.designationIds.map((designationId) =>
          visitConfigService.save(buildPayload(designationId, draft ? "draft" : editor.status), draft),
        ),
      );
      if (pendingTabs.length > 0) {
        await Promise.all(
          editor.designationIds.flatMap((designationId) =>
            pendingTabs.map((tab) =>
              visitConfigService.addTab({
                projectId,
                designationId,
                name: tab.name,
                isMandatory: tab.isMandatory,
                isGeoFenced: tab.isGeoFenced,
              }),
            ),
          ),
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
      setEditor(toEditor(config));
      setConfigs((current) => [
        ...current.filter((item) => item.designationId !== config.designationId),
        config,
      ]);
    }
    return config;
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
      setEditor(toEditor(config));
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
      setEditor(toEditor(config));
    } catch (error) {
      setToast({ type: "error", message: formatApiError(error, "Failed to reorder journey tabs") });
    }
  }

  async function openLandingBuilder(
    fieldSet: "pjp_only" | "all_mapped",
    config = activeConfig,
  ) {
    if (!config) return;
    const schemaKey =
      config.landingPageConfig.fieldSets[fieldSet]?.udfSchemaKey ||
      (fieldSet === "pjp_only"
        ? `${projectId}_${config.designationId}_landing_page_pjp`
        : `${projectId}_${config.designationId}_landing_page_all_mapped`);
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
    } catch (error) {
      setBuilderError(formatApiError(error, "Failed to load landing-page form"));
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
    if (!builderTarget || !activeDesignationId) return;
    setSaving(true);
    setBuilderError(null);
    try {
      if (builderTarget.kind === "tab") {
        await visitConfigService.publishTab(
          builderTarget.tab.tabId,
          projectId,
          activeDesignationId,
          builderFields,
        );
      } else {
        const current = await visitConfigService.getConfig(projectId, activeDesignationId);
        if (!current) throw new Error("Visit configuration not found");
        await visitConfigService.save({
          ...buildPayload(activeDesignationId, "draft"),
          landingPageConfig: {
            ...current.landingPageConfig,
            storeTypeToggle: {
              ...editor.landingPageConfig.storeTypeToggle,
              enabled: editor.allowAllMappedStores,
            },
            fieldSets: {
              pjp_only:
                builderTarget.fieldSet === "pjp_only"
                  ? { fields: builderFields }
                  : current.landingPageConfig.fieldSets.pjp_only,
              all_mapped:
                builderTarget.fieldSet === "all_mapped"
                  ? { fields: builderFields }
                  : current.landingPageConfig.fieldSets.all_mapped,
            },
          },
        }, true);
      }
      setSavedBuilderFields(builderFields);
      const schemaKey =
        builderTarget.kind === "tab"
          ? builderTarget.tab.udfSchemaKey
          : (await visitConfigService.getConfig(projectId, activeDesignationId))
              ?.landingPageConfig.fieldSets[builderTarget.fieldSet]?.udfSchemaKey;
      if (schemaKey) {
        setSchemaFieldsByKey((current) => ({
          ...current,
          [schemaKey]: builderFields,
        }));
      }
      await refreshActiveConfig();
      setToast({ type: "success", message: "Form saved and published." });
    } catch (error) {
      setBuilderError(formatApiError(error, "Failed to publish form"));
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    const activeTabs = editor.journeyTabs.filter((tab) => tab.isActive);
    if (activeTabs.length === 0) {
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
                  <button className={editor.visitType === "direct" ? "selected" : ""} onClick={() => setEditor((current) => ({ ...current, visitType: "direct", storeMappingMode: null, allowAllMappedStores: false }))}><strong>Direct visit</strong><small>No store selection or landing page.</small></button>
                  <button className={editor.visitType === "store" ? "selected" : ""} onClick={() => setEditor((current) => ({ ...current, visitType: "store", storeMappingMode: current.storeMappingMode ?? "direct_store" }))}><strong>Store / location visit</strong><small>Use direct mapping or PJP.</small></button>
                </div>
                {editor.visitType === "store" && (
                  <div className="visit-sub-options">
                    <label><input type="radio" checked={editor.storeMappingMode === "direct_store"} onChange={() => setEditor((current) => ({ ...current, storeMappingMode: "direct_store", allowAllMappedStores: false }))} /> Direct store mapping</label>
                    <label><input type="radio" checked={editor.storeMappingMode === "pjp"} onChange={() => setEditor((current) => ({ ...current, storeMappingMode: "pjp" }))} /> PJP</label>
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
                  <label className="visit-check"><input type="checkbox" checked={editor.reimbursementEnabled} onChange={(event) => setEditor((current) => ({ ...current, reimbursementEnabled: event.target.checked }))} /> Enable reimbursement</label>
                  {editor.reimbursementEnabled && <>
                    <label>Multiplication factor<input type="number" value={editor.multiplicationFactor} onChange={(event) => setEditor((current) => ({ ...current, multiplicationFactor: event.target.value }))} /></label>
                    <label>Per-km rate<input type="number" value={editor.perKmRate} onChange={(event) => setEditor((current) => ({ ...current, perKmRate: event.target.value }))} /></label>
                  </>}
                </div>
              </section>

              {showLandingForms && (
                <section className="visit-section-card">
                  <div className="visit-section-title"><span>4</span> Landing page forms</div>
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
                  <div className="visit-section-title"><span>{showLandingForms ? "5" : "4"}</span> Journey tabs</div>
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
