"use client";

export function NotSupportedStep({
  onSendOtp,
  onBack,
}: {
  onSendOtp: () => void;
  onBack: () => void;
}) {
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

      <div className="auth-tag am">Compatibility</div>
      <div className="pk-visual">
        <div className="pk-icon warn">
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
            <rect x="2" y="4" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        </div>
        <div className="pk-label">Passkey Not Supported</div>
        <div className="pk-desc">
          This browser or device doesn&apos;t support passkeys. You can still
          sign in securely via OTP.
        </div>
      </div>

      <div className="callout amber">
        <div className="callout-title">📱 Passkey Requirements</div>
        Chrome 108+, Edge 108+, Safari 16+, Firefox 122+. Screen lock must be
        enabled (Windows Hello, Touch ID, Android biometrics, or device PIN).
      </div>

      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
        Continue with OTP
      </h3>
      <p className="auth-sub" style={{ marginBottom: 20 }}>
        Secure login to your registered phone — always available as a fallback.
      </p>

      <button type="button" className="btn btn-primary" onClick={onSendOtp}>
        Send OTP to Login
      </button>
      <button type="button" className="btn btn-ghost" onClick={onBack}>
        Try a different account
      </button>

      <div className="flow-dots">
        <div className="fdot done" />
        <div className="fdot on" />
        <div className="fdot" />
        <div className="fdot" />
      </div>
    </div>
  );
}
