"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Copy,
  FileUp,
  Pencil,
  Plus,
  Save,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { If2Toast, type ToastState } from "@/components/accounts/if2-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  designationService,
  featureConfigService,
  formatApiError,
  leaveConfigService,
  type Designation,
  type HolidayUploadSummary,
  type LeaveApprovalLevel,
  type LeaveAutoAction,
  type LeaveConfigDocument,
  type LeaveCreditRuleType,
  type LeaveEntitlementType,
  type LeaveHoliday,
  type LeaveHolidayType,
  type LeavePolicy,
  type LeaveTypeConfig,
  type LeaveYear,
} from "@/lib/api";
import { projectAdminBase } from "@/lib/nav/nav";

interface LeaveConfigPageProps {
  projectId: string;
  projectName?: string;
  accountCode: string;
  projectCode: string;
}

type ViewState =
  | { mode: "list" }
  | { mode: "policy"; policyIndex: number }
  | { mode: "type"; policyIndex: number; typeIndex: number };

const MOCK_DESIGNATIONS: Designation[] = [
  { id: "mock_isp_executive", name: "ISP Executive", roleId: "mock_role" },
  { id: "mock_team_lead", name: "Team Lead", roleId: "mock_role" },
  { id: "mock_area_manager", name: "Area Manager", roleId: "mock_role" },
];

const LEAVE_YEARS: LeaveYear[] = ["Calendar", "Financial"];
const ENTITLEMENT_TYPES: LeaveEntitlementType[] = ["Annual", "Monthly"];
const CREDIT_RULES: LeaveCreditRuleType[] = [
  "LeaveYearStart",
  "AttendanceCycleStart",
  "FixedDateOfMonth",
];
const HOLIDAY_TYPES: LeaveHolidayType[] = ["National", "Regional", "Optional"];
const AUTO_ACTIONS: LeaveAutoAction[] = ["None", "AutoApprove", "AutoReject"];
const HEX_COLOUR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function cloneConfig(config: LeaveConfigDocument): LeaveConfigDocument {
  return JSON.parse(JSON.stringify(config)) as LeaveConfigDocument;
}

function normalizeHexColourInput(value: string): string {
  const prefixed = value.trim().startsWith("#") ? value.trim() : `#${value.trim()}`;
  return prefixed.slice(0, 7).toUpperCase();
}

function colourForPicker(value: string): string {
  const colour = normalizeHexColourInput(value);
  const shortMatch = /^#([0-9A-F])([0-9A-F])([0-9A-F])$/.exec(colour);
  if (shortMatch) {
    return `#${shortMatch[1]}${shortMatch[1]}${shortMatch[2]}${shortMatch[2]}${shortMatch[3]}${shortMatch[3]}`;
  }
  return /^#[0-9A-F]{6}$/.test(colour) ? colour : "#2196F3";
}

function withDefaultApprover(leaveType: LeaveTypeConfig, approverRole: string | undefined): LeaveTypeConfig {
  if (!approverRole) return leaveType;

  return {
    ...leaveType,
    approvalWorkflow: {
      ...leaveType.approvalWorkflow,
      levels: leaveType.approvalWorkflow.levels.map((level, index) =>
        index === 0 ? { ...level, approverRole } : level,
      ),
    },
  };
}

function defaultPolicy(designations: Designation[]): LeavePolicy {
  return {
    name: "New Leave Policy",
    applicableDesignations: [],
    visibility: {
      showLeaveBalance: true,
      showTransactionHistory: true,
      showHolidayCalendar: true,
    },
    holidays: [],
    leaveTypes: [
      withDefaultApprover(
        leaveConfigService.createCustomLeaveType({
          name: "Casual Leave",
          shortCode: "CL",
          totalLeavesPerYear: 12,
          entitlementType: "Monthly",
        }),
        designations[0]?.id,
      ),
    ],
  };
}

function defaultHoliday(): LeaveHoliday {
  return {
    date: new Date().toISOString().slice(0, 10),
    name: "",
    type: "National",
  };
}

function validateConfig(config: LeaveConfigDocument): string[] {
  const errors: string[] = [];
  const designationOwner = new Map<string, string>();

  if (!config.policies.length) {
    errors.push("Add at least one leave policy.");
  }

  config.policies.forEach((policy, policyIndex) => {
    const policyLabel = policy.name.trim() || `Policy ${policyIndex + 1}`;
    if (!policy.name.trim()) errors.push(`${policyLabel}: policy name is required.`);
    if (!policy.applicableDesignations.length) {
      errors.push(`${policyLabel}: select at least one designation.`);
    }
    policy.applicableDesignations.forEach((designationId) => {
      const owner = designationOwner.get(designationId);
      if (owner) {
        errors.push(`A designation is assigned to both ${owner} and ${policyLabel}.`);
      } else {
        designationOwner.set(designationId, policyLabel);
      }
    });
    if (!policy.leaveTypes.length) {
      errors.push(`${policyLabel}: add at least one leave type.`);
    }

    const shortCodes = new Set<string>();
    policy.leaveTypes.forEach((leaveType) => {
      const typeLabel = `${policyLabel} / ${leaveType.name || "Leave type"}`;
      if (!leaveType.name.trim()) errors.push(`${typeLabel}: name is required.`);
      if (!/^[A-Z][A-Z0-9_]{0,9}$/.test(leaveType.shortCode)) {
        errors.push(`${typeLabel}: short code must be uppercase, start with a letter, and be 1-10 characters.`);
      }
      if (!HEX_COLOUR_PATTERN.test(leaveType.colour)) {
        errors.push(`${typeLabel}: color must be a valid hex code like #2196F3 or #39F.`);
      }
      if (shortCodes.has(leaveType.shortCode)) {
        errors.push(`${policyLabel}: ${leaveType.shortCode} is used by more than one leave type.`);
      }
      shortCodes.add(leaveType.shortCode);
      if (leaveType.totalLeavesPerYear < 0 || leaveType.totalLeavesPerYear > 365) {
        errors.push(`${typeLabel}: total leaves must be between 0 and 365.`);
      }
      if (!dayInRange(leaveType.attendanceCycle.startDay) || !dayInRange(leaveType.attendanceCycle.endDay)) {
        errors.push(`${typeLabel}: attendance cycle days must be between 1 and 31.`);
      }
      if (leaveType.creditRule.type === "FixedDateOfMonth" && !dayInRange(leaveType.creditRule.fixedDate)) {
        errors.push(`${typeLabel}: fixed credit date must be between 1 and 31.`);
      }
      if (leaveType.approvalWorkflow.levels.length > 10) {
        errors.push(`${typeLabel}: approval workflow can have at most 10 levels.`);
      }
      if (
        leaveType.applicationRules.applicationClosingDate.isEnabled &&
        !dayInRange(leaveType.applicationRules.applicationClosingDate.day)
      ) {
        errors.push(`${typeLabel}: application closing day must be between 1 and 31.`);
      }
      if (
        leaveType.applicationRules.managerApprovalClosingDate.isEnabled &&
        !dayInRange(leaveType.applicationRules.managerApprovalClosingDate.day)
      ) {
        errors.push(`${typeLabel}: manager closing day must be between 1 and 31.`);
      }
    });

    policy.holidays.forEach((holiday, holidayIndex) => {
      if (!holiday.date || !holiday.name.trim() || !holiday.type) {
        errors.push(`${policyLabel}: holiday ${holidayIndex + 1} needs date, name, and type.`);
      }
    });
  });

  return Array.from(new Set(errors));
}

function dayInRange(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 31;
}

function designationName(designations: Designation[], id: string): string {
  return designations.find((designation) => designation.id === id)?.name ?? id;
}

function creditRuleLabel(rule: LeaveCreditRuleType): string {
  switch (rule) {
    case "LeaveYearStart":
      return "Leave year start";
    case "AttendanceCycleStart":
      return "Attendance cycle start";
    case "FixedDateOfMonth":
      return "Fixed date of month";
  }
}

function autoActionLabel(action: LeaveAutoAction): string {
  switch (action) {
    case "AutoApprove":
      return "Auto approve";
    case "AutoReject":
      return "Auto reject";
    default:
      return "No auto action";
  }
}

export function LeaveConfigPage({
  projectId,
  projectName,
  accountCode,
  projectCode,
}: LeaveConfigPageProps) {
  const base = projectAdminBase(accountCode, projectCode);
  const [config, setConfig] = useState<LeaveConfigDocument | null>(null);
  const [savedConfig, setSavedConfig] = useState<LeaveConfigDocument | null>(null);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [uploadSummary, setUploadSummary] = useState<HolidayUploadSummary | null>(null);
  const [view, setView] = useState<ViewState>({ mode: "list" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [deletePolicyIndex, setDeletePolicyIndex] = useState<number | null>(null);

  const dirty = useMemo(() => {
    if (!config || !savedConfig) return false;
    return JSON.stringify(config.policies) !== JSON.stringify(savedConfig.policies);
  }, [config, savedConfig]);

  const applyResponse = useCallback((nextConfig: LeaveConfigDocument, nextWarnings: string[]) => {
    setConfig(cloneConfig(nextConfig));
    setSavedConfig(cloneConfig(nextConfig));
    setWarnings(nextWarnings);
    setValidationErrors([]);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [featureConfig, designationList, leaveResponse] = await Promise.all([
        featureConfigService.getRawByProject(projectId),
        designationService.listByProject(projectId).catch((err) => {
          if (process.env.NEXT_PUBLIC_USE_MOCK_API === "true") return MOCK_DESIGNATIONS;
          throw err;
        }),
        leaveConfigService.initialize(projectId),
      ]);
      setDesignations(designationList);
      setIsActive(
        Boolean(featureConfig.modules.find((module) => module.key === "leave")?.isActive),
      );
      applyResponse(leaveResponse.config, leaveResponse.warnings);
    } catch (err) {
      setError(formatApiError(err, "Failed to load leave configuration"));
    } finally {
      setLoading(false);
    }
  }, [applyResponse, projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const updateConfig = useCallback((updater: (current: LeaveConfigDocument) => LeaveConfigDocument) => {
    setConfig((current) => (current ? updater(cloneConfig(current)) : current));
    setValidationErrors([]);
  }, []);

  async function saveDraft(options: { silent?: boolean } = {}): Promise<LeaveConfigDocument | null> {
    if (!config) return null;
    const errors = validateConfig(config);
    if (errors.length) {
      setValidationErrors(errors);
      if (!options.silent) setToast({ type: "error", message: "Please fix the highlighted issues." });
      return null;
    }

    setSaving(true);
    try {
      const response = await leaveConfigService.save(projectId, config.policies);
      applyResponse(response.config, response.warnings);
      if (!options.silent) setToast({ type: "success", message: "Leave configuration saved." });
      return response.config;
    } catch (err) {
      setToast({ type: "error", message: formatApiError(err, "Failed to save leave configuration") });
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function handleActivate(nextActive: boolean) {
    setActivating(true);
    try {
      if (nextActive && dirty) {
        const saved = await saveDraft({ silent: true });
        if (!saved) return;
      }
      if (nextActive) {
        await leaveConfigService.activate(projectId);
      } else {
        await leaveConfigService.deactivate(projectId);
      }
      setIsActive(nextActive);
      setToast({
        type: "success",
        message: nextActive ? "Leave module activated." : "Leave module deactivated.",
      });
    } catch (err) {
      setToast({
        type: "error",
        message: formatApiError(
          err,
          nextActive
            ? "Leave could not be activated. Complete the setup requirements first."
            : "Leave could not be deactivated.",
        ),
      });
    } finally {
      setActivating(false);
    }
  }

  async function handleClonePolicy(index: number) {
    if (!config) return;
    const policy = config.policies[index];
    if (!policy) return;
    if (dirty) {
      const saved = await saveDraft({ silent: true });
      if (!saved) return;
      const savedPolicy = saved.policies[index];
      if (!savedPolicy?._id) return;
      await clonePolicyById(savedPolicy._id);
      return;
    }
    if (!policy._id) {
      updateConfig((current) => ({
        ...current,
        policies: [
          ...current.policies,
          {
            ...cloneConfig({ projectId, policies: [policy] }).policies[0],
            _id: undefined,
            name: `${policy.name} (Copy)`,
            applicableDesignations: [],
          },
        ],
      }));
      return;
    }
    await clonePolicyById(policy._id);
  }

  async function clonePolicyById(policyId: string) {
    setSaving(true);
    try {
      const response = await leaveConfigService.clonePolicy(projectId, policyId);
      applyResponse(response.config, response.warnings);
      setView({ mode: "list" });
      setToast({ type: "success", message: "Leave policy cloned." });
    } catch (err) {
      setToast({ type: "error", message: formatApiError(err, "Failed to clone leave policy") });
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeletePolicy() {
    if (!config || deletePolicyIndex === null) return;
    const policy = config.policies[deletePolicyIndex];
    setDeletePolicyIndex(null);
    if (!policy) return;
    if (!policy._id || dirty) {
      if (config.policies.length <= 1) {
        setToast({ type: "error", message: "Need at least one policy." });
        return;
      }
      updateConfig((current) => ({
        ...current,
        policies: current.policies.filter((_, index) => index !== deletePolicyIndex),
      }));
      setView({ mode: "list" });
      return;
    }

    setSaving(true);
    try {
      const response = await leaveConfigService.deletePolicy(projectId, policy._id);
      applyResponse(response.config, response.warnings);
      setView({ mode: "list" });
      setToast({ type: "success", message: "Leave policy deleted." });
    } catch (err) {
      setToast({ type: "error", message: formatApiError(err, "Failed to delete leave policy") });
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadHolidays(policyIndex: number, file: File) {
    if (!config) return;
    let workingConfig = config;
    if (dirty || !config.policies[policyIndex]?._id) {
      const saved = await saveDraft({ silent: true });
      if (!saved) return;
      workingConfig = saved;
    }
    const policy = workingConfig.policies[policyIndex];
    if (!policy?._id) return;

    setSaving(true);
    try {
      const response = await leaveConfigService.uploadHolidays(projectId, policy._id, file);
      applyResponse(response.config, response.warnings);
      setUploadSummary(response.uploadSummary ?? null);
      setToast({ type: "success", message: "Holiday file uploaded." });
    } catch (err) {
      setToast({ type: "error", message: formatApiError(err, "Holiday upload failed") });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="leave-config-page">
        <div className="edit-skeleton">
          {[1, 2, 3].map((item) => (
            <div className="skeleton-section" key={item} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="leave-config-page">
        <div className="leave-topbar">
          <Link href={`${base}/modules`} className="leave-back-link">
            <ArrowLeft size={16} /> Back to Modules
          </Link>
        </div>
        <div className="leave-error-panel">{error ?? "Leave configuration not found."}</div>
      </div>
    );
  }

  const currentPolicy =
    view.mode === "policy" || view.mode === "type"
      ? config.policies[view.policyIndex]
      : null;
  const currentType =
    view.mode === "type" && currentPolicy
      ? currentPolicy.leaveTypes[view.typeIndex]
      : null;

  return (
    <div className="leave-config-page">
      <div className="leave-topbar">
        <Link href={`${base}/modules`} className="leave-back-link">
          <ArrowLeft size={16} /> Back to Modules
        </Link>
        <div className={`leave-status-pill ${isActive ? "active" : ""}`}>
          <span />
          {isActive ? "Active" : "Inactive"}
        </div>
      </div>

      <div className="leave-header">
        <div>
          <div className="leave-eyebrow">Leave Module</div>
          <h1>
            {view.mode === "list"
              ? "Leave Policies"
              : view.mode === "policy"
                ? currentPolicy?.name || "Leave Policy"
                : `${currentType?.name || "Leave Type"} Configuration`}
          </h1>
          <p>
            {view.mode === "list"
              ? `Configure leave policies for ${projectName || "this project"}.`
              : view.mode === "policy"
                ? "Configure policy basics, visibility, holidays, and leave types."
                : "Fine-tune entitlement, credit, application, attachment, and approval rules."}
          </p>
        </div>
        <div className="leave-header-actions">
          <button
            type="button"
            className="leave-secondary-btn"
            disabled={activating || saving}
            onClick={() => handleActivate(!isActive)}
          >
            <CheckCircle2 size={16} />
            {isActive ? "Deactivate" : "Activate Leave"}
          </button>
          <button
            type="button"
            className="leave-primary-btn"
            disabled={!dirty || saving || activating}
            onClick={() => saveDraft()}
          >
            <Save size={16} />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <Breadcrumb view={view} config={config} onNavigate={setView} />

      {warnings.length > 0 && (
        <div className="leave-warning-banner">
          {warnings.map((warning) => (
            <div key={warning}>{warning}</div>
          ))}
        </div>
      )}

      {validationErrors.length > 0 && (
        <div className="leave-validation-panel">
          {validationErrors.map((validationError) => (
            <div key={validationError}>{validationError}</div>
          ))}
        </div>
      )}

      {uploadSummary && (
        <div className="leave-upload-summary">
          Uploaded holidays: {uploadSummary.added} added, {uploadSummary.skipped} skipped,{" "}
          {uploadSummary.invalid} invalid.
        </div>
      )}

      {view.mode === "list" && (
        <PolicyList
          config={config}
          designations={designations}
          onAdd={() => {
            updateConfig((current) => ({
              ...current,
              policies: [...current.policies, defaultPolicy(designations)],
            }));
            setView({ mode: "policy", policyIndex: config.policies.length });
          }}
          onEdit={(policyIndex) => setView({ mode: "policy", policyIndex })}
          onClone={handleClonePolicy}
          onDelete={setDeletePolicyIndex}
        />
      )}

      {view.mode === "policy" && currentPolicy && (
        <PolicyEditor
          policy={currentPolicy}
          policyIndex={view.policyIndex}
          designations={designations}
          policies={config.policies}
          onBack={() => setView({ mode: "list" })}
          onOpenType={(typeIndex) =>
            setView({ mode: "type", policyIndex: view.policyIndex, typeIndex })
          }
          onUpload={(file) => handleUploadHolidays(view.policyIndex, file)}
          onChange={(nextPolicy) =>
            updateConfig((current) => ({
              ...current,
              policies: current.policies.map((policy, index) =>
                index === view.policyIndex ? nextPolicy : policy,
              ),
            }))
          }
        />
      )}

      {view.mode === "type" && currentPolicy && currentType && (
        <LeaveTypeEditor
          leaveType={currentType}
          designations={designations}
          onBack={() => setView({ mode: "policy", policyIndex: view.policyIndex })}
          onChange={(nextType) =>
            updateConfig((current) => ({
              ...current,
              policies: current.policies.map((policy, policyIndex) =>
                policyIndex === view.policyIndex
                  ? {
                      ...policy,
                      leaveTypes: policy.leaveTypes.map((leaveType, typeIndex) =>
                        typeIndex === view.typeIndex ? nextType : leaveType,
                      ),
                    }
                  : policy,
              ),
            }))
          }
        />
      )}

      {dirty && (
        <div className="leave-save-bar">
          <div>
            <span className="leave-unsaved-dot" />
            Unsaved changes
          </div>
          <div className="leave-save-bar-actions">
            <button
              type="button"
              className="leave-secondary-btn"
              disabled={saving}
              onClick={() => {
                if (savedConfig) setConfig(cloneConfig(savedConfig));
                setValidationErrors([]);
              }}
            >
              Discard
            </button>
            <button
              type="button"
              className="leave-primary-btn"
              disabled={saving}
              onClick={() => saveDraft()}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deletePolicyIndex !== null}
        onClose={() => setDeletePolicyIndex(null)}
        onConfirm={confirmDeletePolicy}
        title="Delete Leave Policy"
        message="This removes the leave policy from the draft or backend configuration. This action cannot be undone after save."
        confirmLabel="Delete"
        variant="danger"
        isLoading={saving}
      />

      <If2Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

function Breadcrumb({
  view,
  config,
  onNavigate,
}: {
  view: ViewState;
  config: LeaveConfigDocument;
  onNavigate: (view: ViewState) => void;
}) {
  const policy =
    view.mode === "policy" || view.mode === "type"
      ? config.policies[view.policyIndex]
      : null;
  const leaveType =
    view.mode === "type" && policy ? policy.leaveTypes[view.typeIndex] : null;

  return (
    <div className="leave-breadcrumb">
      <button type="button" onClick={() => onNavigate({ mode: "list" })}>
        Leave
      </button>
      {policy && (
        <>
          <ChevronRight size={14} />
          <button
            type="button"
            onClick={() => onNavigate({ mode: "policy", policyIndex: view.mode === "list" ? 0 : view.policyIndex })}
          >
            {policy.name || "Policy"}
          </button>
        </>
      )}
      {leaveType && (
        <>
          <ChevronRight size={14} />
          <span>{leaveType.name || "Leave Type"}</span>
        </>
      )}
    </div>
  );
}

function PolicyList({
  config,
  designations,
  onAdd,
  onEdit,
  onClone,
  onDelete,
}: {
  config: LeaveConfigDocument;
  designations: Designation[];
  onAdd: () => void;
  onEdit: (policyIndex: number) => void;
  onClone: (policyIndex: number) => void;
  onDelete: (policyIndex: number) => void;
}) {
  return (
    <div className="leave-policy-list">
      {config.policies.map((policy, index) => {
        const activeTypes = policy.leaveTypes.length;
        return (
          <article className="leave-policy-card" key={policy._id ?? index}>
            <button type="button" className="leave-policy-main" onClick={() => onEdit(index)}>
              <div className="leave-policy-index">{index + 1}</div>
              <div>
                <h2>{policy.name || `Policy ${index + 1}`}</h2>
                <p>
                  {policy.applicableDesignations.length
                    ? policy.applicableDesignations
                        .map((id) => designationName(designations, id))
                        .join(", ")
                    : "No designations assigned"}
                </p>
                <div className="leave-policy-meta">
                  <span>{activeTypes} leave types</span>
                  <span>{policy.holidays.length} holidays</span>
                </div>
              </div>
            </button>
            <div className="leave-policy-actions">
              <button type="button" className="leave-icon-btn" onClick={() => onClone(index)}>
                <Copy size={15} /> Clone
              </button>
              <button type="button" className="leave-icon-btn" onClick={() => onEdit(index)}>
                <Pencil size={15} /> Edit
              </button>
              <button type="button" className="leave-icon-btn danger" onClick={() => onDelete(index)}>
                <Trash2 size={15} />
              </button>
            </div>
          </article>
        );
      })}

      <button type="button" className="leave-add-policy" onClick={onAdd}>
        <Plus size={18} />
        Add New Leave Policy
      </button>
    </div>
  );
}

function PolicyEditor({
  policy,
  policyIndex,
  designations,
  policies,
  onBack,
  onOpenType,
  onChange,
  onUpload,
}: {
  policy: LeavePolicy;
  policyIndex: number;
  designations: Designation[];
  policies: LeavePolicy[];
  onBack: () => void;
  onOpenType: (typeIndex: number) => void;
  onChange: (policy: LeavePolicy) => void;
  onUpload: (file: File) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const usedDesignations = useMemo(() => {
    const used = new Map<string, string>();
    policies.forEach((item, index) => {
      if (index === policyIndex) return;
      item.applicableDesignations.forEach((designationId) =>
        used.set(designationId, item.name || `Policy ${index + 1}`),
      );
    });
    return used;
  }, [policies, policyIndex]);

  function patch(patchValue: Partial<LeavePolicy>) {
    onChange({ ...policy, ...patchValue });
  }

  function toggleDesignation(designationId: string) {
    const exists = policy.applicableDesignations.includes(designationId);
    patch({
      applicableDesignations: exists
        ? policy.applicableDesignations.filter((id) => id !== designationId)
        : [...policy.applicableDesignations, designationId],
    });
  }

  function updateHoliday(index: number, patchValue: Partial<LeaveHoliday>) {
    patch({
      holidays: policy.holidays.map((holiday, holidayIndex) =>
        holidayIndex === index ? { ...holiday, ...patchValue } : holiday,
      ),
    });
  }

  return (
    <div className="leave-editor">
      <button type="button" className="leave-inline-back" onClick={onBack}>
        <ArrowLeft size={15} /> All Policies
      </button>

      <CollapsibleSection
        icon={<Settings2 size={18} />}
        title="Basic Settings"
        description="Policy name and the designations that follow this policy."
        defaultOpen
      >
        <div className="leave-form-grid">
          <label className="leave-field wide">
            <span>Policy Name</span>
            <input
              value={policy.name}
              placeholder="e.g. ISP Executive Leave Policy"
              onChange={(event) => patch({ name: event.target.value })}
            />
          </label>
          <div className="leave-field wide">
            <span>Applicable Designations</span>
            <div className="leave-designation-grid">
              {designations.map((designation) => {
                const usedBy = usedDesignations.get(designation.id);
                const selected = policy.applicableDesignations.includes(designation.id);
                return (
                  <label
                    className={`leave-designation-option ${selected ? "selected" : ""} ${usedBy ? "disabled" : ""}`}
                    key={designation.id}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={Boolean(usedBy)}
                      onChange={() => toggleDesignation(designation.id)}
                    />
                    <span>{designation.name}</span>
                    {usedBy && <small>Used by {usedBy}</small>}
                  </label>
                );
              })}
              {!designations.length && (
                <div className="leave-empty-inline">No designations found for this project.</div>
              )}
            </div>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
          icon={<CalendarDays size={18} />}
          title="Visibility"
          description="Controls balance and transaction visibility in the mobile app."
        >
        <div className="leave-setting-list">
          <ToggleRow
            title="Show Leave Balance"
            description="Display the current balance card on the employee home screen."
            checked={policy.visibility.showLeaveBalance}
            onChange={(checked) =>
              patch({ visibility: { ...policy.visibility, showLeaveBalance: checked } })
            }
          />
          <ToggleRow
            title="Show Transaction History"
            description="Display monthly leave credit and debit history."
            checked={policy.visibility.showTransactionHistory}
            onChange={(checked) =>
              patch({ visibility: { ...policy.visibility, showTransactionHistory: checked } })
            }
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection
          icon={<CalendarDays size={18} />}
          title="Holiday Calendar"
          description="Add manual holidays or upload a CSV/XLSX file with Date, Name, Type."
          action={
            policy.visibility.showHolidayCalendar ? (
            <div className="leave-section-actions">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onUpload(file);
                  event.currentTarget.value = "";
                }}
              />
              <button
                type="button"
                className="leave-secondary-btn small"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileUp size={14} /> Upload
              </button>
              <button
                type="button"
                className="leave-secondary-btn small"
                onClick={() => patch({ holidays: [...policy.holidays, defaultHoliday()] })}
              >
                <Plus size={14} /> Add Holiday
              </button>
            </div>
            ) : undefined
          }
        >
        <div className="leave-setting-list">
          <ToggleRow
            title="Show Holiday Calendar"
            description="Display holidays configured for this policy in the mobile app."
            checked={policy.visibility.showHolidayCalendar}
            onChange={(checked) =>
              patch({ visibility: { ...policy.visibility, showHolidayCalendar: checked } })
            }
          />
        </div>
        {policy.visibility.showHolidayCalendar ? (
          <div className="leave-table-wrap">
            <table className="leave-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Holiday</th>
                  <th>Type</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {policy.holidays.map((holiday, index) => (
                  <tr key={holiday._id ?? index}>
                    <td>
                      <input
                        type="date"
                        value={holiday.date}
                        onChange={(event) => updateHoliday(index, { date: event.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        value={holiday.name}
                        placeholder="Holiday name"
                        onChange={(event) => updateHoliday(index, { name: event.target.value })}
                      />
                    </td>
                    <td>
                      <select
                        value={holiday.type}
                        onChange={(event) =>
                          updateHoliday(index, { type: event.target.value as LeaveHolidayType })
                        }
                      >
                        {HOLIDAY_TYPES.map((type) => (
                          <option value={type} key={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="leave-table-remove"
                        onClick={() =>
                          patch({
                            holidays: policy.holidays.filter((_, holidayIndex) => holidayIndex !== index),
                          })
                        }
                        aria-label="Remove holiday"
                      >
                        <X size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {!policy.holidays.length && (
                  <tr>
                    <td colSpan={4}>
                      <div className="leave-empty-inline">No holidays configured.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="leave-empty-inline">
            Holiday calendar is hidden from employees. Enable it to manage visible holidays.
          </div>
        )}
      </CollapsibleSection>

      <section className="leave-section">
        <SectionHeader
          icon={<CalendarDays size={18} />}
          title="Leave Types"
          description="Each type has its own entitlement, application, and approval rules."
          action={
            <button
              type="button"
              className="leave-secondary-btn small"
              onClick={() =>
                patch({
                  leaveTypes: [
                    ...policy.leaveTypes,
                    withDefaultApprover(
                      leaveConfigService.createCustomLeaveType({
                        name: "Custom Leave",
                        shortCode: `L${policy.leaveTypes.length + 1}`,
                        totalLeavesPerYear: 0,
                        entitlementType: "Annual",
                      }),
                      designations[0]?.id,
                    ),
                  ],
                })
              }
            >
              <Plus size={14} /> Add Type
            </button>
          }
        />
        <div className="leave-type-list">
          {policy.leaveTypes.map((leaveType, index) => (
            <article className="leave-type-card" key={leaveType._id ?? index}>
              <button type="button" onClick={() => onOpenType(index)}>
                <div>
                  <strong>{leaveType.name || "Leave Type"}</strong>
                  <span className="leave-type-code">
                    <i style={{ backgroundColor: colourForPicker(leaveType.colour) }} />
                    {leaveType.shortCode}
                  </span>
                </div>
                <p>
                  {leaveType.totalLeavesPerYear} days/year · {leaveType.entitlementType} ·{" "}
                  {leaveType.leaveYear} · Cycle {leaveType.attendanceCycle.startDay}-
                  {leaveType.attendanceCycle.endDay}
                </p>
              </button>
              <button
                type="button"
                className="leave-table-remove"
                onClick={() =>
                  patch({
                    leaveTypes: policy.leaveTypes.filter((_, typeIndex) => typeIndex !== index),
                  })
                }
                aria-label="Remove leave type"
              >
                <Trash2 size={14} />
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function LeaveTypeEditor({
  leaveType,
  designations,
  onBack,
  onChange,
}: {
  leaveType: LeaveTypeConfig;
  designations: Designation[];
  onBack: () => void;
  onChange: (leaveType: LeaveTypeConfig) => void;
}) {
  const defaultApproverRole = designations[0]?.id ?? "";

  useEffect(() => {
    if (!defaultApproverRole) return;
    const designationIds = new Set(designations.map((designation) => designation.id));
    let changed = false;
    const levels = leaveType.approvalWorkflow.levels.map((level) => {
      if (designationIds.has(level.approverRole)) return level;
      changed = true;
      return { ...level, approverRole: defaultApproverRole };
    });

    if (changed) {
      onChange({
        ...leaveType,
        approvalWorkflow: {
          ...leaveType.approvalWorkflow,
          levels,
        },
      });
    }
  }, [defaultApproverRole, designations, leaveType, onChange]);

  function patch(patchValue: Partial<LeaveTypeConfig>) {
    onChange({ ...leaveType, ...patchValue });
  }

  function updateApprovalLevel(index: number, patchValue: Partial<LeaveApprovalLevel>) {
    patch({
      approvalWorkflow: {
        ...leaveType.approvalWorkflow,
        levels: leaveType.approvalWorkflow.levels.map((level, levelIndex) =>
          levelIndex === index ? { ...level, ...patchValue } : level,
        ),
      },
    });
  }

  return (
    <div className="leave-editor">
      <button type="button" className="leave-inline-back" onClick={onBack}>
        <ArrowLeft size={15} /> Back to Policy
      </button>

      <section className="leave-section">
        <SectionHeader title="1. Leave Name" description="Name and short code used in app dropdowns, balances, and reports." />
        <div className="leave-form-grid">
          <label className="leave-field">
            <span>Leave Name</span>
            <input value={leaveType.name} onChange={(event) => patch({ name: event.target.value })} />
          </label>
          <label className="leave-field">
            <span>Short Code</span>
            <input
              value={leaveType.shortCode}
              maxLength={10}
              onChange={(event) => patch({ shortCode: event.target.value.toUpperCase() })}
            />
          </label>
          <label className="leave-field">
            <span>Color</span>
            <div className="leave-type-color">
              <input
                type="color"
                className="leave-type-color__picker"
                value={colourForPicker(leaveType.colour)}
                onChange={(event) =>
                  patch({ colour: normalizeHexColourInput(event.target.value) })
                }
                aria-label={`${leaveType.name || "Leave type"} color`}
              />
              <input
                className="leave-type-color__hex"
                value={leaveType.colour}
                placeholder="#2196F3"
                maxLength={7}
                pattern="#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})"
                onChange={(event) =>
                  patch({ colour: normalizeHexColourInput(event.target.value) })
                }
              />
            </div>
          </label>
        </div>
      </section>

      <section className="leave-section">
        <SectionHeader title="2. Leave Year & Attendance Cycle" description="Defines the leave calculation year and cycle days." />
        <div className="leave-form-grid">
          <label className="leave-field">
            <span>Leave Year</span>
            <select
              value={leaveType.leaveYear}
              onChange={(event) => patch({ leaveYear: event.target.value as LeaveYear })}
            >
              {LEAVE_YEARS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
          <label className="leave-field">
            <span>Cycle Start Day</span>
            <input
              type="number"
              min={1}
              max={31}
              value={leaveType.attendanceCycle.startDay}
              onChange={(event) =>
                patch({
                  attendanceCycle: {
                    ...leaveType.attendanceCycle,
                    startDay: Number(event.target.value),
                  },
                })
              }
            />
          </label>
          <label className="leave-field">
            <span>Cycle End Day</span>
            <input
              type="number"
              min={1}
              max={31}
              value={leaveType.attendanceCycle.endDay}
              onChange={(event) =>
                patch({
                  attendanceCycle: {
                    ...leaveType.attendanceCycle,
                    endDay: Number(event.target.value),
                  },
                })
              }
            />
          </label>
        </div>
      </section>

      <section className="leave-section">
        <SectionHeader title="3. Entitlement & Credit Rule" description="Controls how leave is credited to employees." />
        <div className="leave-form-grid">
          <label className="leave-field">
            <span>Entitlement Type</span>
            <select
              value={leaveType.entitlementType}
              onChange={(event) =>
                patch({ entitlementType: event.target.value as LeaveEntitlementType })
              }
            >
              {ENTITLEMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className="leave-field">
            <span>Total Leaves Per Year</span>
            <input
              type="number"
              min={0}
              max={365}
              value={leaveType.totalLeavesPerYear}
              onChange={(event) => patch({ totalLeavesPerYear: Number(event.target.value) })}
            />
          </label>
          <label className="leave-field">
            <span>Credit Rule</span>
            <select
              value={leaveType.creditRule.type}
              onChange={(event) =>
                patch({
                  creditRule: {
                    ...leaveType.creditRule,
                    type: event.target.value as LeaveCreditRuleType,
                  },
                })
              }
            >
              {CREDIT_RULES.map((rule) => (
                <option key={rule} value={rule}>
                  {creditRuleLabel(rule)}
                </option>
              ))}
            </select>
          </label>
          {leaveType.creditRule.type === "FixedDateOfMonth" && (
            <label className="leave-field">
              <span>Fixed Credit Date</span>
              <input
                type="number"
                min={1}
                max={31}
                value={leaveType.creditRule.fixedDate}
                onChange={(event) =>
                  patch({
                    creditRule: {
                      ...leaveType.creditRule,
                      fixedDate: Number(event.target.value),
                    },
                  })
                }
              />
            </label>
          )}
          <label className="leave-field">
            <span>Minimum Working Days</span>
            <input
              type="number"
              min={0}
              max={31}
              value={leaveType.creditRule.minimumWorkingDays}
              onChange={(event) =>
                patch({
                  creditRule: {
                    ...leaveType.creditRule,
                    minimumWorkingDays: Number(event.target.value),
                  },
                })
              }
            />
          </label>
        </div>
      </section>

      <section className="leave-section">
        <SectionHeader title="4. New Joiner Rules" description="Pro-rating, DOJ credit, and minimum tenure." />
        <div className="leave-setting-list">
          <ToggleRow
            title="Pro-rate for New Joiners"
            description="Adjust balance based on remaining months in the leave year."
            checked={leaveType.newJoinerRules.proRateForNewJoiners}
            onChange={(checked) =>
              patch({
                newJoinerRules: {
                  ...leaveType.newJoinerRules,
                  proRateForNewJoiners: checked,
                },
              })
            }
          />
          <ToggleRow
            title="Credit on DOJ"
            description="Credit leave immediately on the date of joining."
            checked={leaveType.newJoinerRules.creditOnDoj}
            onChange={(checked) =>
              patch({
                newJoinerRules: {
                  ...leaveType.newJoinerRules,
                  creditOnDoj: checked,
                },
              })
            }
          />
          <label className="leave-field compact">
            <span>Minimum Tenure to Start Earning</span>
            <input
              type="number"
              min={0}
              max={24}
              value={leaveType.newJoinerRules.minimumTenureMonths}
              onChange={(event) =>
                patch({
                  newJoinerRules: {
                    ...leaveType.newJoinerRules,
                    minimumTenureMonths: Number(event.target.value),
                  },
                })
              }
            />
          </label>
        </div>
      </section>

      <section className="leave-section">
        <SectionHeader title="5. Carry Forward" description="Year-end balance treatment." />
        <div className="leave-setting-list">
          <ToggleRow
            title="Carry Forward Allowed"
            checked={leaveType.carryForwardRule.isAllowed}
            onChange={(checked) =>
              patch({
                carryForwardRule: { ...leaveType.carryForwardRule, isAllowed: checked },
              })
            }
          />
          {leaveType.carryForwardRule.isAllowed && (
            <>
              <label className="leave-field compact">
                <span>Maximum Carry Forward Days</span>
                <input
                  type="number"
                  min={0}
                  max={365}
                  value={leaveType.carryForwardRule.maxDays}
                  onChange={(event) =>
                    patch({
                      carryForwardRule: {
                        ...leaveType.carryForwardRule,
                        maxDays: Number(event.target.value),
                      },
                    })
                  }
                />
              </label>
              <ToggleRow
                title="Expires at Year End"
                checked={leaveType.carryForwardRule.expiresAtYearEnd}
                onChange={(checked) =>
                  patch({
                    carryForwardRule: {
                      ...leaveType.carryForwardRule,
                      expiresAtYearEnd: checked,
                    },
                  })
                }
              />
            </>
          )}
        </div>
      </section>

      <section className="leave-section">
        <SectionHeader title="6. Application Rules" description="Backdated, future leave, monthly limits, and closing dates." />
        <div className="leave-setting-list">
          <ToggleRow
            title="Allow Backdated Leave"
            checked={leaveType.applicationRules.allowBackdated}
            onChange={(checked) =>
              patch({
                applicationRules: { ...leaveType.applicationRules, allowBackdated: checked },
              })
            }
          />
          {leaveType.applicationRules.allowBackdated && (
            <label className="leave-field compact">
              <span>Max Backdated Days</span>
              <input
                type="number"
                min={0}
                value={leaveType.applicationRules.maxBackdatedDays}
                onChange={(event) =>
                  patch({
                    applicationRules: {
                      ...leaveType.applicationRules,
                      maxBackdatedDays: Number(event.target.value),
                    },
                  })
                }
              />
            </label>
          )}
          <ToggleRow
            title="Allow Future Leave"
            checked={leaveType.applicationRules.allowFuture}
            onChange={(checked) =>
              patch({
                applicationRules: { ...leaveType.applicationRules, allowFuture: checked },
              })
            }
          />
          {leaveType.applicationRules.allowFuture && (
            <label className="leave-field compact">
              <span>Max Future Days</span>
              <input
                type="number"
                min={0}
                value={leaveType.applicationRules.maxFutureDays}
                onChange={(event) =>
                  patch({
                    applicationRules: {
                      ...leaveType.applicationRules,
                      maxFutureDays: Number(event.target.value),
                    },
                  })
                }
              />
            </label>
          )}
          <label className="leave-field compact">
            <span>Max Requests Per Month</span>
            <input
              type="number"
              min={0}
              value={leaveType.applicationRules.maxRequestsPerMonth}
              onChange={(event) =>
                patch({
                  applicationRules: {
                    ...leaveType.applicationRules,
                    maxRequestsPerMonth: Number(event.target.value),
                  },
                })
              }
            />
          </label>
          <ClosingDateEditor
            title="Application Closing Date"
            value={leaveType.applicationRules.applicationClosingDate}
            onChange={(value) =>
              patch({
                applicationRules: {
                  ...leaveType.applicationRules,
                  applicationClosingDate: value,
                },
              })
            }
          />
          <ClosingDateEditor
            title="Manager Approval Closing Date"
            value={leaveType.applicationRules.managerApprovalClosingDate}
            onChange={(value) =>
              patch({
                applicationRules: {
                  ...leaveType.applicationRules,
                  managerApprovalClosingDate: value,
                },
              })
            }
          />
        </div>
      </section>

      <section className="leave-section">
        <SectionHeader title="7. Reasons & Attachments" description="Reasons shown in the mobile app and proof requirements." />
        <div className="leave-form-grid">
          <label className="leave-field wide">
            <span>Reasons</span>
            <textarea
              value={leaveType.reasons.join("\n")}
              placeholder="One reason per line"
              rows={5}
              onChange={(event) =>
                patch({
                  reasons: event.target.value
                    .split("\n")
                    .map((reason) => reason.trim())
                    .filter(Boolean),
                })
              }
            />
          </label>
        </div>
        <div className="leave-setting-list">
          <ToggleRow
            title="Attachment Required"
            checked={leaveType.attachmentRules.isRequired}
            onChange={(checked) =>
              patch({
                attachmentRules: { ...leaveType.attachmentRules, isRequired: checked },
              })
            }
          />
          {leaveType.attachmentRules.isRequired && (
            <label className="leave-field compact">
              <span>Mandatory After Days</span>
              <input
                type="number"
                min={0}
                value={leaveType.attachmentRules.mandatoryAfterDays}
                onChange={(event) =>
                  patch({
                    attachmentRules: {
                      ...leaveType.attachmentRules,
                      mandatoryAfterDays: Number(event.target.value),
                    },
                  })
                }
              />
            </label>
          )}
          <ToggleRow
            title="Allow Camera Capture"
            checked={leaveType.attachmentRules.allowCameraCapture}
            onChange={(checked) =>
              patch({
                attachmentRules: {
                  ...leaveType.attachmentRules,
                  allowCameraCapture: checked,
                },
              })
            }
          />
          <ToggleRow
            title="Allow Gallery Upload"
            checked={leaveType.attachmentRules.allowGalleryUpload}
            onChange={(checked) =>
              patch({
                attachmentRules: {
                  ...leaveType.attachmentRules,
                  allowGalleryUpload: checked,
                },
              })
            }
          />
        </div>
      </section>

      <section className="leave-section">
        <SectionHeader
          title="8. Approval Workflow"
          description="Multi-level manager approval and auto action."
          action={
            leaveType.approvalWorkflow.isApprovalRequired &&
            leaveType.approvalWorkflow.levels.length < 10 ? (
              <button
                type="button"
                className="leave-secondary-btn small"
                onClick={() =>
                  patch({
                    approvalWorkflow: {
                      ...leaveType.approvalWorkflow,
                      levels: [
                        ...leaveType.approvalWorkflow.levels,
                        {
                          level: leaveType.approvalWorkflow.levels.length + 1,
                          approverRole: defaultApproverRole,
                          autoAction: "None",
                          autoActionDays: 0,
                        },
                      ],
                    },
                  })
                }
              >
                <Plus size={14} /> Add Level
              </button>
            ) : undefined
          }
        />
        <div className="leave-setting-list">
          <ToggleRow
            title="Approval Required"
            description="If disabled, leave requests are auto-approved on submission."
            checked={leaveType.approvalWorkflow.isApprovalRequired}
            onChange={(checked) =>
              patch({
                approvalWorkflow: {
                  ...leaveType.approvalWorkflow,
                  isApprovalRequired: checked,
                },
              })
            }
          />
          {leaveType.approvalWorkflow.isApprovalRequired && (
            <div className="leave-approval-list">
              {leaveType.approvalWorkflow.levels.map((level, index) => (
                <div className="leave-approval-row" key={index}>
                  <div className="leave-approval-num">{index + 1}</div>
                  <select
                    value={
                      designations.some((designation) => designation.id === level.approverRole)
                        ? level.approverRole
                        : ""
                    }
                    onChange={(event) => updateApprovalLevel(index, { approverRole: event.target.value })}
                    disabled={!designations.length}
                  >
                    <option value="" disabled>
                      {designations.length ? "Select designation" : "No designations available"}
                    </option>
                    {designations.map((designation) => (
                      <option value={designation.id} key={designation.id}>
                        {designation.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={level.autoAction}
                    onChange={(event) =>
                      updateApprovalLevel(index, { autoAction: event.target.value as LeaveAutoAction })
                    }
                  >
                    {AUTO_ACTIONS.map((action) => (
                      <option value={action} key={action}>
                        {autoActionLabel(action)}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={0}
                    value={level.autoActionDays}
                    onChange={(event) => updateApprovalLevel(index, { autoActionDays: Number(event.target.value) })}
                    aria-label="Auto action days"
                  />
                  <button
                    type="button"
                    className="leave-table-remove"
                    onClick={() =>
                      patch({
                        approvalWorkflow: {
                          ...leaveType.approvalWorkflow,
                          levels: leaveType.approvalWorkflow.levels.filter((_, levelIndex) => levelIndex !== index),
                        },
                      })
                    }
                    aria-label="Remove approval level"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="leave-section-header">
      <div className="leave-section-title-wrap">
        {icon && <div className="leave-section-icon">{icon}</div>}
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function CollapsibleSection({
  icon,
  title,
  description,
  action,
  children,
  defaultOpen = false,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={`leave-section leave-section--collapsible${open ? " open" : ""}`}>
      <div className="leave-section-header">
        <button
          type="button"
          className="leave-section-toggle"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
        >
          <div className="leave-section-title-wrap">
            {icon && <div className="leave-section-icon">{icon}</div>}
            <div>
              <h2>{title}</h2>
              <p>{description}</p>
            </div>
          </div>
          <ChevronRight className="leave-section-chevron" size={18} />
        </button>
        {action}
      </div>
      {open && <div className="leave-section-body">{children}</div>}
    </section>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="leave-toggle-row">
      <span>
        <strong>{title}</strong>
        {description && <small>{description}</small>}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <i aria-hidden />
    </label>
  );
}

function ClosingDateEditor({
  title,
  value,
  onChange,
}: {
  title: string;
  value: { isEnabled: boolean; day: number };
  onChange: (value: { isEnabled: boolean; day: number }) => void;
}) {
  return (
    <div className="leave-closing-editor">
      <ToggleRow
        title={title}
        checked={value.isEnabled}
        onChange={(checked) => onChange({ ...value, isEnabled: checked })}
      />
      {value.isEnabled && (
        <label className="leave-field compact">
          <span>Day of Month</span>
          <input
            type="number"
            min={1}
            max={31}
            value={value.day}
            onChange={(event) => onChange({ ...value, day: Number(event.target.value) })}
          />
        </label>
      )}
    </div>
  );
}
