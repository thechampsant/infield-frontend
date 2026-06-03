"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";

const OTP_LENGTH = 6;
const OTP_TTL = 300; // 5 min
const RESEND_WAIT = 30; // 30 s
const RING_CIRCUMFERENCE = 201;

type OtpVariant = "first-time" | "otp-fallback" | "new-device";

const VARIANT_TAG: Record<OtpVariant, { cls: string; label: string }> = {
  "first-time": { cls: "tl", label: "First-Time Setup" },
  "otp-fallback": { cls: "bl", label: "OTP Login" },
  "new-device": { cls: "bl", label: "New Device" },
};

function formatTime(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Renders the OTP entry screen. The parent remounts this via a `key` whenever a
 * fresh OTP is sent, so all input/timer state starts clean without resetting
 * state inside an effect.
 */
export function OtpStep({
  identifierLabel,
  variant,
  loading,
  error,
  success,
  successText,
  onVerify,
  onResend,
  onBack,
}: {
  identifierLabel: string;
  variant: OtpVariant;
  loading: boolean;
  error: string | null;
  success: boolean;
  successText: string;
  onVerify: (otp: string) => void;
  onResend: () => void;
  onBack: () => void;
}) {
  const [digits, setDigits] = useState<string[]>(() =>
    Array(OTP_LENGTH).fill(""),
  );
  const [timerSec, setTimerSec] = useState(OTP_TTL);
  const [resendSec, setResendSec] = useState(RESEND_WAIT);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus first box on mount.
  useEffect(() => {
    const t = setTimeout(() => inputsRef.current[0]?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  // Expiry countdown (setState in interval callback, stops at 0).
  useEffect(() => {
    const id = setInterval(
      () => setTimerSec((s) => (s <= 0 ? 0 : s - 1)),
      1000,
    );
    return () => clearInterval(id);
  }, []);

  // Resend cooldown.
  useEffect(() => {
    const id = setInterval(
      () => setResendSec((s) => (s <= 0 ? 0 : s - 1)),
      1000,
    );
    return () => clearInterval(id);
  }, []);

  const submit = useCallback(
    (code: string) => {
      if (code.length === OTP_LENGTH && !loading) onVerify(code);
    },
    [loading, onVerify],
  );

  function setDigit(index: number, raw: string) {
    const val = raw.replace(/\D/g, "").slice(0, 1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = val;
      if (val && index < OTP_LENGTH - 1) {
        inputsRef.current[index + 1]?.focus();
      }
      const code = next.join("");
      if (code.length === OTP_LENGTH && next.every((d) => d)) {
        setTimeout(() => submit(code), 150);
      }
      return next;
    });
  }

  function onKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
      setDigits((prev) => {
        const next = [...prev];
        next[index - 1] = "";
        return next;
      });
    }
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!text) return;
    e.preventDefault();
    const chars = text.slice(0, OTP_LENGTH).split("");
    const next = Array(OTP_LENGTH)
      .fill("")
      .map((_, i) => chars[i] ?? "");
    setDigits(next);
    const filled = Math.min(chars.length, OTP_LENGTH) - 1;
    inputsRef.current[Math.max(0, filled)]?.focus();
    if (chars.length >= OTP_LENGTH) setTimeout(() => submit(next.join("")), 150);
  }

  const expired = timerSec <= 0;
  const dashoffset = RING_CIRCUMFERENCE * (1 - timerSec / OTP_TTL);
  const tag = VARIANT_TAG[variant];
  const boxClass = (i: number) => {
    if (success) return "otp-box success";
    if (error) return "otp-box error";
    return `otp-box${digits[i] ? " filled" : ""}`;
  };

  return (
    <div className="screen">
      <button type="button" className="bc" onClick={onBack}>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        Back
      </button>

      <div className={`auth-tag ${tag.cls}`}>{tag.label}</div>
      <h2 className="auth-title">Enter your OTP</h2>
      <p className="auth-sub">
        We sent a 6-digit code to <strong>{identifierLabel}</strong>
      </p>

      <div className="timer-wrap">
        <div className="timer-ring">
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle className="t-track" cx="36" cy="36" r="32" />
            <circle
              className={`t-fill${expired ? " expired" : ""}`}
              cx="36"
              cy="36"
              r="32"
              strokeDashoffset={expired ? RING_CIRCUMFERENCE : dashoffset}
              style={timerSec <= 60 && !expired ? { stroke: "var(--red)" } : undefined}
            />
          </svg>
          <div className="t-center">
            <div
              className="t-num"
              style={timerSec <= 60 ? { color: "var(--red)" } : undefined}
            >
              {formatTime(timerSec)}
            </div>
            <div className="t-lbl">left</div>
          </div>
        </div>
        <div className="timer-label">
          OTP expires in <strong>{formatTime(timerSec)}</strong>
        </div>
      </div>

      {error ? (
        <div className="banner er show" role="alert">
          <span className="b-icon">⚠</span>
          <span>{error}</span>
        </div>
      ) : null}

      {success ? (
        <div className="suc-box show">
          <div className="si">✅</div>
          <div className="st">Identity Verified!</div>
          <div className="ss">{successText}</div>
        </div>
      ) : null}

      <div className="otp-row" aria-label="One-time password input">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              inputsRef.current[i] = el;
            }}
            className={boxClass(i)}
            maxLength={1}
            inputMode="numeric"
            aria-label={`Digit ${i + 1}`}
            value={d}
            disabled={loading || success}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            onPaste={onPaste}
          />
        ))}
      </div>

      <div className="resend-row">
        {resendSec > 0 ? (
          <span>Resend OTP in {resendSec}s</span>
        ) : (
          <button type="button" onClick={onResend} disabled={loading}>
            Resend OTP
          </button>
        )}
      </div>

      {!success ? (
        <button
          type="button"
          className={`btn btn-primary${loading ? " loading" : ""}`}
          onClick={() => submit(digits.join(""))}
          disabled={loading || digits.some((d) => !d)}
        >
          <span className="btn-label">Verify OTP</span>
          <div className="btn-spinner" />
        </button>
      ) : null}

      <div className="flow-dots">
        <div className="fdot done" />
        <div className="fdot on" />
        <div className="fdot" />
        <div className="fdot" />
      </div>
    </div>
  );
}
