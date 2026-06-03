"use client";

export function NewDeviceStep({
  deviceLabel,
  loading,
  onVerifyAndRegister,
  onCancel,
}: {
  deviceLabel: string;
  loading: boolean;
  onVerifyAndRegister: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="screen">
      <div className="auth-tag bl">New Device Detected</div>
      <h2 className="auth-title">Register this device</h2>
      <p className="auth-sub">
        We haven&apos;t seen a passkey on this device yet. Verify via OTP, then
        set up a passkey for quick future access.
      </p>

      <div className="banner info show">
        <span className="b-icon">ℹ️</span>
        <span>
          For your security, OTP verification is required before registering
          this device.
        </span>
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

      <button
        type="button"
        className={`btn btn-primary${loading ? " loading" : ""}`}
        onClick={onVerifyAndRegister}
        disabled={loading}
      >
        <span className="btn-label">Verify via OTP &amp; Register</span>
        <div className="btn-spinner" />
      </button>
      <button type="button" className="btn btn-ghost" onClick={onCancel}>
        Cancel
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
