"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  attendanceFormSchemaService,
  featureConfigService,
  featureWizardService,
  formatApiError,
  getWizardFlow,
  isWizardFlowComplete,
  type AttendanceFormType,
  type FeatureConfigDto,
  type FeatureWizardDocument,
  type UdfSchemaField,
} from "@/lib/api";
import {
  attendanceConfigService,
  docToForm,
  type AttendanceConfigForm,
} from "@/lib/api/attendance-config";
import { If2Toast, type ToastState } from "@/components/accounts/if2-toast";
import { AttendanceConfigEdit } from "./attendance-config-edit";
import { AttendanceFormBuilder } from "./attendance-form-builder";

interface Props {
  projectId: string;
  projectName: string;
}

type StepId = "configuration" | "forms" | "review";
type FormErrors = Partial<Record<AttendanceFormType, string | null>>;
type FormSaving = Partial<Record<AttendanceFormType, boolean>>;
type FormValidation = Partial<Record<AttendanceFormType, string[]>>;

const EMPTY_FORM_ERRORS: FormErrors = { "check-in": null, "check-out": null };

export function AttendanceConfigPage({ projectId, projectName }: Props) {
  const [step, setStep] = useState<StepId>("configuration");
  const [form, setForm] = useState<AttendanceConfigForm | null>(null);
  const [saved, setSaved] = useState<AttendanceConfigForm | null>(null);
  const [exists, setExists] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [activating, setActivating] = useState(false);
  const [featureConfig, setFeatureConfig] = useState<FeatureConfigDto | null>(null);
  const [featureWizard, setFeatureWizard] = useState<FeatureWizardDocument | null>(null);

  const [schemas, setSchemas] = useState<Record<AttendanceFormType, UdfSchemaField[]>>({
    "check-in": [],
    "check-out": [],
  });
  const [savedSchemas, setSavedSchemas] = useState<Record<AttendanceFormType, UdfSchemaField[]>>({
    "check-in": [],
    "check-out": [],
  });
  const [formErrors, setFormErrors] = useState<FormErrors>(EMPTY_FORM_ERRORS);
  const [formSaving, setFormSaving] = useState<FormSaving>({});
  const [formValidation, setFormValidation] = useState<FormValidation>({});

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [doc, checkInSchema, checkOutSchema, nextFeatureConfig, nextFeatureWizard] =
        await Promise.all([
        attendanceConfigService.get(projectId),
        attendanceFormSchemaService.get(projectId, "check-in"),
        attendanceFormSchemaService.get(projectId, "check-out"),
        featureConfigService.getRawByProject(projectId),
        featureWizardService.getByProject(projectId),
      ]);
      const next = docToForm(doc);
      setForm(next);
      setSaved(next);
      setExists(Boolean(doc));
      setFeatureConfig(nextFeatureConfig);
      setFeatureWizard(nextFeatureWizard);
      setSchemas({
        "check-in": checkInSchema?.fields ?? [],
        "check-out": checkOutSchema?.fields ?? [],
      });
      setSavedSchemas({
        "check-in": checkInSchema?.fields ?? [],
        "check-out": checkOutSchema?.fields ?? [],
      });
    } catch (err) {
      setLoadError(formatApiError(err, "Failed to load attendance configuration"));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!form?.checkOutEnabled) {
      setFormValidation((prev) => ({ ...prev, "check-out": [] }));
      setFormErrors((prev) => ({ ...prev, "check-out": null }));
    }
  }, [form?.checkOutEnabled]);

  const dirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(saved),
    [form, saved],
  );

  const configComplete = exists && !dirty && Object.keys(errors).length === 0;
  const photoFieldRequired = Boolean(form?.types.some((item) => item.photoRequired));
  const remarksRequired = Boolean(form?.remarksEnabled);
  const checkInComplete = savedSchemas["check-in"].length > 0;
  const checkOutRequired = form?.checkOutEnabled ?? true;
  const checkOutComplete = !checkOutRequired || savedSchemas["check-out"].length > 0;
  const formsComplete = checkInComplete && checkOutComplete;
  const onboardingComplete = isWizardFlowComplete(featureWizard, "onboarding");
  const attendanceFlow = getWizardFlow(featureWizard, "attendance");
  const storeFlowComplete = isWizardFlowComplete(featureWizard, "store");
  const attendanceWizardComplete = isWizardFlowComplete(featureWizard, "attendance");
  const attendanceModuleActive = Boolean(
    featureConfig?.modules.find((module) => module.key === "attendance")?.isActive,
  );
  const reviewReady =
    configComplete && formsComplete && onboardingComplete && attendanceWizardComplete;

  const stepItems: Array<{ id: StepId; title: string; complete: boolean; available: boolean }> = [
    {
      id: "configuration",
      title: "Configuration",
      complete: configComplete,
      available: true,
    },
    {
      id: "forms",
      title: "Form Builder",
      complete: formsComplete,
      available: exists,
    },
    {
      id: "review",
      title: "Review & Activate",
      complete: false,
      available: reviewReady,
    },
  ];

  const handleChange = useCallback(
    <K extends keyof AttendanceConfigForm>(key: K, value: AttendanceConfigForm[K]) => {
      setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
      setErrors((prev) => {
        if (Object.keys(prev).length === 0) return prev;
        return {};
      });
    },
    [],
  );

  const handleDiscard = useCallback(() => {
    setForm(saved);
    setErrors({});
  }, [saved]);

  const handleSaveConfiguration = useCallback(async () => {
    if (!form) return false;
    const validation = validateConfig(form);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      setToast({ message: "Please fix the highlighted fields", type: "error" });
      return false;
    }
    setErrors({});
    setSaving(true);
    try {
      if (exists) {
        await attendanceConfigService.update(projectId, form);
      } else {
        await attendanceConfigService.create(projectId, form);
        setExists(true);
      }
      setSaved(form);
      const [nextFeatureWizard, nextFeatureConfig] = await Promise.all([
        featureWizardService.getByProject(projectId),
        featureConfigService.getRawByProject(projectId),
      ]);
      setFeatureWizard(nextFeatureWizard);
      setFeatureConfig(nextFeatureConfig);
      setToast({ message: "Attendance configuration saved", type: "success" });
      return true;
    } catch (err) {
      setToast({ message: formatApiError(err, "Failed to save"), type: "error" });
      return false;
    } finally {
      setSaving(false);
    }
  }, [exists, form, projectId]);

  function handleSchemaChange(formType: AttendanceFormType, nextFields: UdfSchemaField[]) {
    setSchemas((prev) => ({ ...prev, [formType]: nextFields }));
    setFormValidation((prev) => ({ ...prev, [formType]: [] }));
    setFormErrors((prev) => ({ ...prev, [formType]: null }));
  }

  async function handleSchemaSave(formType: AttendanceFormType) {
    if (formType === "check-out" && !checkOutRequired) {
      return;
    }
    const fields = schemas[formType];
    const validation = validateAttendanceSchema(fields, {
      remarksRequired,
      photoFieldRequired,
    });
    if (validation.length > 0) {
      setFormValidation((prev) => ({ ...prev, [formType]: validation }));
      return;
    }

    setFormValidation((prev) => ({ ...prev, [formType]: [] }));
    setFormSaving((prev) => ({ ...prev, [formType]: true }));
    setFormErrors((prev) => ({ ...prev, [formType]: null }));

    try {
      await attendanceFormSchemaService.save(formType, {
        projectId,
        fields,
      });
      setSavedSchemas((prev) => ({ ...prev, [formType]: fields }));
      const [nextFeatureWizard, nextFeatureConfig] = await Promise.all([
        featureWizardService.getByProject(projectId),
        featureConfigService.getRawByProject(projectId),
      ]);
      setFeatureWizard(nextFeatureWizard);
      setFeatureConfig(nextFeatureConfig);
      setToast({
        message: `${labelForFormType(formType)} form schema saved`,
        type: "success",
      });
    } catch (err) {
      setFormErrors((prev) => ({
        ...prev,
        [formType]: formatApiError(err, `Failed to save ${labelForFormType(formType)} form`),
      }));
    } finally {
      setFormSaving((prev) => ({ ...prev, [formType]: false }));
    }
  }

  async function handleActivate() {
    if (!reviewReady) {
      setToast({
        message: activationBlockReason({
          onboardingComplete,
          attendanceWizardComplete,
          storeFlowComplete,
          geoFencingEnabled: Boolean(form?.types.some((type) => type.geoFenced)),
        }),
        type: "error",
      });
      return;
    }

    setActivating(true);
    try {
      await attendanceConfigService.activate(projectId);
      const [nextFeatureWizard, nextFeatureConfig] = await Promise.all([
        featureWizardService.getByProject(projectId),
        featureConfigService.getRawByProject(projectId),
      ]);
      setFeatureWizard(nextFeatureWizard);
      setFeatureConfig(nextFeatureConfig);
      setToast({ message: "Attendance module activated successfully", type: "success" });
    } catch (err) {
      setToast({
        message: formatApiError(err, "Module could not be activated"),
        type: "error",
      });
    } finally {
      setActivating(false);
    }
  }

  if (loading) {
    return (
      <div className="att-config-page">
        <div className="edit-skeleton">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton-section" />
          ))}
        </div>
      </div>
    );
  }

  if (loadError || !form) {
    return (
      <div className="att-config-page">
        <div className="config-load-error">
          <p>{loadError ?? "Configuration unavailable."}</p>
          <button className="btn btn-secondary btn-sm" onClick={() => void load()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="att-config-page">
        <div className="att-setup-shell">
          <div className="att-setup-stepper">
            {stepItems.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={`att-setup-stepper__item${step === item.id ? " active" : ""}${
                  item.complete ? " complete" : ""
                }`}
                onClick={() => item.available && setStep(item.id)}
                disabled={!item.available}
              >
                <span className="att-setup-stepper__index">
                  {item.complete ? "✓" : index + 1}
                </span>
                <span className="att-setup-stepper__label">{item.title}</span>
              </button>
            ))}
          </div>

          {step === "configuration" ? (
            <div className="att-setup-panel">
              <AttendanceConfigEdit
                projectName={projectName}
                form={form}
                errors={errors}
                dirty={dirty}
                saving={saving}
                onChange={handleChange}
                onSave={() => void handleSaveConfiguration()}
                onDiscard={handleDiscard}
              />
              <div className="att-setup-panel__footer">
                <div className="att-setup-panel__footerCopy">
                  Save the attendance configuration before defining check-in and check-out forms.
                  {!form.checkOutEnabled
                    ? " Check-out is disabled, so only the check-in form will be required."
                    : ""}
                </div>
                <button
                  className="btn btn-primary"
                  onClick={async () => {
                    const ok = await handleSaveConfiguration();
                    if (ok) setStep("forms");
                  }}
                  disabled={saving}
                >
                  Save & Continue to Form Builder
                </button>
              </div>
            </div>
          ) : null}

          {step === "forms" ? (
            <div className="att-setup-panel">
              <div className="att-form-tabs">
                {(["check-in", "check-out"] as AttendanceFormType[])
                  .filter((formType) => formType === "check-in" || checkOutRequired)
                  .map((formType) => (
                  <button
                    key={formType}
                    type="button"
                    className={`att-form-tabs__chip${
                      schemas[formType].length > 0 ? " saved" : ""
                    }`}
                    onClick={() => setFormValidation((prev) => ({ ...prev, [formType]: [] }))}
                  >
                    {labelForFormType(formType)}
                    <span>{savedSchemas[formType].length} fields</span>
                  </button>
                  ))}
              </div>

              <AttendanceFormBuilder
                projectId={projectId}
                formType="check-in"
                title="Check-In Form"
                fields={schemas["check-in"]}
                savedFields={savedSchemas["check-in"]}
                loading={false}
                saving={Boolean(formSaving["check-in"])}
                requirements={{ remarksRequired, photoFieldRequired }}
                error={formErrors["check-in"] ?? null}
                validationErrors={formValidation["check-in"] ?? []}
                onChange={(fields) => handleSchemaChange("check-in", fields)}
                onSave={() => void handleSchemaSave("check-in")}
              />

              {checkOutRequired ? (
                <AttendanceFormBuilder
                  projectId={projectId}
                  formType="check-out"
                  title="Check-Out Form"
                  fields={schemas["check-out"]}
                  savedFields={savedSchemas["check-out"]}
                  loading={false}
                  saving={Boolean(formSaving["check-out"])}
                  requirements={{ remarksRequired, photoFieldRequired }}
                  error={formErrors["check-out"] ?? null}
                  validationErrors={formValidation["check-out"] ?? []}
                  onChange={(fields) => handleSchemaChange("check-out", fields)}
                  onSave={() => void handleSchemaSave("check-out")}
                />
              ) : (
                <div className="att-form-skip-card">
                  <strong>Check-Out form not required</strong>
                  <p>
                    Check-out is disabled in attendance configuration, so this schema step is
                    skipped automatically.
                  </p>
                </div>
              )}

              <div className="att-setup-panel__footer">
                <div className="att-setup-panel__footerCopy">
                  Each form schema must satisfy the attendance rules for remarks and photo capture.
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => setStep("review")}
                  disabled={!formsComplete}
                >
                  Continue to Review
                </button>
              </div>
            </div>
          ) : null}

          {step === "review" ? (
            <div className="att-review">
              <div className="att-review__head">
                <div className="page-eyebrow">Step 3</div>
                <h2 className="page-title">Review & Activate</h2>
                <p className="page-desc">
                  Confirm the attendance setup is complete, then activate the module for this
                  project.
                </p>
              </div>

              <div className="att-review__grid">
                <ReviewCard
                  title="Configuration"
                  status={configComplete ? "Complete" : exists ? "Unsaved changes" : "Missing"}
                  tone={configComplete ? "success" : "warning"}
                  details={[
                    `${form.types.length} attendance types configured`,
                    remarksRequired ? "Remarks enabled" : "Remarks disabled",
                    photoFieldRequired ? "Photo-backed types present" : "Photo optional",
                    form.types.some((type) => type.geoFenced)
                      ? storeFlowComplete
                        ? "Store flow complete for geo-fencing"
                        : "Store flow incomplete for geo-fencing"
                      : "Geo-fencing not enabled",
                  ]}
                />
                <ReviewCard
                  title="Check-In Form"
                  status={checkInComplete ? "Ready" : "Missing"}
                  tone={checkInComplete ? "success" : "warning"}
                  details={[
                    `${savedSchemas["check-in"].length} fields saved`,
                    remarksRequired ? 'Requires "remarks"' : "No mandatory remarks field",
                    photoFieldRequired
                      ? 'Requires "pictures" or "photos"'
                      : "No mandatory photo field",
                  ]}
                />
                <ReviewCard
                  title="Check-Out Form"
                  status={!checkOutRequired ? "Skipped" : checkOutComplete ? "Ready" : "Missing"}
                  tone={!checkOutRequired || checkOutComplete ? "success" : "warning"}
                  details={[
                    !checkOutRequired
                      ? "Check-out disabled in configuration"
                      : `${savedSchemas["check-out"].length} fields saved`,
                    !checkOutRequired
                      ? "No check-out schema required"
                      : remarksRequired
                        ? 'Requires "remarks"'
                        : "No mandatory remarks field",
                    !checkOutRequired
                      ? "Wizard auto-completes this step"
                      : photoFieldRequired
                        ? 'Requires "pictures" or "photos"'
                        : "No mandatory photo field",
                  ]}
                />
              </div>

              <div className="att-review__callout">
                Module activation is only available after configuration plus all required
                attendance form schemas are saved successfully.
              </div>

              <div className="att-review__wizardGrid">
                <WizardFlowCard
                  title="Onboarding Flow"
                  flow={getWizardFlow(featureWizard, "onboarding")}
                />
                <WizardFlowCard
                  title="Attendance Flow"
                  flow={attendanceFlow}
                />
                <WizardFlowCard
                  title="Store Flow"
                  flow={getWizardFlow(featureWizard, "store")}
                />
              </div>

              <div className="att-review__callout">
                {attendanceModuleActive
                  ? "Attendance is already active for this project."
                  : activationBlockReason({
                      onboardingComplete,
                      attendanceWizardComplete,
                      storeFlowComplete,
                      geoFencingEnabled: Boolean(form.types.some((type) => type.geoFenced)),
                    })}
              </div>

              <div className="att-setup-panel__footer">
                <div className="att-setup-panel__footerCopy">
                  {attendanceModuleActive
                    ? "Attendance is already active. You can still review the wizard state above."
                    : reviewReady
                      ? "Everything is in place. You can activate attendance now."
                      : "Finish the required wizard steps before activating the attendance module."}
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => void handleActivate()}
                  disabled={!reviewReady || activating || attendanceModuleActive}
                >
                  {attendanceModuleActive
                    ? "Attendance Already Active"
                    : activating
                      ? "Activating…"
                      : "Activate Attendance Module"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <If2Toast toast={toast} onDismiss={() => setToast(null)} />
    </>
  );
}

function activationBlockReason({
  onboardingComplete,
  attendanceWizardComplete,
  storeFlowComplete,
  geoFencingEnabled,
}: {
  onboardingComplete: boolean;
  attendanceWizardComplete: boolean;
  storeFlowComplete: boolean;
  geoFencingEnabled: boolean;
}): string {
  if (!onboardingComplete) {
    return "Complete onboarding setup before activating attendance.";
  }
  if (geoFencingEnabled && !storeFlowComplete) {
    return "Complete the store flow before activating geo-fenced attendance.";
  }
  if (!attendanceWizardComplete) {
    return "Complete the attendance wizard steps before activating the module.";
  }
  return "Everything is in place. You can activate attendance now.";
}

function labelForFormType(formType: AttendanceFormType): string {
  return formType === "check-in" ? "Check-In" : "Check-Out";
}

function validateConfig(form: AttendanceConfigForm): Record<string, string> {
  const errors: Record<string, string> = {};

  if (form.types.some((t) => t.geoFenced)) {
    if (form.geoFenceRadius < 10 || form.geoFenceRadius > 5000) {
      errors.geoFenceRadius = "Radius must be between 10 and 5000 metres.";
    }
  }

  if (form.workingHoursEnabled) {
    if (form.presentThresholdHrs <= 0 || form.presentThresholdHrs > 24) {
      errors.presentThresholdHrs = "Present hours must be between 0 and 24.";
    }
    if (form.absentThresholdHrs <= 0 || form.absentThresholdHrs > 24) {
      errors.absentThresholdHrs = "Absent hours must be between 0 and 24.";
    }
    if (
      form.halfDayMinHrs <= 0 ||
      form.halfDayMaxHrs > 24 ||
      form.halfDayMinHrs >= form.halfDayMaxHrs
    ) {
      errors.halfDay = "Half-day range must be valid (min < max, within 0–24).";
    }
  }

  if (form.regularizationEnabled) {
    if (form.regWindowType === "Days") {
      if (form.regTminusDays < 1 || form.regTminusDays > 90) {
        errors.regTminusDays = "Days must be between 1 and 90.";
      }
    } else if (
      form.regDateFrom < 1 ||
      form.regDateFrom > 31 ||
      form.regDateTo < 1 ||
      form.regDateTo > 31
    ) {
      errors.regDateRange = "Day of month must be between 1 and 31.";
    }

    if (form.regMaxRequestsEnabled && form.regMaxRequestCount < 1) {
      errors.regMaxRequestCount = "Max requests must be at least 1.";
    }

    if (
      form.regApprovalEnabled &&
      form.approvalLevels.filter((level) => level.role.trim()).length === 0
    ) {
      errors.approvalLevels = "Add at least one approval level.";
    }

    if (
      form.autoApprovalEnabled &&
      (form.autoApprovalAfterDays < 0 || form.autoApprovalAfterDays > 90)
    ) {
      errors.autoApprovalAfterDays = "Auto approval days must be between 0 and 90.";
    }

    if (
      form.autoRejectEnabled &&
      (form.autoRejectAfterDays < 0 || form.autoRejectAfterDays > 90)
    ) {
      errors.autoRejectAfterDays = "Auto reject days must be between 0 and 90.";
    }
  }

  return errors;
}

function validateAttendanceSchema(
  fields: UdfSchemaField[],
  rules: { remarksRequired: boolean; photoFieldRequired: boolean },
): string[] {
  const errors: string[] = [];
  const keys = new Set<string>();
  const orders = new Set<number>();

  if (fields.length === 0) {
    errors.push("Add at least one field before saving this form.");
    return errors;
  }

  fields.forEach((field, index) => {
    const fieldKey = field.fieldKey.trim();
    const label = field.label.trim();
    const order = field.order ?? index + 1;

    if (!fieldKey) errors.push(`Field ${index + 1}: field key is required.`);
    if (!label) errors.push(`Field ${index + 1}: label is required.`);

    if (fieldKey) {
      if (keys.has(fieldKey)) errors.push(`Duplicate field key: ${fieldKey}`);
      keys.add(fieldKey);
    }

    if (orders.has(order)) errors.push(`Duplicate order value: ${order}`);
    orders.add(order);

    const config =
      field.config && typeof field.config === "object"
        ? (field.config as Record<string, unknown>)
        : {};

    if (field.type === "DROPDOWN") {
      const options = Array.isArray(config.options) ? config.options : [];
      if (options.length === 0) {
        errors.push(`${label || fieldKey}: add at least one dropdown option.`);
      }
    }

    if (field.type === "API_SELECT") {
      if (!String(config.sourceKey ?? "").trim()) {
        errors.push(`${label || fieldKey}: source key is required.`);
      }
      if (!String(config.labelKey ?? "").trim()) {
        errors.push(`${label || fieldKey}: label key is required.`);
      }
      if (!String(config.valueKey ?? "").trim()) {
        errors.push(`${label || fieldKey}: value key is required.`);
      }
    }
  });

  if (rules.remarksRequired && !keys.has("remarks")) {
    errors.push('This form must include a field with fieldKey "remarks".');
  }

  if (rules.photoFieldRequired && !(keys.has("pictures") || keys.has("photos"))) {
    errors.push('This form must include a field with fieldKey "pictures" or "photos".');
  }

  return errors;
}

function ReviewCard({
  title,
  status,
  tone,
  details,
}: {
  title: string;
  status: string;
  tone: "success" | "warning";
  details: string[];
}) {
  return (
    <div className={`att-review__card ${tone}`}>
      <div className="att-review__cardHead">
        <strong>{title}</strong>
        <span>{status}</span>
      </div>
      <ul className="att-review__list">
        {details.map((detail) => (
          <li key={detail}>{detail}</li>
        ))}
      </ul>
    </div>
  );
}

function WizardFlowCard({
  title,
  flow,
}: {
  title: string;
  flow: FeatureWizardDocument["flows"][number] | null;
}) {
  const steps = flow?.steps ?? [];
  const completed = steps.filter((step) => step.status === "COMPLETED").length;
  const total = steps.length;

  return (
    <div className="att-review__flowCard">
      <div className="att-review__flowHead">
        <strong>{title}</strong>
        <span>
          {completed}/{total || 0} complete
        </span>
      </div>
      <div className="att-review__flowSteps">
        {steps.length === 0 ? (
          <div className="att-review__flowStep pending">No flow data available</div>
        ) : (
          steps.map((step, index) => {
            const previousDone = steps
              .slice(0, index)
              .every((item) => item.status === "COMPLETED");
            const className =
              step.status === "COMPLETED"
                ? "completed"
                : previousDone
                  ? "active"
                  : "blocked";
            return (
              <div key={step.key} className={`att-review__flowStep ${className}`}>
                <span className="att-review__flowDot">
                  {step.status === "COMPLETED" ? "✓" : index + 1}
                </span>
                <div>
                  <strong>{humanizeStepKey(step.key)}</strong>
                  <p>
                    {step.status === "COMPLETED"
                      ? "Completed"
                      : previousDone
                        ? "Current step"
                        : "Waiting for previous step"}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function humanizeStepKey(key: string): string {
  return key
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
