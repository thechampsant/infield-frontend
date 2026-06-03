"use client";

import { useState, type KeyboardEvent } from "react";

export function IdentifyStep({
  initialValue,
  loading,
  error,
  onSubmit,
}: {
  initialValue: string;
  loading: boolean;
  error: string | null;
  onSubmit: (identifier: string) => void;
}) {
  const [value, setValue] = useState(initialValue);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || loading) return;
    onSubmit(trimmed);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") submit();
  }

  return (
    <div className="screen">
      <div className="auth-tag bl">Sign In</div>
      <h2 className="auth-title">Welcome back</h2>
      <p className="auth-sub">
        Enter your Employee ID or phone number to continue.
      </p>

      <label className="f-lbl" htmlFor="empId">
        Employee ID / Phone
      </label>
      <div className={`f-field${error ? " err" : ""}`}>
        <svg
          className="f-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
        <input
          type="text"
          id="empId"
          placeholder="e.g. EMP-4821 or +91 98XXX XXXXX"
          autoComplete="username"
          value={value}
          disabled={loading}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
        />
      </div>

      {error ? (
        <div className="banner er show" role="alert">
          <span className="b-icon">⚠</span>
          <span>{error}</span>
        </div>
      ) : null}

      <button
        type="button"
        className={`btn btn-primary${loading ? " loading" : ""}`}
        onClick={submit}
        disabled={loading}
      >
        <span className="btn-label">Continue</span>
        <div className="btn-spinner" />
      </button>

      <div className="flow-dots">
        <div className="fdot on" />
        <div className="fdot" />
        <div className="fdot" />
        <div className="fdot" />
      </div>
    </div>
  );
}
