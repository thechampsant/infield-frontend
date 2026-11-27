"use client";

import { Clock3, Info, Save, Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { Designation } from "@/lib/api/designation-service";
import type { OdTemplate, OdTemplateInput } from "@/lib/api/od-config-service";
import styles from "./od-configuration.module.css";

interface TemplateEditorProps {
  template?: OdTemplate;
  draft: OdTemplateInput;
  designations: Designation[];
  canEdit: boolean;
  busy: boolean;
  saving: boolean;
  dirty: boolean;
  onChange: (value: OdTemplateInput) => void;
  onReset: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function OdTemplateEditor({ template, draft, designations, canEdit, busy, saving, dirty, onChange, onReset, onSubmit }: TemplateEditorProps) {
  const [search, setSearch] = useState("");
  const disabled = !canEdit || busy;
  const known = new Set(designations.map(({ id }) => id));
  const eligible = [
    ...designations,
    ...draft.designationIds.filter((id) => !known.has(id)).map((id) => ({ id, name: `Unavailable designation (${id})` })),
  ].filter(({ name }) => name.toLowerCase().includes(search.trim().toLowerCase()));

  function update(change: Partial<OdTemplateInput>) {
    onChange({ ...draft, ...change });
  }

  return (
    <form className={styles.card} onSubmit={onSubmit} aria-labelledby="od-template-editor">
      <div className={styles.cardHeader}>
        <div>
          <h2 id="od-template-editor">{template ? (canEdit ? "Edit template" : "Template details") : "New OD template"}</h2>
          <p>{template ? template.name : "Choose who can apply for OD and how their requests are handled."}</p>
        </div>
      </div>
      <div className={styles.editorBody}>
        <div className={styles.fieldGrid}>
          <label className={styles.field}>
            Template name
            <input
              placeholder="e.g. Field team leads"
              disabled={disabled}
              required
              maxLength={100}
              value={draft.name}
              onChange={(event) => update({ name: event.target.value })}
            />
          </label>
          <RuleToggle
            title="Active template"
            description="Available to the assigned designations."
            checked={draft.isActive}
            disabled={disabled}
            onChange={(isActive) => update({ isActive })}
          />
        </div>

        <fieldset className={styles.editorSection}>
          <legend className={styles.srOnly}>Eligible designations</legend>
          <div className={styles.sectionHeader}>
            <div>
              <h3>Eligible designations</h3>
              <p>Select the designations that can apply for OD.</p>
            </div>
            <span className={styles.selectionCount}>{draft.designationIds.length} selected</span>
          </div>
          <div className={styles.designationPicker}>
            <label className={styles.searchField}>
              <Search size={16} aria-hidden />
              <span className={styles.srOnly}>Search designations</span>
              <input
                type="search"
                placeholder="Search designations"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") event.preventDefault(); }}
              />
            </label>
            <div className={styles.designationList}>
              {eligible.length === 0 && <p className={styles.pickerEmpty}>{search.trim() ? "No matching designations." : "No designations are available for this project."}</p>}
              {eligible.map(({ id, name }) => {
                const checked = draft.designationIds.includes(id);
                return (
                  <label className={styles.designation} key={id} data-selected={checked}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => update({ designationIds: checked ? draft.designationIds.filter((value) => value !== id) : [...draft.designationIds, id] })}
                    />
                    <span>{name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </fieldset>

        <section className={styles.editorSection} aria-labelledby="od-approval-heading">
          <div className={styles.sectionHeader}>
            <div>
              <h3 id="od-approval-heading">Approval and visit rules</h3>
              <p>Choose the mapped approver and set the daily store visit limit.</p>
            </div>
          </div>
          <div className={styles.fieldGrid}>
            <label className={styles.field}>
              Approver designation
              <select disabled={disabled} required value={draft.approverDesignationId} onChange={(event) => update({ approverDesignationId: event.target.value })}>
                <option value="">Select designation</option>
                {draft.approverDesignationId && !known.has(draft.approverDesignationId) && <option value={draft.approverDesignationId}>Unavailable designation</option>}
                {designations.map(({ id, name }) => <option value={id} key={id}>{name}</option>)}
              </select>
            </label>
            <label className={styles.field}>
              Maximum visits per OD date
              <input
                type="number"
                required
                min={1}
                step={1}
                disabled={disabled}
                value={draft.dailyVisitLimit || ""}
                onChange={(event) => update({ dailyVisitLimit: Number(event.target.value) })}
              />
            </label>
          </div>
          <p className={styles.inlineNote}><Clock3 size={16} aria-hidden /><span>Requests go to the employee&apos;s mapped approver and auto-approve after {template?.autoApproveDays ?? 10} days.</span></p>
          <div className={styles.ruleList}>
            <RuleToggle
              title="Require same-day OD for store visits"
              description="Employees need a pending or approved OD to start a store visit."
              checked={draft.requiresOdForStoreVisits}
              disabled={disabled}
              onChange={(requiresOdForStoreVisits) => update({ requiresOdForStoreVisits })}
            />
            <RuleToggle
              title="Use OD and visits to determine attendance"
              description="Apply the OD and visit approval outcomes to eligible attendance records."
              checked={draft.affectsAttendance}
              disabled={disabled}
              onChange={(affectsAttendance) => update({ affectsAttendance })}
            />
          </div>
          {draft.affectsAttendance && <p className={styles.inlineNote}><Info size={16} aria-hidden /><span>Configure Present Awaiting as an inactive attendance type with a colour for these designations.</span></p>}
        </section>
      </div>
      {canEdit && (
        <div className={styles.cardFooter}>
          <button type="button" className={styles.secondaryButton} disabled={busy || !dirty} onClick={onReset}>Reset</button>
          <button type="submit" className={styles.primaryButton} disabled={busy || !dirty}>
            <Save size={16} aria-hidden /> {saving ? "Saving…" : "Save template"}
          </button>
        </div>
      )}
    </form>
  );
}

function RuleToggle({ title, description, checked, disabled, onChange }: {
  title: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={styles.ruleToggle}>
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <span className={styles.switch}>
        <input type="checkbox" role="switch" aria-label={title} checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
        <span className={styles.switchTrack} aria-hidden />
      </span>
    </label>
  );
}
