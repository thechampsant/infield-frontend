"use client";

import { useId, useRef } from "react";
import {
  SAVED_REJECTION_KEY_WARNING,
  addMissingDefaultReasons,
  createRejectionReasonOption,
  emptyRejectionReasons,
  hasMissingDefaultReasons,
  isSavedKeyChanged,
  moveRejectionReason,
  withKey,
  withLabel,
  type RejectionReasonOptionForm,
  type RejectionReasonsForm,
} from "@/lib/approval/rejection-reasons";

/**
 * "Manager rejection reasons" block shown below a flow's auto-reject settings.
 * Controlled: the page owns the value and decides when to show `error`.
 */
export function RejectionReasonsSection({
  value,
  onChange,
  error,
  requestNoun,
  disabled = false,
}: {
  value: RejectionReasonsForm | undefined;
  onChange: (next: RejectionReasonsForm) => void;
  error?: string | null;
  /** Used in "When a manager rejects a {requestNoun} request…". */
  requestNoun: string;
  disabled?: boolean;
}) {
  const config = value ?? emptyRejectionReasons();
  const options = config.reasonOptions;
  const focusUidRef = useRef<string | null>(null);
  const idPrefix = useId();

  const update = (patch: Partial<RejectionReasonsForm>) => onChange({ ...config, ...patch });
  const updateRow = (index: number, next: RejectionReasonOptionForm) =>
    update({ reasonOptions: options.map((option, i) => (i === index ? next : option)) });

  const addReason = () => {
    const row = createRejectionReasonOption(options.length);
    focusUidRef.current = row.uid ?? null;
    update({ reasonOptions: [...options, row] });
  };

  return (
    <div className="rr-section">
      <div className="rr-heading">
        Manager rejection reasons <span className="rr-new">New</span>
      </div>

      <SettingToggle
        id={`${idPrefix}-enabled`}
        label="Show reason dropdown on reject"
        hint={`When a manager rejects a ${requestNoun} request, they pick a reason from the list below instead of typing one.`}
        checked={config.isEnabled}
        disabled={disabled}
        onChange={(isEnabled) => update({ isEnabled })}
      />

      {config.isEnabled ? (
        <>
          <SettingToggle
            id={`${idPrefix}-mandatory`}
            label="Reason is mandatory"
            hint="Reject button stays disabled until a reason is selected."
            checked={config.isMandatory}
            disabled={disabled}
            onChange={(isMandatory) => update({ isMandatory })}
          />
          <SettingToggle
            id={`${idPrefix}-bulk`}
            label="Apply one reason to bulk reject"
            hint="When a manager selects multiple requests and rejects together, the chosen reason is stamped on all of them."
            checked={config.applyToBulkReject}
            disabled={disabled}
            onChange={(applyToBulkReject) => update({ applyToBulkReject })}
          />

          <div className="rr-subheading">Reason options</div>
          {options.length === 0 ? (
            <div className="rr-empty">No reasons yet. Add one, or start from the defaults.</div>
          ) : (
            <div className="rr-table-wrap">
              <table className="rr-table">
                <thead>
                  <tr>
                    <th>Label</th>
                    <th>Key</th>
                    <th>Active</th>
                    <th>Requires remarks</th>
                    <th>Order</th>
                    <th>Reorder</th>
                    <th>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {options.map((option, index) => (
                    <tr key={option.uid ?? `row-${index}`}>
                      <td>
                        <input
                          ref={(el) => {
                            if (el && option.uid && focusUidRef.current === option.uid) {
                              focusUidRef.current = null;
                              el.focus();
                            }
                          }}
                          className="form-input rr-input"
                          value={option.label}
                          placeholder="Insufficient proof"
                          maxLength={120}
                          disabled={disabled}
                          aria-label={`Reason ${index + 1} label`}
                          onChange={(e) => updateRow(index, withLabel(option, e.target.value))}
                        />
                      </td>
                      <td>
                        <div className="rr-key-cell">
                          <input
                            className="form-input rr-input rr-input--key"
                            value={option.key}
                            placeholder="insufficient_proof"
                            maxLength={64}
                            disabled={disabled}
                            aria-label={`Reason ${index + 1} key`}
                            onChange={(e) => updateRow(index, withKey(option, e.target.value))}
                          />
                          {option.originalKey ? (
                            <span className={`rr-key-warning${isSavedKeyChanged(option) ? " is-changed" : ""}`}>
                              {SAVED_REJECTION_KEY_WARNING}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <Switch
                          checked={option.isActive}
                          disabled={disabled}
                          label={`Reason ${index + 1} active`}
                          onChange={(isActive) => updateRow(index, { ...option, isActive })}
                        />
                      </td>
                      <td>
                        <Switch
                          checked={option.requiresRemarks}
                          disabled={disabled}
                          label={`Reason ${index + 1} requires remarks`}
                          onChange={(requiresRemarks) => updateRow(index, { ...option, requiresRemarks })}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-input rr-input rr-order"
                          min={0}
                          value={option.displayOrder}
                          disabled={disabled}
                          aria-label={`Reason ${index + 1} order`}
                          onChange={(e) => {
                            const order = parseInt(e.target.value, 10);
                            updateRow(index, { ...option, displayOrder: Number.isNaN(order) ? 0 : order });
                          }}
                        />
                      </td>
                      <td>
                        <div className="rr-reorder">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={disabled || index === 0}
                            onClick={() => update({ reasonOptions: moveRejectionReason(options, index, -1) })}
                          >
                            Up
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={disabled || index === options.length - 1}
                            onClick={() => update({ reasonOptions: moveRejectionReason(options, index, 1) })}
                          >
                            Down
                          </button>
                        </div>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          disabled={disabled}
                          onClick={() => update({ reasonOptions: options.filter((_, i) => i !== index) })}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {error ? (
            <p className="rr-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="rr-actions">
            <button type="button" className="btn btn-secondary btn-sm" disabled={disabled} onClick={addReason}>
              + Add reason
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={disabled || !hasMissingDefaultReasons(options)}
              onClick={() => update({ reasonOptions: addMissingDefaultReasons(options) })}
            >
              Use defaults
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function SettingToggle({
  id,
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="rr-setting">
      <div>
        <label className="rr-setting-name" htmlFor={id}>
          {label}
        </label>
        <p className="rr-setting-hint">{hint}</p>
      </div>
      <Switch id={id} checked={checked} disabled={disabled} label={label} onChange={onChange} />
    </div>
  );
}

function Switch({
  id,
  checked,
  disabled,
  label,
  onChange,
}: {
  id?: string;
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <span className="rr-switch">
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="rr-switch-track" aria-hidden="true" />
      <span className="rr-switch-thumb" aria-hidden="true" />
    </span>
  );
}
