"use client";

type SubState = "prompt" | "scanning" | "failed" | "success";

const FINGERPRINT_PATHS = [
  "M48 24c-13.2 0-24 10.8-24 24s5 18 10 28",
  "M48 24c13.2 0 24 10.8 24 24s-5 18-10 28",
  "M48 34c-7.2 0-13 5.8-13 13s2.5 10 5 18",
  "M48 34c7.2 0 13 5.8 13 13s-2.5 10-5 18",
  "M48 44c-1.5 0-2.5 1-2.5 2.5s1.2 5 2.5 10",
  "M48 44c1.5 0 2.5 1 2.5 2.5s-1.2 5-2.5 10",
];

export function PasskeyCreateStep({
  deviceLabel,
  subState,
  errorMessage,
  onCreate,
  onRetry,
  onSkip,
}: {
  deviceLabel: string;
  subState: SubState;
  errorMessage?: string | null;
  onCreate: () => void;
  onRetry: () => void;
  onSkip: () => void;
}) {
  if (subState === "scanning") {
    return (
      <div className="screen">
        <div className="auth-tag bl">Waiting</div>
        <div className="bio-scan">
          <svg
            className="fp"
            viewBox="0 0 96 96"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            {FINGERPRINT_PATHS.map((d) => (
              <path key={d} d={d} />
            ))}
          </svg>
          <div className="scan-line" />
        </div>
        <div className="pk-label" style={{ textAlign: "center", marginTop: 12 }}>
          Follow your browser prompt
        </div>
        <p className="pk-desc" style={{ margin: "8px auto 24px" }}>
          Touch the sensor, enter your PIN, or use Windows Hello.
        </p>
      </div>
    );
  }

  if (subState === "failed") {
    return (
      <div className="screen">
        <div className="auth-tag am">Retry</div>
        <div className="pk-visual">
          <div className="pk-icon warn">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div className="pk-label">Passkey Setup Failed</div>
          <div className="pk-desc">
            {errorMessage ||
              "We couldn't create your passkey. Try again or use your device PIN."}
          </div>
        </div>
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          Try Again
        </button>
        <button type="button" className="btn btn-ghost" onClick={onSkip}>
          Skip — use OTP each time
        </button>
      </div>
    );
  }

  if (subState === "success") {
    return (
      <div className="screen">
        <div className="suc-box show">
          <div className="si">🔐</div>
          <div className="st">Passkey Created!</div>
          <div className="ss">Redirecting to your dashboard…</div>
        </div>
        <div className="pk-list">
          <div className="pk-item">
            <div className="pki-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 11c0-1.1-.9-2-2-2s-2 .9-2 2c0 2 2 4 2 6" />
                <path d="M18 11c0-3.3-2.7-6-6-6" />
                <path d="M20 11c0-4.4-3.6-8-8-8s-8 3.6-8 8" />
              </svg>
            </div>
            <div className="pki-info">
              <div className="pki-name">{deviceLabel}</div>
              <div className="pki-meta">Created just now</div>
            </div>
            <div className="pki-badge">Active</div>
          </div>
        </div>
        <div className="flow-dots">
          <div className="fdot done" />
          <div className="fdot done" />
          <div className="fdot done" />
          <div className="fdot on" />
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="auth-tag bl">Passkey Setup</div>

      <div className="pk-visual">
        <div className="pk-icon bio">
          <div className="pk-ring" />
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8">
            <path d="M12 11c0-1.1-.9-2-2-2s-2 .9-2 2c0 2 2 4 2 6" />
            <path d="M12 11c0-2.2-1.8-4-4-4s-4 1.8-4 4c0 4 4 8 4 8" />
            <path d="M18 11c0-3.3-2.7-6-6-6" />
            <path d="M20 11c0-4.4-3.6-8-8-8s-8 3.6-8 8" />
            <path d="M14 11c0 2-1 3.5-1 6" />
          </svg>
        </div>
        <div className="pk-label">Create your Passkey</div>
        <div className="pk-desc">
          Use fingerprint, Windows Hello, Touch ID, or device PIN for fast,
          passwordless login.
        </div>
      </div>

      <div className="device-chip">
        <div className="dc-icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="2" y="4" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        </div>
        <div>
          <div className="dc-name">{deviceLabel}</div>
          <div className="dc-meta">Built-in authenticator</div>
        </div>
      </div>

      <div className="callout blue">
        <div className="callout-title">🔑 How Passkeys Work</div>
        Your passkey stays on this device, synced via your OS (iCloud Keychain,
        Google Password Manager). No passwords — just biometrics or PIN.
      </div>

      <button type="button" className="btn btn-primary" onClick={onCreate}>
        <span className="btn-label">Create Passkey</span>
        <div className="btn-spinner" />
      </button>
      <button type="button" className="btn btn-ghost" onClick={onSkip}>
        Skip — use OTP each time
      </button>

      <div className="flow-dots">
        <div className="fdot done" />
        <div className="fdot done" />
        <div className="fdot on" />
        <div className="fdot" />
      </div>
    </div>
  );
}
