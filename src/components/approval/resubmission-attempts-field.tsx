"use client";

import { useId } from "react";
import {
  RESUBMISSION_ATTEMPTS_HELP,
  RESUBMISSION_ATTEMPTS_LABEL,
  resubmissionAttemptsError,
} from "@/lib/approval/resubmission-attempts";

export function ResubmissionAttemptsField({
  value,
  onChange,
  hint,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  hint: string;
  disabled?: boolean;
}) {
  const id = useId();
  const error = resubmissionAttemptsError(value);
  return (
    <div className="resubmission-setting">
      <div className="resubmission-setting__copy">
        <label className="resubmission-setting__label" htmlFor={id}>
          {RESUBMISSION_ATTEMPTS_LABEL}
        </label>
        <p id={`${id}-help`} className="resubmission-setting__help">
          {RESUBMISSION_ATTEMPTS_HELP} {hint}
        </p>
      </div>
      <div className="resubmission-setting__control">
        <input
          id={id}
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          className="resubmission-setting__input"
          value={value}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={`${id}-help${error ? ` ${id}-error` : ""}`}
          onChange={(event) => onChange(event.target.value)}
        />
        <span className="resubmission-setting__unit" aria-hidden="true">attempts</span>
      </div>
      {error && <p id={`${id}-error`} className="resubmission-setting__error" role="alert">{error}</p>}
    </div>
  );
}
