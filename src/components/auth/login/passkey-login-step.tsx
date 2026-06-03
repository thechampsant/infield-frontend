"use client";

type SubState = "idle" | "scanning" | "failed";

export function PasskeyLoginStep({
  identifier,
  deviceLabel,
  subState,
  errorMessage,
  onSignIn,
  onUseOtp,
  onUseDifferentAccount,
}: {
  identifier: string;
  deviceLabel: string;
  subState: SubState;
  errorMessage?: string | null;
  onSignIn: () => void;
  onUseOtp: () => void;
  onUseDifferentAccount: () => void;
}) {
  return (
    <div className="screen">
      {subState === "scanning" ? (
        <>
          <div className="auth-tag bl">Verifying</div>
          <div className="bio-scan">
            <svg
              className="fp"
              viewBox="0 0 96 96"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M48 24c-13.2 0-24 10.8-24 24s5 18 10 28" />
              <path d="M48 24c13.2 0 24 10.8 24 24s-5 18-10 28" />
              <path d="M48 34c-7.2 0-13 5.8-13 13s2.5 10 5 18" />
              <path d="M48 34c7.2 0 13 5.8 13 13s-2.5 10-5 18" />
              <path d="M48 44c-1.5 0-2.5 1-2.5 2.5s1.2 5 2.5 10" />
              <path d="M48 44c1.5 0 2.5 1 2.5 2.5s-1.2 5-2.5 10" />
            </svg>
            <div className="scan-line" />
          </div>
          <div
            className="pk-label"
            style={{ textAlign: "center", marginTop: 12 }}
          >
            Verifying passkey…
          </div>
          <p
            className="pk-desc"
            style={{ margin: "8px auto 24px", textAlign: "center" }}
          >
            Complete the browser prompt to continue.
          </p>
        </>
      ) : subState === "failed" ? (
        <>
          <div className="auth-tag rs">Failed</div>
          <div className="pk-visual">
            <div className="pk-icon err">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <div className="pk-label">Passkey Verification Failed</div>
            <div className="pk-desc">
              {errorMessage ||
                "Biometric could not be verified. Choose how to proceed."}
            </div>
          </div>
          <button type="button" className="btn btn-primary" onClick={onSignIn}>
            <span className="btn-label">Try Passkey Again</span>
            <div className="btn-spinner" />
          </button>
          <button type="button" className="btn btn-outline" onClick={onUseOtp}>
            Sign in with OTP
          </button>
        </>
      ) : (
        <>
          <div className="auth-tag bl">Welcome Back</div>
          <h2 className="auth-title">{identifier}</h2>
          <p className="auth-sub">Sign in with the passkey on this device.</p>

          <div className="pk-visual" style={{ margin: "12px 0 20px" }}>
            <div className="pk-icon bio">
              <div className="pk-ring" />
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="1.8"
              >
                <path d="M12 11c0-1.1-.9-2-2-2s-2 .9-2 2c0 2 2 4 2 6" />
                <path d="M12 11c0-2.2-1.8-4-4-4s-4 1.8-4 4c0 4 4 8 4 8" />
                <path d="M18 11c0-3.3-2.7-6-6-6" />
                <path d="M20 11c0-4.4-3.6-8-8-8s-8 3.6-8 8" />
                <path d="M14 11c0 2-1 3.5-1 6" />
              </svg>
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
              <div className="dc-name">This Device</div>
              <div className="dc-meta">{deviceLabel}</div>
            </div>
          </div>

          <button type="button" className="btn btn-primary" onClick={onSignIn}>
            <span className="btn-label">Sign in with Passkey</span>
            <div className="btn-spinner" />
          </button>

          <div className="divider">or</div>

          <button type="button" className="btn btn-outline" onClick={onUseOtp}>
            Sign in with OTP instead
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onUseDifferentAccount}
          >
            Use a different account
          </button>

          <div className="flow-dots">
            <div className="fdot done" />
            <div className="fdot on" />
            <div className="fdot" />
            <div className="fdot" />
          </div>
        </>
      )}
    </div>
  );
}
