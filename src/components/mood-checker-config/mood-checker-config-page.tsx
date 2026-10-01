"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  FileText,
  Info,
  Lock,
  MessageSquare,
  MessageSquareText,
  Pencil,
  Plus,
  Settings2,
  Smile,
  Trash2,
  X,
} from "lucide-react";
import { If2Toast, type ToastState } from "@/components/accounts/if2-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  ApiError,
  MOOD_MAX_EVERY_N_DAYS,
  MOOD_MAX_OPTIONS,
  MOOD_MIN_OPTIONS,
  MOOD_WEEKDAYS,
  defaultMoodConfigForm,
  designationService,
  formatApiError,
  moodCheckerConfigService,
  moodConfigToForm,
  moodFormToInput,
  validateMoodConfigForm,
  type Designation,
  type MoodConfigForm,
  type MoodConfiguration,
  type MoodEnforcementMode,
  type MoodFrequencyType,
  type MoodTriggerPoint,
  type MoodWeekday,
} from "@/lib/api";
import { useAuth } from "@/lib/auth/auth-context";
import { canManageModules } from "@/lib/auth/permissions";
import { projectAdminBase } from "@/lib/nav/nav";
import {
  AddOptionModal,
  DesignationMultiSelect,
  RadioPillGroup,
  SaveBar,
  Section,
  SettingRow,
  Toggle,
} from "./mood-checker-editor-parts";

type View = "list" | "editor";
type SectionId = "basic" | "question" | "comment" | "frequency" | "enforcement";

const FREQUENCY_OPTIONS: { value: MoodFrequencyType; label: string }[] = [
  { value: "DAILY", label: "Daily" },
  { value: "SELECT_DAYS", label: "Select Days" },
  { value: "SELECT_DATES", label: "Select Dates" },
  { value: "EVERY_N_DAYS", label: "Every N Days" },
];

const TRIGGER_OPTIONS: { value: MoodTriggerPoint; label: string }[] = [
  { value: "ON_APP_OPEN", label: "On App Open" },
  { value: "AFTER_CHECK_IN", label: "After Check-In" },
  { value: "SCHEDULED_TIME", label: "Scheduled Time" },
];

const TRIGGER_HINTS: Record<MoodTriggerPoint, string> = {
  ON_APP_OPEN: "Appears as the first screen when user opens the app on a scheduled day.",
  AFTER_CHECK_IN: "Appears immediately after the user completes attendance check-in.",
  SCHEDULED_TIME: "Push notification sent at this time (IST). Tapping it opens the mood check-in.",
};

const ALL_DATES = Array.from({ length: 31 }, (_, index) => index + 1);

export function frequencySummary(config: Pick<MoodConfiguration, "frequency">): string {
  const { type, days, dates, everyNDays } = config.frequency;
  switch (type) {
    case "SELECT_DAYS":
      return days.length
        ? MOOD_WEEKDAYS.filter((day) => days.includes(day.value)).map((day) => day.label).join(", ")
        : "Select Days";
    case "SELECT_DATES":
      return dates.length ? `Dates ${[...dates].sort((a, b) => a - b).join(", ")}` : "Select Dates";
    case "EVERY_N_DAYS":
      return everyNDays === 1 ? "Every day" : `Every ${everyNDays} days`;
    default:
      return "Daily";
  }
}

function designationSummary(ids: string[], designations: Designation[]): string {
  if (!ids.length) return "No designations assigned";
  const names = ids.map((id) => designations.find((designation) => designation.id === id)?.name ?? "Unknown");
  return names.length > 3 ? `${names.slice(0, 3).join(", ")} +${names.length - 3} more` : names.join(", ");
}

/** True when the editor has changes compared with the last saved state. */
export function isMoodFormDirty(form: MoodConfigForm, saved: MoodConfigForm): boolean {
  return JSON.stringify(form) !== JSON.stringify(saved);
}

export function MoodCheckerConfigPage({
  projectId,
  accountCode,
  projectCode,
}: {
  projectId: string;
  projectName: string;
  accountCode: string;
  projectCode: string;
}) {
  const { user } = useAuth();
  const readOnly = !canManageModules(user);
  const base = projectAdminBase(accountCode, projectCode);

  const [view, setView] = useState<View>("list");
  const [configs, setConfigs] = useState<MoodConfiguration[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);

  const [form, setForm] = useState<MoodConfigForm>(defaultMoodConfigForm);
  const [saved, setSaved] = useState<MoodConfigForm>(defaultMoodConfigForm);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [conflictIds, setConflictIds] = useState<Set<string>>(() => new Set());
  const [openSections, setOpenSections] = useState<Record<SectionId, boolean>>({
    basic: true,
    question: false,
    comment: false,
    frequency: false,
    enforcement: false,
  });
  const [addOptionOpen, setAddOptionOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<MoodConfiguration | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const isNew = !form.id;
  const dirty = isMoodFormDirty(form, saved);
  const dismissToast = useCallback(() => setToast(null), []);
  const closeAddOption = useCallback(() => setAddOptionOpen(false), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [configList, designationList] = await Promise.all([
          moodCheckerConfigService.list(projectId),
          designationService.listByProject(projectId),
        ]);
        if (cancelled) return;
        setConfigs(configList);
        setDesignations(designationList);
      } catch (error) {
        if (!cancelled) {
          setToast({ type: "error", message: formatApiError(error, "Failed to load Mood Checker configurations") });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  /** Designations used by other configs → that config's name (one config per designation). */
  const assignedElsewhere = useMemo(() => {
    const map = new Map<string, string>();
    configs
      .filter((config) => config.id !== form.id)
      .forEach((config, index) =>
        config.applicableDesignations.forEach((id) => map.set(id, config.name || `Config ${index + 1}`)),
      );
    return map;
  }, [configs, form.id]);

  function update(patch: Partial<MoodConfigForm>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function openEditor(next: MoodConfigForm) {
    setForm(next);
    setSaved(next);
    setErrors([]);
    setConflictIds(new Set());
    setOpenSections({ basic: true, question: false, comment: false, frequency: false, enforcement: false });
    setView("editor");
  }

  function startCreate() {
    openEditor(defaultMoodConfigForm());
  }

  function startEdit(config: MoodConfiguration) {
    openEditor(moodConfigToForm(config));
  }

  function backToList(force = false) {
    if (!force && dirty && !readOnly) {
      setConfirmLeave(true);
      return;
    }
    setConfirmLeave(false);
    setView("list");
  }

  function toggleSection(id: SectionId) {
    setOpenSections((current) => ({ ...current, [id]: !current[id] }));
  }

  async function save() {
    const nextErrors = validateMoodConfigForm(form);
    setErrors(nextErrors);
    if (nextErrors.length) {
      setToast({ type: "error", message: nextErrors[0] });
      return;
    }

    setSaving(true);
    setConflictIds(new Set());
    try {
      const input = moodFormToInput(form);
      const result = form.id
        ? await moodCheckerConfigService.update(form.id, projectId, input)
        : await moodCheckerConfigService.create({ ...input, projectId });
      const next = moodConfigToForm(result);
      setForm(next);
      setSaved(next);
      setConfigs((current) => {
        const exists = current.some((config) => config.id === result.id);
        return exists ? current.map((config) => (config.id === result.id ? result : config)) : [...current, result];
      });
      setToast({ type: "success", message: `"${result.name}" saved.` });
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        const ids = Array.isArray(error.details?.conflictingDesignationIds)
          ? (error.details.conflictingDesignationIds as unknown[]).map(String)
          : [];
        setConflictIds(new Set(ids));
        setOpenSections((current) => ({ ...current, basic: true }));
      }
      setToast({ type: "error", message: formatApiError(error, "Failed to save Mood Checker configuration") });
    } finally {
      setSaving(false);
    }
  }

  function discard() {
    setForm(saved);
    setErrors([]);
    setConflictIds(new Set());
    setToast({ type: "success", message: "Changes discarded." });
  }

  async function cloneConfig(config: MoodConfiguration) {
    setBusyId(config.id);
    try {
      const clone = await moodCheckerConfigService.clone(config.id, projectId);
      setConfigs((current) => {
        const index = current.findIndex((item) => item.id === config.id);
        const next = [...current];
        next.splice(index + 1, 0, clone);
        return next;
      });
      setToast({ type: "success", message: `Cloned "${config.name}". Assign designations to the copy.` });
    } catch (error) {
      setToast({ type: "error", message: formatApiError(error, "Failed to clone Mood Checker configuration") });
    } finally {
      setBusyId(null);
    }
  }

  function requestDelete(config: MoodConfiguration) {
    if (configs.length <= 1) {
      setToast({ type: "error", message: "At least one Mood Checker configuration is required." });
      return;
    }
    setConfirmDelete(config);
  }

  async function deleteConfig() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await moodCheckerConfigService.remove(confirmDelete.id, projectId);
      setConfigs((current) => current.filter((config) => config.id !== confirmDelete.id));
      setToast({ type: "success", message: `"${confirmDelete.name}" deleted.` });
      setConfirmDelete(null);
    } catch (error) {
      setToast({ type: "error", message: formatApiError(error, "Failed to delete Mood Checker configuration") });
    } finally {
      setDeleting(false);
    }
  }

  function moveOption(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= form.options.length) return;
    const options = [...form.options];
    [options[index], options[target]] = [options[target], options[index]];
    update({ options });
  }

  function removeOption(index: number) {
    if (form.options.length <= MOOD_MIN_OPTIONS) {
      setToast({ type: "error", message: `Minimum ${MOOD_MIN_OPTIONS} options required.` });
      return;
    }
    update({ options: form.options.filter((_, position) => position !== index) });
  }

  function openAddOption() {
    if (form.options.length >= MOOD_MAX_OPTIONS) {
      setToast({ type: "error", message: `You can add up to ${MOOD_MAX_OPTIONS} options.` });
      return;
    }
    setAddOptionOpen(true);
  }

  function addOption(option: { label: string; emoji: string }) {
    update({ options: [...form.options, option] });
    setAddOptionOpen(false);
    setToast({ type: "success", message: `"${option.label}" added.` });
  }

  function toggleDay(day: MoodWeekday) {
    const days = form.frequency.days.includes(day)
      ? form.frequency.days.filter((item) => item !== day)
      : MOOD_WEEKDAYS.map((item) => item.value).filter((item) => item === day || form.frequency.days.includes(item));
    update({ frequency: { ...form.frequency, days } });
  }

  function toggleDate(date: number) {
    const dates = form.frequency.dates.includes(date)
      ? form.frequency.dates.filter((item) => item !== date)
      : [...form.frequency.dates, date].sort((a, b) => a - b);
    update({ frequency: { ...form.frequency, dates } });
  }

  const breadcrumb = (
    <nav className="mood-breadcrumb" aria-label="Breadcrumb">
      <Link href={`${base}/modules`}>Modules</Link>
      <ChevronRight size={13} />
      {view === "list" ? (
        <strong aria-current="page">Mood Checker</strong>
      ) : (
        <>
          <button type="button" onClick={() => backToList()}>
            Mood Checker
          </button>
          <ChevronRight size={13} />
          <strong aria-current="page">{form.name.trim() || (isNew ? "New Configuration" : "Untitled Configuration")}</strong>
        </>
      )}
    </nav>
  );

  if (loading) {
    return (
      <div className="mood-config-page">
        <div className="edit-skeleton">
          <div className="skeleton-section" />
          <div className="skeleton-section" />
          <div className="skeleton-section" />
        </div>
      </div>
    );
  }

  return (
    <div className="mood-config-page">
      {breadcrumb}

      {view === "list" ? (
        <>
          <div className="mood-pg-header">
            <div>
              <div className="mood-pg-eyebrow">Mood Checker Module</div>
              <h1 className="mood-pg-title">Mood Checker Configurations</h1>
              <p className="mood-pg-desc">Manage mood check-in configurations for different designations.</p>
            </div>
            <Link href={`${base}/modules`} className="mood-btn mood-btn-secondary">
              <ArrowLeft size={14} /> Back to Modules
            </Link>
          </div>

          {configs.length === 0 && (
            <div className="mood-empty">
              <Smile size={28} />
              <h2>No mood configurations yet</h2>
              <p>Create the first configuration to show mood check-ins to matching designations.</p>
            </div>
          )}

          <div className="mood-cfg-list">
            {configs.map((config, index) => (
              <article
                key={config.id}
                className="mood-cfg-card"
                role="button"
                tabIndex={0}
                onClick={() => startEdit(config)}
                onKeyDown={(event) => {
                  if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    startEdit(config);
                  }
                }}
              >
                <div className="mood-cfg-num">{index + 1}</div>
                <div className="mood-cfg-info">
                  <h2 className="mood-cfg-name">{config.name || `Config ${index + 1}`}</h2>
                  <p className="mood-cfg-desigs">{designationSummary(config.applicableDesignations, designations)}</p>
                  <div className="mood-cfg-chips">
                    <span className={`mood-chip ${config.enforcement.mode === "HARD" ? "hard" : "soft"}`}>
                      {config.enforcement.mode === "HARD" ? <Lock size={11} /> : <Check size={11} />}
                      {config.enforcement.mode === "HARD" ? "Hard" : "Soft"}
                    </span>
                    <span className="mood-chip freq">
                      <CalendarDays size={11} /> {frequencySummary(config)}
                    </span>
                    <span className="mood-chip trigger">
                      {TRIGGER_OPTIONS.find((option) => option.value === config.enforcement.trigger)?.label}
                      {config.enforcement.trigger === "SCHEDULED_TIME" ? ` · ${config.enforcement.scheduledTime}` : ""}
                    </span>
                    <span className="mood-chip emojis" aria-label={`${config.options.length} mood options`}>
                      {config.options.map((option) => option.emoji).join(" ")}
                    </span>
                  </div>
                </div>
                <div className="mood-cfg-actions" onClick={(event) => event.stopPropagation()}>
                  {!readOnly && (
                    <button
                      type="button"
                      className="mood-btn mood-btn-secondary mood-btn-sm"
                      disabled={busyId === config.id}
                      onClick={() => void cloneConfig(config)}
                    >
                      <Copy size={13} /> {busyId === config.id ? "Cloning…" : "Clone"}
                    </button>
                  )}
                  <button type="button" className="mood-btn mood-btn-secondary mood-btn-sm" onClick={() => startEdit(config)}>
                    <Pencil size={13} /> {readOnly ? "View" : "Edit"}
                  </button>
                  {!readOnly && (
                    <button
                      type="button"
                      className="mood-btn mood-btn-danger mood-btn-sm"
                      aria-label={`Delete ${config.name}`}
                      title={configs.length <= 1 ? "At least one configuration is required" : "Delete"}
                      onClick={() => requestDelete(config)}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </article>
            ))}

            {!readOnly && (
              <button type="button" className="mood-add-cfg-card" onClick={startCreate}>
                <Plus size={20} /> Add New Configuration
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="mood-pg-header">
            <div>
              <div className="mood-pg-eyebrow">Mood Checker Module</div>
              <h1 className="mood-pg-title">{form.name.trim() || (isNew ? "New Configuration" : "Untitled Configuration")}</h1>
              <p className="mood-pg-desc">Configure question, options, frequency, and enforcement.</p>
            </div>
            <button type="button" className="mood-btn mood-btn-secondary" onClick={() => backToList()}>
              <ArrowLeft size={14} /> All Configs
            </button>
          </div>

          {errors.length > 0 && (
            <div className="mood-errors" role="alert">
              {errors.map((error) => (
                <div key={error}>{error}</div>
              ))}
            </div>
          )}

          <div className="mood-editor">
            <Section
              id="basic"
              tone="blue"
              icon={<Settings2 size={18} />}
              title="Basic Settings"
              description="Config name and applicable designations"
              open={openSections.basic}
              onToggle={() => toggleSection("basic")}
              disabled={readOnly}
            >
              <div className="mood-form-group">
                <label className="mood-form-label" htmlFor="mood-config-name">
                  Configuration Name <span className="req">*</span>
                </label>
                <input
                  id="mood-config-name"
                  className="mood-form-input"
                  value={form.name}
                  maxLength={160}
                  placeholder="e.g. ISP Executive Mood Config"
                  onChange={(event) => update({ name: event.target.value })}
                />
              </div>
              <div className="mood-form-group">
                <span className="mood-form-label">Applicable Designations</span>
                <DesignationMultiSelect
                  designations={designations}
                  selected={form.applicableDesignations}
                  assignedElsewhere={assignedElsewhere}
                  conflictIds={conflictIds}
                  disabled={readOnly}
                  onChange={(applicableDesignations) => {
                    update({ applicableDesignations });
                    setConflictIds(new Set());
                  }}
                />
                <div className="mood-form-hint">
                  A designation can belong to only one mood configuration. Users with no matching configuration never see the check-in.
                </div>
              </div>
            </Section>

            <Section
              id="question"
              tone="purple"
              icon={<MessageSquare size={18} />}
              title="Question & Options"
              description="Check-in question and mood choices with emojis"
              open={openSections.question}
              onToggle={() => toggleSection("question")}
              disabled={readOnly}
            >
              <div className="mood-form-group">
                <label className="mood-form-label" htmlFor="mood-question">
                  Check-In Question <span className="req">*</span>
                </label>
                <input
                  id="mood-question"
                  className="mood-form-input"
                  value={form.question}
                  maxLength={200}
                  placeholder="e.g. How are you feeling today?"
                  onChange={(event) => update({ question: event.target.value })}
                />
                <div className="mood-form-hint">Shown at the top of the mood check-in screen</div>
              </div>

              <div className="mood-section-divider">Mood Options</div>
              <div className="mood-info-banner">
                <Info size={16} />
                Minimum {MOOD_MIN_OPTIONS} options required. Each option has a label and an emoji shown to the user.
              </div>
              {form.options.map((option, index) => (
                <div className="mood-emoji-option" key={option.key ?? `new-${option.label}-${index}`}>
                  <div className="mood-emoji-circle" aria-hidden="true">
                    {option.emoji}
                  </div>
                  <div className="mood-emoji-label">{option.label}</div>
                  {!readOnly && (
                    <div className="mood-emoji-actions">
                      {index > 0 && (
                        <button
                          type="button"
                          className="mood-btn mood-btn-secondary mood-btn-icon"
                          aria-label={`Move ${option.label} up`}
                          onClick={() => moveOption(index, -1)}
                        >
                          <ChevronUp size={13} />
                        </button>
                      )}
                      {index < form.options.length - 1 && (
                        <button
                          type="button"
                          className="mood-btn mood-btn-secondary mood-btn-icon"
                          aria-label={`Move ${option.label} down`}
                          onClick={() => moveOption(index, 1)}
                        >
                          <ChevronDown size={13} />
                        </button>
                      )}
                      <button
                        type="button"
                        className="mood-btn mood-btn-danger mood-btn-icon"
                        aria-label={`Remove ${option.label}`}
                        onClick={() => removeOption(index)}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {!readOnly && (
                <button type="button" className="mood-btn mood-btn-secondary mood-add-option" onClick={openAddOption}>
                  <Plus size={14} /> Add Option
                </button>
              )}
            </Section>

            <Section
              id="comment"
              tone="teal"
              icon={<FileText size={18} />}
              title="Optional Comment"
              description="Allow users to add a text comment"
              open={openSections.comment}
              onToggle={() => toggleSection("comment")}
              disabled={readOnly}
            >
              <SettingRow
                icon={<MessageSquareText size={14} />}
                title="Enable Comment Field"
                description="Text area below mood options for additional context"
              >
                <Toggle
                  label="Enable comment field"
                  checked={form.comment.enabled}
                  disabled={readOnly}
                  onChange={(enabled) =>
                    update({ comment: { ...form.comment, enabled, mandatory: enabled ? form.comment.mandatory : false } })
                  }
                />
              </SettingRow>
              {form.comment.enabled && (
                <>
                  <SettingRow title="Make Comment Mandatory" description="User must type something before submitting (shows * on the app)">
                    <Toggle
                      label="Make comment mandatory"
                      checked={form.comment.mandatory}
                      disabled={readOnly}
                      onChange={(mandatory) => update({ comment: { ...form.comment, mandatory } })}
                    />
                  </SettingRow>
                  <div className="mood-form-group mood-gap-top">
                    <label className="mood-form-label" htmlFor="mood-placeholder">
                      Placeholder Text
                    </label>
                    <input
                      id="mood-placeholder"
                      className="mood-form-input"
                      value={form.comment.placeholder}
                      maxLength={160}
                      onChange={(event) => update({ comment: { ...form.comment, placeholder: event.target.value } })}
                    />
                  </div>
                </>
              )}
            </Section>

            <Section
              id="frequency"
              tone="amber"
              icon={<CalendarDays size={18} />}
              title="Frequency & Schedule"
              description="How often the mood check-in is shown"
              open={openSections.frequency}
              onToggle={() => toggleSection("frequency")}
              disabled={readOnly}
            >
              <div className="mood-form-group">
                <span className="mood-form-label">
                  Frequency Type <span className="req">*</span>
                </span>
                <RadioPillGroup
                  name="mood-frequency"
                  options={FREQUENCY_OPTIONS}
                  value={form.frequency.type}
                  disabled={readOnly}
                  onChange={(type) => update({ frequency: { ...form.frequency, type } })}
                />
              </div>

              {form.frequency.type === "DAILY" && (
                <div className="mood-note mood-note-teal">
                  <strong>Daily.</strong> Mood check-in prompted every day.
                </div>
              )}

              {form.frequency.type === "SELECT_DAYS" && (
                <>
                  <div className="mood-section-divider">Select Days</div>
                  <div className="mood-chip-row">
                    {MOOD_WEEKDAYS.map((day) => (
                      <button
                        type="button"
                        key={day.value}
                        aria-pressed={form.frequency.days.includes(day.value)}
                        className={`mood-day-chip${form.frequency.days.includes(day.value) ? " selected" : ""}`}
                        onClick={() => toggleDay(day.value)}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                  {form.frequency.days.length > 0 && (
                    <div className="mood-note">
                      <strong>Active on:</strong> {frequencySummary(form)}
                    </div>
                  )}
                </>
              )}

              {form.frequency.type === "SELECT_DATES" && (
                <>
                  <div className="mood-section-divider">Select Dates</div>
                  <div className="mood-chip-row mood-chip-row-tight">
                    {ALL_DATES.map((date) => (
                      <button
                        type="button"
                        key={date}
                        aria-pressed={form.frequency.dates.includes(date)}
                        className={`mood-date-chip${form.frequency.dates.includes(date) ? " selected" : ""}`}
                        onClick={() => toggleDate(date)}
                      >
                        {date}
                      </button>
                    ))}
                  </div>
                  {form.frequency.dates.length > 0 && (
                    <div className="mood-note">
                      <strong>Active on dates:</strong> {[...form.frequency.dates].sort((a, b) => a - b).join(", ")}
                      {form.frequency.dates.some((date) => date > 28) && (
                        <span className="mood-note-sub"> Dates missing in a month (e.g. 31 in September) are skipped.</span>
                      )}
                    </div>
                  )}
                </>
              )}

              {form.frequency.type === "EVERY_N_DAYS" && (
                <>
                  <div className="mood-section-divider">Repeat Interval</div>
                  <div className="mood-form-group">
                    <label className="mood-form-label" htmlFor="mood-every-n">
                      Every <span className="req">*</span>
                    </label>
                    <div className="mood-inline">
                      <input
                        id="mood-every-n"
                        type="number"
                        className="mood-form-input mood-input-narrow"
                        min={1}
                        max={MOOD_MAX_EVERY_N_DAYS}
                        step={1}
                        value={Number.isFinite(form.frequency.everyNDays) ? form.frequency.everyNDays : ""}
                        onChange={(event) =>
                          update({ frequency: { ...form.frequency, everyNDays: event.target.valueAsNumber } })
                        }
                      />
                      <span className="mood-inline-label">day(s)</span>
                    </div>
                    <div className="mood-form-hint">
                      1–{MOOD_MAX_EVERY_N_DAYS}. Counted for each user from their first mood check-in.
                    </div>
                  </div>
                </>
              )}
            </Section>

            <Section
              id="enforcement"
              tone="red"
              icon={<Lock size={18} />}
              title="Enforcement Mode"
              description="Soft (skippable) or Hard (mandatory to proceed)"
              open={openSections.enforcement}
              onToggle={() => toggleSection("enforcement")}
              disabled={readOnly}
            >
              <div className="mood-form-group">
                <span className="mood-form-label">
                  Enforcement <span className="req">*</span>
                </span>
                <RadioPillGroup<MoodEnforcementMode>
                  name="mood-enforcement"
                  options={[
                    { value: "SOFT", label: "Soft", icon: <Check size={14} /> },
                    { value: "HARD", label: "Hard", icon: <Lock size={14} /> },
                  ]}
                  value={form.enforcement.mode}
                  disabled={readOnly}
                  onChange={(mode) => update({ enforcement: { ...form.enforcement, mode } })}
                />
              </div>
              {form.enforcement.mode === "SOFT" ? (
                <div className="mood-note mood-note-teal">
                  <strong>Soft mode.</strong> User can tap &quot;Skip&quot; and proceed to the app normally.
                </div>
              ) : (
                <div className="mood-note mood-note-red">
                  <strong>Hard mode.</strong> User <strong>cannot proceed</strong> until they select a mood and submit. No skip option.
                </div>
              )}

              <div className="mood-section-divider">Trigger Point</div>
              <div className="mood-form-group">
                <span className="mood-form-label">When to Show</span>
                <RadioPillGroup
                  name="mood-trigger"
                  options={TRIGGER_OPTIONS}
                  value={form.enforcement.trigger}
                  disabled={readOnly}
                  onChange={(trigger) => update({ enforcement: { ...form.enforcement, trigger } })}
                />
              </div>
              {form.enforcement.trigger === "SCHEDULED_TIME" ? (
                <div className="mood-form-group">
                  <label className="mood-form-label" htmlFor="mood-trigger-time">
                    Trigger Time <span className="req">*</span>
                  </label>
                  <input
                    id="mood-trigger-time"
                    type="time"
                    className="mood-form-input mood-input-time"
                    value={form.enforcement.scheduledTime}
                    onChange={(event) => update({ enforcement: { ...form.enforcement, scheduledTime: event.target.value } })}
                  />
                  <div className="mood-form-hint">{TRIGGER_HINTS.SCHEDULED_TIME}</div>
                </div>
              ) : (
                <div className="mood-note">{TRIGGER_HINTS[form.enforcement.trigger]}</div>
              )}
            </Section>
          </div>

          <SaveBar
            dirty={dirty}
            isNew={isNew}
            saving={saving}
            readOnly={readOnly}
            onSave={() => void save()}
            onDiscard={discard}
          />
        </>
      )}

      <AddOptionModal
        open={addOptionOpen}
        existingLabels={form.options.map((option) => option.label)}
        onClose={closeAddOption}
        onAdd={addOption}
      />

      <ConfirmDialog
        isOpen={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => void deleteConfig()}
        title="Delete configuration?"
        message={`"${confirmDelete?.name ?? ""}" will be removed. Users with its designations will stop seeing the mood check-in.`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleting}
      />

      <ConfirmDialog
        isOpen={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        onConfirm={() => backToList(true)}
        title="Discard unsaved changes?"
        message="You have unsaved changes in this configuration. Leaving now will discard them."
        confirmLabel="Discard & Leave"
        variant="warning"
      />

      <If2Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}
