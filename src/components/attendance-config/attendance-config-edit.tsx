"use client";

import { useState } from "react";
import type {
  AttendanceConfigForm,
  AttendanceTypeForm,
  PhotoDirection,
  PhotoSource,
  RegWindowType,
} from "@/lib/api/attendance-config";

type ChangeFn = <K extends keyof AttendanceConfigForm>(
  key: K,
  value: AttendanceConfigForm[K],
) => void;

interface Props {
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
    basic: true,
  });
  const [addTypeModal, setAddTypeModal] = useState(false);

  const toggleSection = (id: string) =>
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));

  const anyGeoFenced = form.types.some((t) => t.geoFenced);

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
              <input
                className="form-input"
                value={form.checkInLabel}
                onChange={(e) => onChange("checkInLabel", e.target.value)}
                placeholder="Default: Check-In"
              />
            </FormGroup>
            <FormGroup label="Check-out module name">
              <input
                className="form-input"
                value={form.checkOutLabel}
                onChange={(e) => onChange("checkOutLabel", e.target.value)}
                placeholder="Default: Check-Out"
              />
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
                </tr>
              </thead>
              <tbody>
                {form.types.map((t, i) => (
                  <tr key={`${t.name}-${i}`}>
                    <td>
                      <span className="type-name">{t.name}</span>
                      <span className={`type-badge ${t.isCustom ? "custom" : "default"}`}>
                        {t.isCustom ? "Custom" : "Default"}
                      </span>
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
        id="loctiming"
        title="Location-wise timings"
        description="Per-location start/end times"
        open={openSections.loctiming}
        onToggle={() => toggleSection("loctiming")}
      >
        <div className="section-inner">
          <SettingRow
            label="Use location-wise timings"
            checked={form.locationTimingsEnabled}
            onChange={(v) => onChange("locationTimingsEnabled", v)}
          />
          {form.locationTimingsEnabled ? (
            <InfoBanner>
              Present &ge; 9 hrs within the official window, Half day &ge; 4.5 hrs,
              Absent &lt; 4.5 hrs. Early punch is excluded from duty hours. Timings
              come from each user&apos;s location in User Master.
            </InfoBanner>
          ) : (
            <div className="flat-mode-note">
              <strong>Flat mode:</strong> global working-hours thresholds apply with
              no per-location variation or early-punch exclusion.
            </div>
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
        <RegularizationSettings form={form} errors={errors} onChange={onChange} />
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

function updateType(
  form: AttendanceConfigForm,
  onChange: ChangeFn,
  idx: number,
  field: keyof Pick<
    AttendanceTypeForm,
    "active" | "geoTagged" | "geoFenced" | "photoRequired"
  >,
  value: boolean,
) {
  const next = form.types.map((t, i) =>
    i === idx ? { ...t, [field]: value } : t,
  );
  onChange("types", next);
}

// ─── Regularization section ─────────────────────────────────────────────────

function RegularizationSettings({
  form,
  errors,
  onChange,
}: {
  form: AttendanceConfigForm;
  errors: Record<string, string>;
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
              {form.approvalLevels.map((a, i) => (
                <div key={i} className="approval-step">
                  <div className="approval-num">{i + 1}</div>
                  <div className="approval-info">
                    <input
                      className="form-input form-input-inline"
                      value={a.role}
                      onChange={(e) => {
                        const next = form.approvalLevels.map((lvl, x) =>
                          x === i ? { ...lvl, role: e.target.value } : lvl,
                        );
                        onChange("approvalLevels", next);
                      }}
                    />
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
              ))}
              <FieldError message={errors.approvalLevels} />
              <button
                className="btn btn-secondary btn-sm"
                onClick={() =>
                  onChange("approvalLevels", [
                    ...form.approvalLevels,
                    { role: `Manager ${form.approvalLevels.length + 1}` },
                  ])
                }
              >
                + Add level
              </button>
            </>
          )}

          <div className="section-divider">Auto-reject</div>
          <SettingRow
            label="Enable auto-reject"
            checked={form.autoRejectEnabled}
            onChange={(v) => onChange("autoRejectEnabled", v)}
          />
          {form.autoRejectEnabled && (
            <FormGroup label="Rule">
              <input
                className="form-input"
                value={form.autoRejectRules}
                placeholder="e.g. Auto reject if no action in 3 days"
                onChange={(e) => onChange("autoRejectRules", e.target.value)}
              />
            </FormGroup>
          )}
          <FieldError message={errors.autoRejectRules} />
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
              colour: "#7c3aed",
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
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="toggle">
      <input
        type="checkbox"
        checked={checked}
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
