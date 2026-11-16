"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Bell, List, Upload, X } from "lucide-react";
import { If2Toast, type ToastState } from "@/components/accounts/if2-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  designationService,
  type Designation,
} from "@/lib/api/designation-service";
import { formatApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth/auth-context";
import {
  canManageModules,
  hasPermission,
  MODULE_CONFIG_UPDATE,
} from "@/lib/auth/permissions";
import {
  notificationEngineService as service,
  NOTIFICATION_TYPES,
  TYPE_LABELS,
  validateCampaign,
  validateNotificationImage,
  notificationCampaignInput,
  mergeCampaignTransition,
  validateNotificationFilters,
  type Campaign,
  type CampaignInput,
  type CampaignFilters,
  type PopupDefaults,
} from "@/lib/api/notification-engine-service";
import {
  NotificationActionMenu,
  NotificationDesignationPicker,
  notificationDesignationCode as codeOf,
} from "./notification-selectors";
import "@/styles/infield-notification-engine.css";

const initialForm = (): CampaignInput => ({
  title: "",
  message: "",
  types: ["IN_APP"],
  designationIds: [],
  schedule: "NOW",
  durationDays: 7,
  frequencyPerDay: 1,
});
const allowed = ["TL", "ISP", "ISD", "ASM"];
function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function NotificationEnginePage({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const readOnly =
    !canManageModules(user) || !hasPermission(user, MODULE_CONFIG_UPDATE);
  const [defaults, setDefaults] = useState<PopupDefaults | null>(null);
  const [savedDefaults, setSavedDefaults] = useState<PopupDefaults | null>(
    null,
  );
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [form, setForm] = useState(initialForm);
  const [localStart, setLocalStart] = useState("");
  const [rows, setRows] = useState<Campaign[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [filter, setFilter] = useState({ from: "", to: "" });
  const appliedFilter = useRef<CampaignFilters>({});
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [listError, setListError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [sending, setSending] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [attachmentId, setAttachmentId] = useState<string | undefined>();
  const [dragging, setDragging] = useState(false);
  const [reload, setReload] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const listRequest = useRef({ version: 0 });
  const imageUrlRef = useRef("");
  const sendLock = useRef(false);
  const actionLock = useRef(false);
  const dismissToast = useCallback(() => setToast(null), []);

  const loadRows = useCallback(
    async (filters: CampaignFilters, append = false) => {
      const request = ++listRequest.current.version;
      setListLoading(true);
      setListError("");
      try {
        const page = await service.list(projectId, filters);
        if (request !== listRequest.current.version) return;
        setRows((old) =>
          append
            ? [
                ...old,
                ...page.items.filter(
                  (row) => !old.some((item) => item.id === row.id),
                ),
              ]
            : page.items,
        );
        setNextCursor(page.nextCursor);
      } catch (error) {
        if (request === listRequest.current.version)
          setListError(formatApiError(error, "Could not load notifications."));
      } finally {
        if (request === listRequest.current.version) setListLoading(false);
      }
    },
    [projectId],
  );

  useEffect(() => {
    let cancelled = false;
    const requestCounter = listRequest.current;
    async function initialize() {
      setLoading(true);
      setLoadError("");
      try {
        const [config, options] = await Promise.all([
          service.getDefaults(projectId),
          designationService.listByProject(projectId),
        ]);
        if (cancelled) return;
        setDefaults(config);
        setSavedDefaults(config);
        // Match the backend's code resolution and reject ambiguous designation codes.
        setDesignations(
          options.filter(
            (d) =>
              allowed.includes(codeOf(d)) &&
              options.filter((other) => codeOf(other) === codeOf(d)).length ===
                1,
          ),
        );
      } catch (error) {
        if (!cancelled)
          setLoadError(
            formatApiError(error, "Could not load notification configuration."),
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void initialize();
    void loadRows(appliedFilter.current);
    return () => {
      cancelled = true;
      ++requestCounter.version;
    };
  }, [projectId, reload, loadRows]);

  useEffect(
    () => () => {
      if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current);
    },
    [],
  );

  function replaceFile(selected: File | null) {
    if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current);
    imageUrlRef.current = selected ? URL.createObjectURL(selected) : "";
    setImageUrl(imageUrlRef.current);
    setFile(selected);
    setAttachmentId(undefined);
  }

  function update<K extends keyof CampaignInput>(
    key: K,
    value: CampaignInput[K],
  ) {
    setForm((old) => ({ ...old, [key]: value }));
    setErrors((old) => ({ ...old, [key]: "" }));
  }
  function chooseFile(selected?: File) {
    if (!selected) return;
    const error = validateNotificationImage(selected);
    setErrors((old) => ({ ...old, attachment: error ?? "" }));
    if (error) return;
    replaceFile(selected);
  }
  async function saveDefaults() {
    if (!defaults || readOnly || savingDefaults || sendLock.current) return;
    const actionLabel = defaults.actionLabel.trim();
    if (!actionLabel || actionLabel.length > 50) {
      setErrors((old) => ({
        ...old,
        defaults: "Enter a default label of 1–50 characters.",
      }));
      return;
    }
    setSavingDefaults(true);
    try {
      const result = await service.saveDefaults(projectId, {
        actionLabel,
        allowDismissByTapOutside: defaults.allowDismissByTapOutside,
      });
      setDefaults(result);
      setSavedDefaults(result);
      setErrors((old) => ({ ...old, defaults: "" }));
      setToast({
        type: "success",
        message:
          "Pop-up defaults saved. New notifications will use these settings.",
      });
    } catch (error) {
      setToast({
        type: "error",
        message: formatApiError(error, "Could not save defaults."),
      });
    } finally {
      setSavingDefaults(false);
    }
  }
  async function sendNotification(event: React.FormEvent) {
    event.preventDefault();
    if (
      readOnly ||
      sendLock.current ||
      actionLock.current ||
      savingDefaults ||
      !savedDefaults
    )
      return;
    const input = notificationCampaignInput(form, localStart);
    const validation = validateCampaign(input);
    if (file) {
      const error = validateNotificationImage(file);
      if (error) validation.attachment = error;
    }
    setErrors(validation);
    if (Object.keys(validation).length) {
      const fieldIds: Record<string, string> = {
        title: "ne-title",
        message: "ne-message",
        types: "ne-type-IN_APP",
        designationIds: "ne-designation-control",
        startsAt: "ne-start",
        durationDays: "ne-duration",
        frequencyPerDay: "ne-frequency",
        actionLabel: "ne-action-label",
        attachment: "ne-attachment",
      };
      document.getElementById(fieldIds[Object.keys(validation)[0]])?.focus();
      return;
    }
    sendLock.current = true;
    setSending(true);
    try {
      let uploaded = attachmentId;
      if (file && !uploaded) {
        uploaded = (await service.upload(projectId, file)).id;
        setAttachmentId(uploaded);
      }
      await service.create(projectId, {
        ...input,
        ...(uploaded ? { attachmentId: uploaded } : {}),
      });
      setForm(initialForm());
      setLocalStart("");
      replaceFile(null);
      if (fileInput.current) fileInput.current.value = "";
      setToast({
        type: "success",
        message:
          input.schedule === "NOW"
            ? "Notification accepted for delivery."
            : "Notification scheduled successfully.",
      });
      await loadRows(appliedFilter.current);
    } catch (error) {
      setToast({
        type: "error",
        message: formatApiError(error, "Could not create notification."),
      });
    } finally {
      sendLock.current = false;
      setSending(false);
    }
  }
  async function act(row: Campaign, action: "pause" | "resume" | "delete") {
    if (readOnly || actionLock.current || sendLock.current) return;
    actionLock.current = true;
    setBusyId(row.id);
    try {
      if (action === "delete") {
        await service.remove(projectId, row.id);
        setRows((current) => current.filter((item) => item.id !== row.id));
      } else {
        const updated = await service.transition(projectId, row, action);
        setRows((current) =>
          current.map((item) =>
            item.id === row.id ? mergeCampaignTransition(item, updated) : item,
          ),
        );
      }
      setDeleteTarget(null);
      setToast({
        type: "success",
        message: `Notification ${action === "delete" ? "deleted" : action === "pause" ? "paused" : "resumed"}.`,
      });
    } catch (error) {
      setToast({
        type: "error",
        message: formatApiError(
          error,
          "Could not update notification. Refresh and try again.",
        ),
      });
      await loadRows(appliedFilter.current);
    } finally {
      actionLock.current = false;
      setBusyId(null);
    }
  }
  function applyFilters(clear = false) {
    const filterError = clear ? null : validateNotificationFilters(filter);
    if (filterError) {
      setErrors((old) => ({
        ...old,
        filter: filterError,
      }));
      return;
    }
    setErrors((old) => ({ ...old, filter: "" }));
    if (clear) setFilter({ from: "", to: "" });
    appliedFilter.current = clear ? {} : { ...filter };
    void loadRows(appliedFilter.current);
  }
  const validationAria = (key: string) => ({
    "aria-invalid": !!errors[key],
    "aria-describedby": errors[key] ? `ne-${key}-error` : undefined,
  });
  const errorFor = (key: string) =>
    errors[key] ? (
      <p className="ne-error" id={`ne-${key}-error`} role="alert">
        {errors[key]}
      </p>
    ) : null;
  const defaultsDirty =
    defaults &&
    savedDefaults &&
    (defaults.actionLabel !== savedDefaults.actionLabel ||
      defaults.allowDismissByTapOutside !==
        savedDefaults.allowDismissByTapOutside);

  return (
    <div className="ne-page">
      <header className="ne-header">
        <h1>Notification Engine Configuration</h1>
        <p>Configure defaults and manage notifications for your project.</p>
      </header>
      {readOnly && (
        <p className="ne-notice">
          You have read-only access to notification configuration.
        </p>
      )}
      {loading ? (
        <p role="status" className="ne-card">
          Loading notification configuration…
        </p>
      ) : loadError ? (
        <div role="alert" className="ne-card ne-error">
          {loadError}{" "}
          <button className="ne-btn" onClick={() => setReload((n) => n + 1)}>
            Retry
          </button>
        </div>
      ) : (
        <>
          <section className="ne-card" aria-labelledby="ne-defaults-heading">
            <h2 id="ne-defaults-heading">Pop-Up Defaults</h2>
            <fieldset disabled={readOnly || savingDefaults || sending}>
              <label className="ne-label" htmlFor="ne-default-label">
                Default Action Button Label{" "}
                <span>(can be overridden per notification)</span>
              </label>
              <input
                id="ne-default-label"
                {...validationAria("defaults")}
                className="ne-input"
                value={defaults?.actionLabel ?? ""}
                maxLength={50}
                onChange={(e) =>
                  setDefaults(
                    (old) => old && { ...old, actionLabel: e.target.value },
                  )
                }
              />
              {errorFor("defaults")}
              <div className="ne-setting">
                <div>
                  <label htmlFor="ne-dismiss">
                    Allow Dismiss by Tap-Outside
                  </label>
                  <p>If off, user must tap the action button to close.</p>
                </div>
                <input
                  id="ne-dismiss"
                  className="ne-toggle"
                  type="checkbox"
                  checked={defaults?.allowDismissByTapOutside ?? false}
                  onChange={(e) =>
                    setDefaults(
                      (old) =>
                        old && {
                          ...old,
                          allowDismissByTapOutside: e.target.checked,
                        },
                    )
                  }
                />
              </div>
              <div className="ne-default-actions">
                <p>Changes apply to new notifications.</p>
                <button
                  type="button"
                  className="ne-btn ne-primary"
                  disabled={!defaultsDirty}
                  onClick={() => void saveDefaults()}
                >
                  {savingDefaults ? "Saving…" : "Save Defaults"}
                </button>
              </div>
            </fieldset>
          </section>
          <section className="ne-card" aria-labelledby="ne-create-heading">
            <h2 id="ne-create-heading">
              <Upload size={15} /> Create Notification
            </h2>
            <form onSubmit={sendNotification} noValidate>
              <fieldset
                disabled={readOnly || sending || savingDefaults || !!busyId}
              >
                <div className="ne-section">
                  <label className="ne-label" htmlFor="ne-title">
                    Title <span className="ne-required">*</span>
                  </label>
                  <input
                    id="ne-title"
                    className="ne-input"
                    value={form.title}
                    maxLength={200}
                    placeholder="Enter notification title visible to users"
                    aria-required="true"
                    aria-invalid={!!errors.title}
                    aria-describedby={
                      errors.title ? "ne-title-error" : undefined
                    }
                    onChange={(e) => update("title", e.target.value)}
                  />
                  {errorFor("title")}
                </div>
                <div className="ne-section">
                  <label className="ne-label" htmlFor="ne-message">
                    Message <span>(Optional)</span>
                  </label>
                  <textarea
                    id="ne-message"
                    {...validationAria("message")}
                    className="ne-input"
                    value={form.message}
                    maxLength={4000}
                    placeholder="Brief message shown to the user"
                    onChange={(e) => update("message", e.target.value)}
                  />
                  {errorFor("message")}
                </div>
                <fieldset className="ne-section">
                  <legend className="ne-label">
                    Notification Type <span>(choose one or more) *</span>
                  </legend>
                  <div className="ne-pills">
                    {NOTIFICATION_TYPES.map((type) => (
                      <label
                        key={type}
                        className={`ne-choice ${form.types.includes(type) ? "selected" : ""}`}
                      >
                        <input
                          type="checkbox"
                          id={`ne-type-${type}`}
                          aria-describedby={
                            errors.types ? "ne-types-error" : undefined
                          }
                          checked={form.types.includes(type)}
                          onChange={(e) =>
                            update(
                              "types",
                              e.target.checked
                                ? [...form.types, type]
                                : form.types.filter((t) => t !== type),
                            )
                          }
                        />
                        {TYPE_LABELS[type]}
                      </label>
                    ))}
                  </div>
                  {errorFor("types")}
                </fieldset>
                <div className="ne-section">
                  <label className="ne-label" id="ne-designation-label">
                    Target Designation <span>(multi-select) *</span>
                  </label>
                  <NotificationDesignationPicker
                    options={designations}
                    selected={form.designationIds}
                    onChange={(ids) => update("designationIds", ids)}
                    disabled={readOnly || sending || savingDefaults || !!busyId}
                    invalid={!!errors.designationIds}
                  />
                  {errorFor("designationIds")}
                </div>
                <fieldset className="ne-section">
                  <legend className="ne-label">
                    Schedule <span>(when should this start?)</span>
                  </legend>
                  <div className="ne-pills ne-schedule">
                    {(["NOW", "LATER"] as const).map((value) => (
                      <label
                        key={value}
                        className={`ne-choice ${form.schedule === value ? "selected" : ""}`}
                      >
                        <input
                          type="radio"
                          name="notification-schedule"
                          checked={form.schedule === value}
                          onChange={() => update("schedule", value)}
                        />
                        {value === "NOW" ? "Send now" : "Schedule for later"}
                      </label>
                    ))}
                  </div>
                  {form.schedule === "LATER" && (
                    <div className="ne-date">
                      <label className="ne-label" htmlFor="ne-start">
                        Start date and time (IST)
                      </label>
                      <input
                        id="ne-start"
                        {...validationAria("startsAt")}
                        type="datetime-local"
                        className="ne-input"
                        value={localStart}
                        onChange={(e) => {
                          setLocalStart(e.target.value);
                          setErrors((old) => ({ ...old, startsAt: "" }));
                        }}
                      />
                      <p>
                        Notification runs from this time for the duration below.
                      </p>
                      {errorFor("startsAt")}
                    </div>
                  )}
                </fieldset>
                <div className="ne-section">
                  <label className="ne-label" htmlFor="ne-duration">
                    Duration <span>(0 = run always)</span>
                  </label>
                  <div className="ne-number">
                    <input
                      id="ne-duration"
                      {...validationAria("durationDays")}
                      className="ne-input"
                      type="number"
                      min={0}
                      step={1}
                      value={
                        Number.isNaN(form.durationDays) ? "" : form.durationDays
                      }
                      onChange={(e) =>
                        update(
                          "durationDays",
                          e.target.value === "" ? NaN : Number(e.target.value),
                        )
                      }
                    />
                    <span>days</span>
                  </div>
                  {errorFor("durationDays")}
                </div>
                <div className="ne-section">
                  <label className="ne-label" htmlFor="ne-frequency">
                    Frequency <span>(maximum presentations per day)</span>
                  </label>
                  <div className="ne-number">
                    <input
                      id="ne-frequency"
                      {...validationAria("frequencyPerDay")}
                      className="ne-input"
                      type="number"
                      min={1}
                      max={10}
                      step={1}
                      value={
                        Number.isNaN(form.frequencyPerDay)
                          ? ""
                          : form.frequencyPerDay
                      }
                      onChange={(e) =>
                        update(
                          "frequencyPerDay",
                          e.target.value === "" ? NaN : Number(e.target.value),
                        )
                      }
                    />
                    <span>times / day</span>
                  </div>
                  <p className="ne-hint">
                    Eligible notifications appear on app open and at spaced
                    intervals, subject to the daily limit.
                  </p>
                  {errorFor("frequencyPerDay")}
                </div>
                {form.types.includes("POP_UP") && (
                  <div className="ne-section">
                    <label className="ne-label" htmlFor="ne-action-label">
                      Pop-Up Action Button Label{" "}
                      <span>(leave blank to use saved default)</span>
                    </label>
                    <input
                      id="ne-action-label"
                      {...validationAria("actionLabel")}
                      className="ne-input"
                      maxLength={50}
                      value={form.actionLabel ?? ""}
                      placeholder={savedDefaults?.actionLabel ?? "OK"}
                      onChange={(e) => update("actionLabel", e.target.value)}
                    />
                    {errorFor("actionLabel")}
                    <div className="ne-preview">
                      <h3>Pop-Up Preview</h3>
                      <div className="ne-preview-box">
                        {imageUrl && (
                          <Image
                            src={imageUrl}
                            alt="Notification attachment preview"
                            width={290}
                            height={180}
                            unoptimized
                          />
                        )}
                        <strong>
                          {form.title.trim() || "Notification title"}
                        </strong>
                        <p>
                          {form.message?.trim() ||
                            "This is how your pop-up will appear to the user."}
                        </p>
                        <span className="ne-btn ne-primary">
                          {form.actionLabel?.trim() ||
                            savedDefaults?.actionLabel ||
                            "OK"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <div className="ne-section">
                  <label className="ne-label" htmlFor="ne-attachment">
                    Attachment <span>(Optional — image only)</span>
                  </label>
                  <input
                    ref={fileInput}
                    id="ne-attachment"
                    {...validationAria("attachment")}
                    className="ne-file-input"
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={(e) => {
                      chooseFile(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                  <button
                    className={`ne-upload ${dragging ? "dragging" : ""}`}
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragging(false);
                      if (!readOnly && !sending) {
                        if (e.dataTransfer.files.length > 1)
                          setErrors((old) => ({
                            ...old,
                            attachment: "Choose one image only.",
                          }));
                        else chooseFile(e.dataTransfer.files[0]);
                      }
                    }}
                  >
                    <Upload size={32} />
                    <strong>Click to upload or drag &amp; drop</strong>
                    <span>PNG, JPG — Max 5 MB</span>
                  </button>
                  {file && (
                    <div className="ne-file-preview">
                      {imageUrl && (
                        <Image
                          src={imageUrl}
                          alt="Selected attachment"
                          width={64}
                          height={48}
                          unoptimized
                        />
                      )}
                      <span>
                        {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                      <button
                        className="ne-btn"
                        type="button"
                        aria-label="Remove attachment"
                        onClick={() => {
                          replaceFile(null);
                          setErrors((old) => ({ ...old, attachment: "" }));
                        }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                  {errorFor("attachment")}
                </div>
                {defaultsDirty && (
                  <p className="ne-notice">
                    You have unsaved defaults. New notifications use the last
                    saved settings.
                  </p>
                )}
                <button className="ne-btn ne-primary ne-send" type="submit">
                  {sending ? "Saving notification…" : "Send Notification"}
                </button>
              </fieldset>
            </form>
          </section>
        </>
      )}
      <section className="ne-card" aria-labelledby="ne-management-heading">
        <h2 id="ne-management-heading">
          <List size={15} /> Notifications Management
        </h2>
        <div className="ne-filters">
          <label htmlFor="ne-from">
            From:
            <input
              id="ne-from"
              className="ne-input"
              type="date"
              value={filter.from}
              onChange={(e) =>
                setFilter((old) => ({ ...old, from: e.target.value }))
              }
            />
          </label>
          <label htmlFor="ne-to">
            To:
            <input
              id="ne-to"
              className="ne-input"
              type="date"
              value={filter.to}
              onChange={(e) =>
                setFilter((old) => ({ ...old, to: e.target.value }))
              }
            />
          </label>
          <button
            className="ne-btn ne-primary"
            disabled={listLoading || !!busyId || sending}
            onClick={() => applyFilters()}
          >
            Load
          </button>
          <button
            className="ne-btn"
            disabled={listLoading || !!busyId || sending}
            onClick={() => applyFilters(true)}
          >
            Clear
          </button>
        </div>
        {errorFor("filter")}
        <p className="ne-hint">
          Filters include notification start dates in IST.
        </p>
        {listError && (
          <p className="ne-error" role="alert">
            {listError}{" "}
            <button
              className="ne-btn"
              onClick={() => void loadRows(appliedFilter.current)}
            >
              Retry
            </button>
          </p>
        )}
        <div className="ne-table-wrap" aria-busy={listLoading}>
          <table>
            <thead>
              <tr>
                {[
                  "Title",
                  "Type",
                  "Designation",
                  "Start Date",
                  "Duration",
                  "Freq/Day",
                  "Status",
                  "Action",
                ].map((title) => (
                  <th key={title} scope="col">
                    {title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    {row.title}
                    {row.isScheduled && <small>Scheduled</small>}
                    {row.isExpired && <small>Expired</small>}
                  </td>
                  <td>
                    <div className="ne-chips">
                      {row.types.map((type) => (
                        <span
                          key={type}
                          className={`ne-tag ne-${type.toLowerCase()}`}
                        >
                          {TYPE_LABELS[type]}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div className="ne-chips">
                      {row.designationIds.map((id) => {
                        const d = row.designations?.find(
                          (item) => item.id === id,
                        );
                        const fallback = designations.find(
                          (item) => item.id === id,
                        );
                        const code =
                          d?.code || (fallback ? codeOf(fallback) : "Unknown");
                        return (
                          <span
                            className={`ne-tag ne-${code.toLowerCase()}`}
                            key={id}
                          >
                            {code}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td>{dateLabel(row.startsAt)}</td>
                  <td>
                    {row.durationDays === 0
                      ? "Run always"
                      : `${row.durationDays} days`}
                  </td>
                  <td>{row.frequencyPerDay}×</td>
                  <td>
                    <span
                      className={`ne-status ${row.status === "ACTIVE" ? "active" : ""}`}
                    >
                      {row.status === "ACTIVE" ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <NotificationActionMenu
                      campaign={row}
                      disabled={readOnly || !!busyId || listLoading || sending}
                      busy={busyId === row.id}
                      onChoose={(action) => {
                        if (action === "delete") setDeleteTarget(row);
                        else void act(row, action);
                      }}
                    />
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={8} className="ne-empty">
                    <Bell size={24} />
                    <span>
                      {listLoading
                        ? "Loading notifications…"
                        : listError
                          ? "Notifications could not be loaded."
                          : "No notifications found for this project and date range."}
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {nextCursor && (
          <div className="ne-pagination">
            <button
              className="ne-btn"
              disabled={listLoading || !!busyId || sending}
              onClick={() =>
                void loadRows(
                  { ...appliedFilter.current, cursor: nextCursor },
                  true,
                )
              }
            >
              {listLoading ? "Loading…" : "Load More"}
            </button>
          </div>
        )}
      </section>
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete notification?"
        message={`Delete “${deleteTarget?.title ?? ""}”? Further delivery will stop. This action cannot be undone.`}
        confirmLabel="Delete Notification"
        variant="danger"
        isLoading={!!busyId}
        onClose={() => {
          if (!busyId) setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (deleteTarget) void act(deleteTarget, "delete");
        }}
      />
      <If2Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}
