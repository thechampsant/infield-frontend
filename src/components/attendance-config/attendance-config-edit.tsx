"use client";

import { useEffect, useState } from "react";
import type {
  AttendanceConfigForm,
  AttendanceConfigDoc,
  AttendanceTypeForm,
  PhotoDirection,
  PhotoSource,
  RegWindowType,
  ShiftAssignmentMode,
} from "@/lib/api/attendance-config";
import {
  DEFAULT_RANDOM_ATTENDANCE_EXPIRED_MESSAGE,
  attendanceConfigService,
} from "@/lib/api/attendance-config";
import { designationService, type Designation } from "@/lib/api/designation-service";

type ChangeFn = <K extends keyof AttendanceConfigForm>(
  key: K,
  value: AttendanceConfigForm[K],
) => void;

interface Props {
  projectId: string;
  projectName: string;
  form: AttendanceConfigForm;
  errors: Record<string, string>;
  dirty: boolean;
  saving: boolean;
  onChange: ChangeFn;
  onSave: () => void;
  onDiscard: () => void;
}

export function AttendanceConfigEdit({
  projectId,
  projectName,
  form,
  errors,
  dirty,
  saving,
  onChange,
  onSave,
  onDiscard,
}: Props) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    scope: true,
    basic: true,
  });
  const [addTypeModal, setAddTypeModal] = useState(false);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [configs, setConfigs] = useState<AttendanceConfigDoc[]>([]);

  useEffect(() => {
    designationService.listByProject(projectId).then(setDesignations).catch(() => {});
    attendanceConfigService.list(projectId).then(setConfigs).catch(() => {});
  }, [projectId]);

  const toggleSection = (id: string) =>
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));

  const anyGeoFenced = form.types.some((t) => t.geoFenced);
  const irEnabledTypes = form.types.filter(
    (t) => t.active && t.photoRequired && t.imageRecognitionEnabled,
  );
  const hasIrEnabledTypes = irEnabledTypes.length > 0;
  const randomEnabledTypes = form.types.filter(
    (t) => t.active && t.randomAttendanceEnabled,
  );
  const activeTypeNames = form.types
    .filter((t) => t.active && t.name.trim())
    .map((t) => t.name.trim());
  const shiftAppliedTypeNames = activeTypeNames.filter(
    (name) => !form.shiftBypassAttendanceTypes.includes(name),
  );
  const storeShiftCopy = form.shiftAssignmentMode === "STORE_MASTER";
  const irGalleryWarning =
    form.imageRecognitionEnabled &&
    hasIrEnabledTypes &&
    (form.photoSource === "Gallery" || form.photoSource === "Both");
  const usedDesignations = new Map<string, string>();
  configs.forEach((config, index) => {
    const configId = config._id ?? config.id ?? "";
    if (configId && form.id && configId === form.id) return;
    const configName = config.name?.trim() || `Configuration ${index + 1}`;
    (config.applicableDesignations ?? []).forEach((designationId) => {
      usedDesignations.set(designationId, configName);
    });
  });

  function toggleApplicableDesignation(designationId: string) {
    const selected = form.applicableDesignations.includes(designationId);
    onChange(
      "applicableDesignations",
      selected
        ? form.applicableDesignations.filter((id) => id !== designationId)
        : [...form.applicableDesignations, designationId],
    );
  }

  return (
    <div className="att-config-page">
      <div className="page-header">
        <div>
          <p className="page-eyebrow">Attendance Module</p>
          <h1 className="page-title">Attendance Configuration</h1>
          <p className="page-desc">
            Configure check-in/out behaviour, attendance types, geo-fencing,
            photo capture, working hours, and regularization for {projectName}.
          </p>
        </div>
      </div>

      <Section
        id="scope"
        title="Configuration scope"
        description="Name and assigned designations"
        open={openSections.scope}
        onToggle={() => toggleSection("scope")}
      >
        <div className="section-inner">
          <FormGroup label="Configuration name">
            <input
              className="form-input"
              value={form.name}
              onChange={(e) => onChange("name", e.target.value)}
              placeholder="e.g. ISP Executive Config"
            />
          </FormGroup>
          <FieldError message={errors.name} />

          <div className="section-divider">Applicable designations</div>
          {designations.length > 0 ? (
            <div className="att-designation-grid">
              {designations.map((designation) => {
                const selected = form.applicableDesignations.includes(designation.id);
                const usedBy = usedDesignations.get(designation.id);
                const disabled = Boolean(usedBy && !selected);
                return (
                  <label
                    key={designation.id}
                    className={`att-designation-option${selected ? " selected" : ""}${
                      disabled ? " disabled" : ""
                    }${errors.applicableDesignations?.includes(designation.id) ? " conflict" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={disabled}
                      onChange={() => toggleApplicableDesignation(designation.id)}
                    />
                    <span>{designation.name}</span>
                    {usedBy ? <small>Assigned to {usedBy}</small> : null}
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="flat-mode-note">
              No designations found for this project. You can save this as an unassigned
              configuration and assign designations later.
            </div>
          )}
          {form.applicableDesignations.length === 0 ? (
            <div className="flat-mode-note">
              This configuration has no assigned designations yet. Legacy project-level configs
              can stay unassigned during rollout.
            </div>
          ) : null}
          <FieldError
            message={
              errors.applicableDesignations &&
              !errors.applicableDesignations.includes("DESIGNATION")
                ? "One or more selected designations conflict with another active attendance configuration."
                : errors.applicableDesignations
            }
          />
        </div>
      </Section>

      <div className="module-banner">
        <div>
          <p className="setting-name">Enable attendance module</p>
          <p className="setting-hint">
            When off, attendance features are hidden from the app and web portal.
          </p>
        </div>
        <Toggle
          checked={form.isModuleEnabled}
          onChange={(v) => onChange("isModuleEnabled", v)}
        />
      </div>

      <Section
        id="basic"
        title="Basic settings"
        description="Module names and date field"
        open={openSections.basic}
        onToggle={() => toggleSection("basic")}
      >
        <div className="section-inner">
          <div className="form-row-2">
            <FormGroup label="Check-in module name">
              <div className="att-checkout-setting">
                <SettingRow
                  label="Enable check-in"
                  checked={form.checkInEnabled}
                  onChange={(v) => onChange("checkInEnabled", v)}
                />
                <input
                  className="form-input"
                  value={form.checkInLabel}
                  onChange={(e) => onChange("checkInLabel", e.target.value)}
                  placeholder="Default: Check-In"
                  disabled={!form.checkInEnabled}
                />
              </div>
            </FormGroup>
            <FormGroup label="Check-out module name">
              <div className="att-checkout-setting">
                <SettingRow
                  label="Enable check-out"
                  checked={form.checkOutEnabled}
                  onChange={(v) => onChange("checkOutEnabled", v)}
                />
                <input
                  className="form-input"
                  value={form.checkOutLabel}
                  onChange={(e) => onChange("checkOutLabel", e.target.value)}
                  placeholder="Default: Check-Out"
                  disabled={!form.checkOutEnabled}
                />
              </div>
            </FormGroup>
          </div>
          <SettingRow
            label="Show date field"
            hint="If off, current date is auto-captured"
            checked={form.showDateField}
            onChange={(v) => onChange("showDateField", v)}
          />
        </div>
      </Section>

      <Section
        id="types"
        title="Attendance types"
        description="Active, geo-tag, geo-fence, photo per type"
        open={openSections.types}
        onToggle={() => toggleSection("types")}
      >
        <div className="section-inner">
          <div className="att-type-table-wrap">
            <table className="att-type-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Active</th>
                  <th>Geo-tagged</th>
                  <th>Geo-fenced</th>
                  <th>Photo</th>
                  {form.imageRecognitionEnabled && <th>IR</th>}
                  {form.randomAttendanceEnabled && <th>Random</th>}
                  <th>Color</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {form.types.map((t, i) => (
                  <tr key={`${t.name}-${i}`}>
                    <td>
                      <div className="att-type-name-cell">
                        <input
                          className="form-input att-type-name-input"
                          value={t.name}
                          onChange={(e) => updateTypeName(form, onChange, i, e.target.value)}
                          aria-label={`Attendance type name ${i + 1}`}
                        />
                        <span className={`type-badge ${t.isCustom ? "custom" : "default"}`}>
                          {t.isCustom ? "Custom" : "Default"}
                        </span>
                      </div>
                    </td>
                    <td>
                      <Toggle
                        checked={t.active}
                        onChange={(v) => updateType(form, onChange, i, "active", v)}
                      />
                    </td>
                    <td>
                      <Toggle
                        checked={t.geoTagged}
                        onChange={(v) => updateType(form, onChange, i, "geoTagged", v)}
                      />
                    </td>
                    <td>
                      <Toggle
                        checked={t.geoFenced}
                        onChange={(v) => updateType(form, onChange, i, "geoFenced", v)}
                      />
                    </td>
                    <td>
                      <Toggle
                        checked={t.photoRequired}
                        onChange={(v) => updateType(form, onChange, i, "photoRequired", v)}
                      />
                    </td>
                    {form.imageRecognitionEnabled && (
                      <td>
                        {t.photoRequired ? (
                          <Toggle
                            checked={t.imageRecognitionEnabled}
                            disabled={!t.active}
                            onChange={(v) =>
                              updateType(form, onChange, i, "imageRecognitionEnabled", v)
                            }
                          />
                        ) : (
                          <span className="setting-hint">Needs Photo</span>
                        )}
                      </td>
                    )}
                    {form.randomAttendanceEnabled && (
                      <td>
                        <Toggle
                          checked={t.active && t.randomAttendanceEnabled}
                          disabled={!t.active}
                          onChange={(v) =>
                            updateType(form, onChange, i, "randomAttendanceEnabled", v)
                          }
                        />
                      </td>
                    )}
                    <td>
                      <div className="att-type-color">
                        <input
                          type="color"
                          className="att-type-color__picker"
                          value={normalizeHexColour(t.colour)}
                          onChange={(e) => updateTypeColor(form, onChange, i, e.target.value)}
                          aria-label={`${t.name} color`}
                        />
                        <input
                          className="form-input att-type-color__hex"
                          value={normalizeHexColour(t.colour)}
                          onChange={(e) => updateTypeColor(form, onChange, i, e.target.value)}
                        />
                      </div>
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-danger-ghost"
                        onClick={() => removeType(form, onChange, i)}
                        disabled={form.types.length <= 1}
                        type="button"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setAddTypeModal(true)}>
            + Add custom type
          </button>
        </div>
      </Section>

      <Section
        id="random"
        title="Random Attendance"
        description="Randomized push verification checks"
        open={openSections.random}
        onToggle={() => toggleSection("random")}
      >
        <div className="section-inner">
          <SettingRow
            label="Enable Random Attendance"
            hint="Plans randomized verification notifications after successful normal check-in for Random-enabled attendance types."
            checked={form.randomAttendanceEnabled}
            onChange={(v) => setRandomAttendanceEnabled(form, onChange, v)}
          />
          {!form.randomAttendanceEnabled ? (
            <div className="flat-mode-note">
              Per-type Random flags are treated as off while this master setting is disabled.
            </div>
          ) : (
            <>
              <div className="form-row-2">
                <FormGroup label="From time" required>
                  <input
                    type="time"
                    className="form-input"
                    value={form.randomAttendanceFromTime}
                    onChange={(e) => onChange("randomAttendanceFromTime", e.target.value)}
                  />
                </FormGroup>
                <FormGroup label="Till time" required>
                  <input
                    type="time"
                    className="form-input"
                    value={form.randomAttendanceTillTime}
                    onChange={(e) => onChange("randomAttendanceTillTime", e.target.value)}
                  />
                </FormGroup>
              </div>
              <FieldError message={errors.randomAttendanceTimeWindow} />
              <div className="form-row-2">
                <FormGroup label="Max notifications per day" required>
                  <input
                    type="number"
                    className="form-input"
                    min={1}
                    max={10}
                    value={form.randomAttendanceMaxNotificationsPerDay}
                    onChange={(e) =>
                      onChange(
                        "randomAttendanceMaxNotificationsPerDay",
                        numberValue(e.target.value),
                      )
                    }
                  />
                </FormGroup>
                <FormGroup label="Response window minutes" required>
                  <input
                    type="number"
                    className="form-input"
                    min={5}
                    max={60}
                    value={form.randomAttendanceResponseWindowMinutes}
                    onChange={(e) =>
                      onChange(
                        "randomAttendanceResponseWindowMinutes",
                        numberValue(e.target.value),
                      )
                    }
                  />
                </FormGroup>
              </div>
              <FieldError message={errors.randomAttendanceMaxNotificationsPerDay} />
              <FieldError message={errors.randomAttendanceResponseWindowMinutes} />
              <FormGroup label="Expired window message">
                <textarea
                  className="form-input"
                  rows={3}
                  value={form.randomAttendanceExpiredWindowMessage}
                  onChange={(e) =>
                    onChange("randomAttendanceExpiredWindowMessage", e.target.value)
                  }
                  placeholder={DEFAULT_RANDOM_ATTENDANCE_EXPIRED_MESSAGE}
                />
              </FormGroup>
              <div className="flat-mode-note">
                <strong>Random enabled for:</strong>{" "}
                {randomEnabledTypes.length
                  ? summarizeNames(randomEnabledTypes.map((type) => type.name))
                  : "No active attendance types"}
              </div>
            </>
          )}
        </div>
      </Section>

      <Section
        id="geofence"
        title="Geo-fencing"
        description="Location validation radius"
        open={openSections.geofence}
        onToggle={() => toggleSection("geofence")}
      >
        <div className="section-inner">
          {anyGeoFenced ? (
            <InfoBanner>
              Lat/Long is auto-pulled from Store Master. Stores must have lat-long
              data for geo-fencing to work.
            </InfoBanner>
          ) : (
            <div className="flat-mode-note">
              Enable Geo-fenced on an attendance type to apply radius validation.
            </div>
          )}
          <div className="flat-mode-note">
            GPS coordinates are still required whenever geo-tagging or geo-fencing
            applies. If usable mapped store coordinates exist, radius validation
            still runs.
          </div>
          <SettingRow
            label="Bypass Geo-Fencing if Store Not Mapped"
            hint="When enabled, radius validation is skipped if no usable mapped store coordinate exists. If disabled, missing or invalid store mapping fails geo-fence validation."
            checked={form.geoFenceBypassWhenStoreUnavailable}
            onChange={(v) => onChange("geoFenceBypassWhenStoreUnavailable", v)}
          />
          <FormGroup label="Distance (metres)" required>
            <input
              type="number"
              className="form-input form-input-narrow"
              value={form.geoFenceRadius}
              min={10}
              max={5000}
              onChange={(e) => onChange("geoFenceRadius", numberValue(e.target.value))}
            />
          </FormGroup>
          <FieldError message={errors.geoFenceRadius} />
        </div>
      </Section>

      <Section
        id="photo"
        title="Photo settings"
        description="Camera direction and source"
        open={openSections.photo}
        onToggle={() => toggleSection("photo")}
      >
        <div className="section-inner">
          {form.imageRecognitionEnabled && (
            <>
              <InfoBanner>
                Image Recognition Photo Labels - For IR-enabled attendance types,
                mobile must capture two camera photos: Capture Selfie and Full Body
                Picture.
              </InfoBanner>
              <div className="form-row-2">
                <div className="flat-mode-note">
                  <strong>Front/Selfie:</strong> Capture Selfie
                </div>
                <div className="flat-mode-note">
                  <strong>Back/Full Body:</strong> Full Body Picture
                </div>
              </div>
              {irGalleryWarning && (
                <div className="flat-mode-note" style={{ color: "var(--amber-700, #b45309)" }}>
                  Gallery uploads are not valid for IR-enabled attendance types. Mobile
                  must enforce camera-only capture for IR types.
                </div>
              )}
            </>
          )}
          <FormGroup label="Direction">
            <RadioPillGroup
              name="photoDirection"
              options={[
                { label: "Front", value: "Front" },
                { label: "Back", value: "Back" },
                { label: "Both", value: "Both" },
              ]}
              value={form.photoDirection}
              onChange={(v) => onChange("photoDirection", v as PhotoDirection)}
            />
          </FormGroup>
          <FormGroup label="Source">
            <RadioPillGroup
              name="photoSource"
              options={[
                { label: "Camera", value: "Camera" },
                { label: "Gallery", value: "Gallery" },
                { label: "Both", value: "Both" },
              ]}
              value={form.photoSource}
              onChange={(v) => onChange("photoSource", v as PhotoSource)}
            />
          </FormGroup>
        </div>
      </Section>

      <Section
        id="ir"
        title="Image Recognition"
        description="Photo analysis for verification"
        open={openSections.ir}
        onToggle={() => toggleSection("ir")}
      >
        <div className="section-inner">
          <SettingRow
            label="Enable Image Recognition"
            hint="AI-powered analysis of attendance photos for verification. Enable IR per attendance type in the Attendance Types table. Photo must be ON for that type."
            checked={form.imageRecognitionEnabled}
            onChange={(v) => setImageRecognitionEnabled(form, onChange, v)}
          />
          {form.imageRecognitionEnabled && (
            <>
              <div className="flat-mode-note">
                {hasIrEnabledTypes
                  ? `Active for: ${summarizeNames(irEnabledTypes.map((type) => type.name))}`
                  : "No attendance types have IR enabled yet."}
              </div>
              <InfoBanner>
                For IR projects, User Master must have a UDF field with key city.
                The backend sends this value as the user&apos;s location to Vision Attire.
              </InfoBanner>
              <div className="flat-mode-note">
                Photo Capture: Capture Selfie and Full Body Picture. API Analysis:
                Mobile calls the backend IR endpoint before check-in. Reports store
                the summary on attendance and detailed analysis in Vision Analysis.
              </div>
            </>
          )}
        </div>
      </Section>

      <Section
        id="remarks"
        title="Remarks"
        description="Optional or mandatory remarks"
        open={openSections.remarks}
        onToggle={() => toggleSection("remarks")}
      >
        <div className="section-inner">
          <SettingRow
            label="Enable remarks"
            checked={form.remarksEnabled}
            onChange={(v) => onChange("remarksEnabled", v)}
          />
          {form.remarksEnabled && (
            <FormGroup label="Type">
              <RadioPillGroup
                name="remarksType"
                options={[
                  { label: "Optional", value: "false" },
                  { label: "Mandatory", value: "true" },
                ]}
                value={String(form.remarksMandatory)}
                onChange={(v) => onChange("remarksMandatory", v === "true")}
              />
            </FormGroup>
          )}
        </div>
      </Section>

      <Section
        id="cutoff"
        title="Cut-off & alerts"
        description="Cut-off time and alert window"
        open={openSections.cutoff}
        onToggle={() => toggleSection("cutoff")}
      >
        <div className="section-inner">
          <div className="form-row-2">
            <div>
              <SettingRow
                label="Cut-off time"
                checked={form.cutoffEnabled}
                onChange={(v) => onChange("cutoffEnabled", v)}
              />
              {form.cutoffEnabled && (
                <input
                  type="time"
                  className="form-input form-input-narrow mt-8"
                  value={form.cutoffTime}
                  onChange={(e) => onChange("cutoffTime", e.target.value)}
                />
              )}
            </div>
            <div>
              <SettingRow
                label="In-app alerts"
                checked={form.alertEnabled}
                onChange={(v) => onChange("alertEnabled", v)}
              />
              {form.alertEnabled && (
                <div className="form-row-2 mt-8">
                  <input
                    type="time"
                    className="form-input"
                    value={form.alertFrom}
                    onChange={(e) => onChange("alertFrom", e.target.value)}
                  />
                  <input
                    type="time"
                    className="form-input"
                    value={form.alertTill}
                    onChange={(e) => onChange("alertTill", e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </Section>

      <Section
        id="wh"
        title="Working hours"
        description="Auto-categorize by hours worked"
        open={openSections.wh}
        onToggle={() => toggleSection("wh")}
      >
        <div className="section-inner">
          <SettingRow
            label="Enable working hours"
            checked={form.workingHoursEnabled}
            onChange={(v) => onChange("workingHoursEnabled", v)}
          />
          {form.workingHoursEnabled && (
            <>
              <WhRow
                label={"Present \u2265"}
                value={form.presentThresholdHrs}
                onChange={(v) => onChange("presentThresholdHrs", v)}
              />
              <FieldError message={errors.presentThresholdHrs} />
              <WhRow
                label="Absent <"
                value={form.absentThresholdHrs}
                onChange={(v) => onChange("absentThresholdHrs", v)}
              />
              <FieldError message={errors.absentThresholdHrs} />
              <div className="wh-row">
                <span className="wh-label">Half day between</span>
                <input
                  type="number"
                  step={0.5}
                  className="wh-input"
                  value={form.halfDayMinHrs}
                  onChange={(e) => onChange("halfDayMinHrs", numberValue(e.target.value))}
                />
                <span className="wh-unit">&amp;</span>
                <input
                  type="number"
                  step={0.5}
                  className="wh-input"
                  value={form.halfDayMaxHrs}
                  onChange={(e) => onChange("halfDayMaxHrs", numberValue(e.target.value))}
                />
                <span className="wh-unit">hrs</span>
              </div>
              <FieldError message={errors.halfDay} />
              <SettingRow
                label="Single punch = full day (no check-out)"
                checked={form.singlePunchFullDay}
                onChange={(v) => onChange("singlePunchFullDay", v)}
              />
              <SettingRow
                label="Maximum working hours timer limit"
                checked={form.maxWorkingHoursTimerLimitEnabled}
                onChange={(v) => onChange("maxWorkingHoursTimerLimitEnabled", v)}
              />
            </>
          )}
        </div>
      </Section>

      <Section
        id="autoout"
        title="Auto check-out"
        description="Auto close open check-ins"
        open={openSections.autoout}
        onToggle={() => toggleSection("autoout")}
      >
        <div className="section-inner">
          <SettingRow
            label="Enable auto check-out"
            checked={form.autoCheckoutEnabled}
            onChange={(v) => onChange("autoCheckoutEnabled", v)}
          />
          {form.autoCheckoutEnabled && (
            <FormGroup label="Time">
              <input
                type="time"
                className="form-input form-input-narrow"
                value={form.autoCheckoutTime}
                onChange={(e) => onChange("autoCheckoutTime", e.target.value)}
              />
            </FormGroup>
          )}
        </div>
      </Section>

      <Section
        id="shift"
        title="Shift & Timing"
        description="Shift source and timing bypass rules"
        open={openSections.shift}
        onToggle={() => toggleSection("shift")}
      >
        <div className="section-inner">
          <SettingRow
            label="Enable Shift-Based Timing"
            checked={form.shiftManagementEnabled}
            onChange={(v) => onChange("shiftManagementEnabled", v)}
          />
          {!form.shiftManagementEnabled ? (
            <div className="flat-mode-note">
              Working hours are calculated from raw check-in to check-out duration.
            </div>
          ) : (
            <>
              <FormGroup label="Map shifts via">
                <RadioPillGroup
                  name="shiftAssignmentMode"
                  options={[
                    { label: "User Master", value: "USER_MASTER" },
                    { label: "Store Master", value: "STORE_MASTER" },
                  ]}
                  value={form.shiftAssignmentMode}
                  onChange={(v) => onChange("shiftAssignmentMode", v as ShiftAssignmentMode)}
                />
              </FormGroup>
              <div className="flat-mode-note">
                {storeShiftCopy
                  ? "Uses shiftStartTime and shiftEndTime from the user's mapped Store Master record."
                  : "Uses shiftStartTime and shiftEndTime from User Master."}
              </div>
              <InfoBanner>
                No mapping = no shift logic. If no usable shift timing is found,
                working hours fall back to flat check-in to check-out duration.
              </InfoBanner>
              <SettingRow
                label="Bypass Shift if Timing is 00:00"
                hint={
                  storeShiftCopy
                    ? "Skip shift logic when shift hours are set to 00:00 against a store."
                    : "Skip shift logic when shift hours are set to 00:00 against a user."
                }
                checked={form.zeroHoursBypassEnabled}
                onChange={(v) => onChange("zeroHoursBypassEnabled", v)}
              />
              <div className="flat-mode-note">
                {form.zeroHoursBypassEnabled
                  ? "If shift from/to is 00:00 - 00:00, shift validation is skipped and working hours are calculated using flat check-in to check-out."
                  : "00:00 entries are treated as unusable for shift calculation. If no usable timing remains, backend falls back to flat duration."}
              </div>
              <FormGroup label="Bypass attendance types">
                <div className="att-designation-grid">
                  {activeTypeNames.map((name) => {
                    const selected = form.shiftBypassAttendanceTypes.includes(name);
                    return (
                      <label
                        key={name}
                        className={`att-designation-option${selected ? " selected" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleShiftBypassType(form, onChange, name)}
                        />
                        <span>{name}</span>
                      </label>
                    );
                  })}
                </div>
              </FormGroup>
              <div className="flat-mode-note">
                <strong>Shift bypassed:</strong>{" "}
                {form.shiftBypassAttendanceTypes.length
                  ? summarizeNames(form.shiftBypassAttendanceTypes)
                  : "None"}
                <br />
                <strong>Shift applied to:</strong>{" "}
                {shiftAppliedTypeNames.length
                  ? summarizeNames(shiftAppliedTypeNames)
                  : "No active attendance types"}
              </div>
              <InfoBanner>
                {storeShiftCopy
                  ? "Store Master shift timings come from optional Store UDF fields with exact keys shiftStartTime and shiftEndTime."
                  : "User Master shift timings come from optional User UDF fields with exact keys shiftStartTime and shiftEndTime."}
              </InfoBanner>
            </>
          )}
        </div>
      </Section>

      <Section
        id="reg"
        title="Regularization"
        description="Correction requests & approvals"
        open={openSections.reg}
        onToggle={() => toggleSection("reg")}
      >
        <RegularizationSettings form={form} errors={errors} designations={designations} onChange={onChange} />
      </Section>

      <Section
        id="weekoff"
        title="Auto week-off"
        description="From User Master data"
        open={openSections.weekoff}
        onToggle={() => toggleSection("weekoff")}
      >
        <div className="section-inner">
          <SettingRow
            label="Auto week-off"
            hint="Per user from User Master week-off field"
            checked={form.autoWeekOffEnabled}
            onChange={(v) => onChange("autoWeekOffEnabled", v)}
          />
        </div>
      </Section>

      <SaveBar
        dirty={dirty}
        saving={saving}
        onSave={onSave}
        onDiscard={onDiscard}
      />

      {addTypeModal && (
        <AddAttendanceTypeModal
          onClose={() => setAddTypeModal(false)}
          onAdd={(t) => {
            onChange("types", [...form.types, t]);
            setAddTypeModal(false);
          }}
        />
      )}
    </div>
  );
}

function updateTypeColor(
  form: AttendanceConfigForm,
  onChange: ChangeFn,
  idx: number,
  colour: string,
) {
  const next = form.types.map((t, i) =>
    i === idx ? { ...t, colour: normalizeHexColour(colour) } : t,
  );
  onChange("types", next);
}

function updateTypeName(
  form: AttendanceConfigForm,
  onChange: ChangeFn,
  idx: number,
  name: string,
) {
  const oldName = form.types[idx]?.name.trim();
  const newName = name.trim();
  const next = form.types.map((t, i) => (i === idx ? { ...t, name } : t));
  onChange("types", next);
  if (oldName && newName && oldName !== newName) {
    onChange(
      "shiftBypassAttendanceTypes",
      form.shiftBypassAttendanceTypes.map((typeName) =>
        typeName === oldName ? newName : typeName,
      ),
    );
  }
}

function removeType(form: AttendanceConfigForm, onChange: ChangeFn, idx: number) {
  if (form.types.length <= 1) return;
  const removedName = form.types[idx]?.name.trim();
  onChange(
    "types",
    form.types.filter((_, i) => i !== idx),
  );
  if (removedName) {
    onChange(
      "shiftBypassAttendanceTypes",
      form.shiftBypassAttendanceTypes.filter((name) => name !== removedName),
    );
  }
}

function normalizeHexColour(value: string): string {
  const raw = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw;
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw}`;
  return "#3377ff";
}

function updateType(
  form: AttendanceConfigForm,
  onChange: ChangeFn,
  idx: number,
  field: keyof Pick<
    AttendanceTypeForm,
    | "active"
    | "geoTagged"
    | "geoFenced"
    | "photoRequired"
    | "imageRecognitionEnabled"
    | "randomAttendanceEnabled"
  >,
  value: boolean,
) {
  const next = form.types.map((t, i) => {
    if (i !== idx) return t;
    const updated = { ...t, [field]: value };
    if (field === "photoRequired" && !value) {
      updated.imageRecognitionEnabled = false;
    }
    if (field === "active" && !value) {
      updated.imageRecognitionEnabled = false;
      updated.randomAttendanceEnabled = false;
    }
    return updated;
  });
  onChange("types", next);
}

function setImageRecognitionEnabled(
  form: AttendanceConfigForm,
  onChange: ChangeFn,
  enabled: boolean,
) {
  onChange("imageRecognitionEnabled", enabled);
  if (!enabled) {
    onChange(
      "types",
      form.types.map((type) => ({ ...type, imageRecognitionEnabled: false })),
    );
  }
}

function setRandomAttendanceEnabled(
  form: AttendanceConfigForm,
  onChange: ChangeFn,
  enabled: boolean,
) {
  onChange("randomAttendanceEnabled", enabled);
  if (!enabled) {
    onChange(
      "types",
      form.types.map((type) => ({ ...type, randomAttendanceEnabled: false })),
    );
  }
}

function toggleShiftBypassType(
  form: AttendanceConfigForm,
  onChange: ChangeFn,
  name: string,
) {
  const selected = form.shiftBypassAttendanceTypes.includes(name);
  onChange(
    "shiftBypassAttendanceTypes",
    selected
      ? form.shiftBypassAttendanceTypes.filter((typeName) => typeName !== name)
      : [...form.shiftBypassAttendanceTypes, name],
  );
}

function summarizeNames(names: string[]): string {
  const unique = Array.from(new Set(names.filter(Boolean)));
  if (unique.length <= 3) return unique.join(", ");
  return `${unique.slice(0, 3).join(", ")} +${unique.length - 3} more`;
}

// ─── Regularization section ─────────────────────────────────────────────────

function RegularizationSettings({
  form,
  errors,
  designations,
  onChange,
}: {
  form: AttendanceConfigForm;
  errors: Record<string, string>;
  designations: Designation[];
  onChange: ChangeFn;
}) {
  return (
    <div className="section-inner">
      <SettingRow
        label="Enable regularization"
        checked={form.regularizationEnabled}
        onChange={(v) => onChange("regularizationEnabled", v)}
      />

      {form.regularizationEnabled && (
        <>
          <div className="section-divider">Time window</div>
          <FormGroup label="Type">
            <RadioPillGroup
              name="regWindowType"
              options={[
                { label: "T\u2212X days", value: "Days" },
                { label: "Date range", value: "Date Range" },
              ]}
              value={form.regWindowType}
              onChange={(v) => onChange("regWindowType", v as RegWindowType)}
            />
          </FormGroup>

          {form.regWindowType === "Days" ? (
            <>
              <div className="wh-row">
                <span className="wh-label">{"T\u2212"}</span>
                <input
                  type="number"
                  className="wh-input"
                  min={1}
                  max={90}
                  value={form.regTminusDays}
                  onChange={(e) => onChange("regTminusDays", numberValue(e.target.value))}
                />
                <span className="wh-unit">days</span>
              </div>
              <FieldError message={errors.regTminusDays} />
            </>
          ) : (
            <>
              <div className="form-row-2">
                <FormGroup label="From (prev month day)">
                  <input
                    type="number"
                    className="form-input"
                    min={1}
                    max={31}
                    value={form.regDateFrom}
                    onChange={(e) => onChange("regDateFrom", numberValue(e.target.value))}
                  />
                </FormGroup>
                <FormGroup label="To (current month day)">
                  <input
                    type="number"
                    className="form-input"
                    min={1}
                    max={31}
                    value={form.regDateTo}
                    onChange={(e) => onChange("regDateTo", numberValue(e.target.value))}
                  />
                </FormGroup>
              </div>
              <FieldError message={errors.regDateRange} />
            </>
          )}

          <div className="section-divider">Max requests</div>
          <SettingRow
            label="Limit requests per period"
            checked={form.regMaxRequestsEnabled}
            onChange={(v) => onChange("regMaxRequestsEnabled", v)}
          />
          {form.regMaxRequestsEnabled && (
            <>
              <input
                type="number"
                className="wh-input"
                min={1}
                max={99}
                value={form.regMaxRequestCount}
                onChange={(e) => onChange("regMaxRequestCount", numberValue(e.target.value))}
              />
              <FieldError message={errors.regMaxRequestCount} />
            </>
          )}

          <div className="section-divider">Approval flow</div>
          <SettingRow
            label="Enable approval"
            checked={form.regApprovalEnabled}
            onChange={(v) => onChange("regApprovalEnabled", v)}
          />
          {form.regApprovalEnabled && (
            <>
              {designations.length === 0 && (
                <div className="flat-mode-note" style={{ color: "var(--amber-700, #b45309)" }}>
                  No designations found for this project. Create designations first before configuring approval levels.
                </div>
              )}
              {form.approvalLevels.map((level, i) => {
                const resolvedName =
                  level.designationName ||
                  designations.find((d) => d.id === level.designationId)?.name ||
                  level.designationId;

                return (
                  <div key={i} className="approval-step">
                    <div className="approval-num">{i + 1}</div>
                    <div className="approval-info">
                      <select
                        className="form-input form-input-inline"
                        value={level.designationId}
                        onChange={(e) => {
                          const selected = designations.find((d) => d.id === e.target.value);
                          const next = form.approvalLevels.map((lvl, x) =>
                            x === i
                              ? {
                                  designationId: selected?.id ?? '',
                                  designationName: selected?.name ?? '',
                                }
                              : lvl,
                          );
                          onChange("approvalLevels", next);
                        }}
                      >
                        <option value="">— Select designation —</option>
                        {designations.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                        {level.designationId &&
                          !designations.find((d) => d.id === level.designationId) && (
                          <option value={level.designationId}>{resolvedName}</option>
                        )}
                      </select>
                    </div>
                    <button
                      className="btn btn-sm btn-danger-ghost"
                      onClick={() =>
                        onChange(
                          "approvalLevels",
                          form.approvalLevels.filter((_, x) => x !== i),
                        )
                      }
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
              <FieldError message={errors.approvalLevels} />
              <button
                className="btn btn-secondary btn-sm"
                disabled={designations.length === 0}
                onClick={() =>
                  onChange("approvalLevels", [
                    ...form.approvalLevels,
                    { designationId: '', designationName: '' },
                  ])
                }
              >
                + Add level
              </button>
            </>
          )}

          <div className="section-divider">Auto approval</div>
          <SettingRow
            label="Enable auto approval"
            checked={form.autoApprovalEnabled}
            onChange={(v) => onChange("autoApprovalEnabled", v)}
          />
          {form.autoApprovalEnabled && (
            <>
              <div className="wh-row">
                <span className="wh-label">Approve after</span>
                <input
                  type="number"
                  className="wh-input"
                  min={0}
                  max={90}
                  value={form.autoApprovalAfterDays}
                  onChange={(e) => onChange("autoApprovalAfterDays", numberValue(e.target.value))}
                />
                <span className="wh-unit">days</span>
              </div>
              <FieldError message={errors.autoApprovalAfterDays} />
              <SettingRow
                label="Approve all remaining levels"
                checked={form.autoApprovalAllLevels}
                onChange={(v) => onChange("autoApprovalAllLevels", v)}
              />
            </>
          )}

          <div className="section-divider">Auto reject</div>
          <SettingRow
            label="Enable auto reject"
            checked={form.autoRejectEnabled}
            onChange={(v) => onChange("autoRejectEnabled", v)}
          />
          {form.autoRejectEnabled && (
            <>
              <div className="wh-row">
                <span className="wh-label">Reject after</span>
                <input
                  type="number"
                  className="wh-input"
                  min={0}
                  max={90}
                  value={form.autoRejectAfterDays}
                  onChange={(e) => onChange("autoRejectAfterDays", numberValue(e.target.value))}
                />
                <span className="wh-unit">days</span>
              </div>
            </>
          )}
          <FieldError message={errors.autoRejectAfterDays} />
        </>
      )}
    </div>
  );
}

// ─── Modal ──────────────────────────────────────────────────────────────────

function AddAttendanceTypeModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (t: AttendanceTypeForm) => void;
}) {
  const [name, setName] = useState("");
  const [geoTagged, setGeoTagged] = useState(false);
  const [geoFenced, setGeoFenced] = useState(false);
  const [photoRequired, setPhotoRequired] = useState(false);
  const [colour, setColour] = useState("#7c3aed");
  const trimmed = name.trim();

  return (
    <Modal title="Add custom attendance type" onClose={onClose}>
      <FormGroup label="Type name" required>
        <input
          className="form-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Client Visit"
          autoFocus
        />
      </FormGroup>
      <div className="form-row-3">
        <SettingRow label="Geo-tagged" checked={geoTagged} onChange={setGeoTagged} />
        <SettingRow label="Geo-fenced" checked={geoFenced} onChange={setGeoFenced} />
        <SettingRow label="Photo" checked={photoRequired} onChange={setPhotoRequired} />
      </div>
      <FormGroup label="Color">
        <div className="att-type-color">
          <input
            type="color"
            className="att-type-color__picker"
            value={normalizeHexColour(colour)}
            onChange={(e) => setColour(e.target.value)}
          />
          <input
            className="form-input att-type-color__hex"
            value={normalizeHexColour(colour)}
            onChange={(e) => setColour(e.target.value)}
          />
        </div>
      </FormGroup>
      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn btn-primary"
          disabled={!trimmed}
          onClick={() =>
            onAdd({
              name: trimmed,
              isCustom: true,
              active: true,
              geoTagged,
              geoFenced,
              photoRequired,
              colour: normalizeHexColour(colour),
              imageRecognitionEnabled: false,
              randomAttendanceEnabled: false,
            })
          }
        >
          Add type
        </button>
      </div>
    </Modal>
  );
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function Section({
  id,
  title,
  description,
  open,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  description: string;
  open?: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={`config-section${open ? " open" : ""}`} id={`sec-${id}`}>
      <button className="config-head" onClick={onToggle}>
        <div className="config-head-left">
          <div className="config-head-icon" />
          <div>
            <p className="config-head-title">{title}</p>
            <p className="config-head-desc">{description}</p>
          </div>
        </div>
        <span className="config-chevron">&rsaquo;</span>
      </button>
      {open && <div className="config-body">{children}</div>}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-card">
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function SaveBar({
  dirty,
  saving,
  onSave,
  onDiscard,
}: {
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="save-bar">
      <div className="save-bar-info">
        {dirty ? (
          <>
            <span className="unsaved-dot" />
            Unsaved changes
          </>
        ) : (
          "All changes saved"
        )}
      </div>
      <div className="save-bar-actions">
        <button
          className="btn btn-secondary"
          onClick={onDiscard}
          disabled={saving || !dirty}
        >
          Discard
        </button>
        <button className="btn btn-primary" onClick={onSave} disabled={saving}>
          {saving ? "Saving\u2026" : "Save"}
        </button>
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="toggle">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="toggle-track" />
      <span className="toggle-thumb" />
    </label>
  );
}

function SettingRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="setting-row">
      <div>
        <p className="setting-name">{label}</p>
        {hint && <p className="setting-hint">{hint}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function FormGroup({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="form-group">
      <label className="form-label">
        {label}
        {required && <span className="req"> *</span>}
      </label>
      {children}
    </div>
  );
}

function RadioPillGroup({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="radio-pill-group">
      {options.map((o) => (
        <label
          key={o.value}
          className={`radio-pill${value === o.value ? " selected" : ""}`}
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

function WhRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="wh-row">
      <span className="wh-label">{label}</span>
      <input
        type="number"
        step={0.5}
        className="wh-input"
        value={value}
        onChange={(e) => onChange(numberValue(e.target.value))}
      />
      <span className="wh-unit">hrs</span>
    </div>
  );
}

function InfoBanner({ children }: { children: React.ReactNode }) {
  return <div className="info-banner">{children}</div>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="field-error">{message}</p>;
}

function numberValue(raw: string): number {
  const n = parseFloat(raw);
  return Number.isNaN(n) ? 0 : n;
}
