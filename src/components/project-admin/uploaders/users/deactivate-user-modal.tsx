"use client";

import { Modal } from "@/components/project-admin/shared/modal";
import { PendingRequestNotice } from "@/components/project-admin/shared/pending-request-notice";
import type { UserDeactivationImpact } from "@/lib/api/project-users-service";

export const DEACTIVATE_FALLBACK_COPY = "Deactivate this record?";

/**
 * Confirms a user deactivation. Shows what happens to pending requests: blocked while the
 * user's own requests are pending, or which approvals move to the Project Admins.
 */
export function DeactivateUserModal({
  open,
  loading,
  impact,
  submitting,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  loading: boolean;
  /** null when the impact could not be loaded; the plain confirm is shown instead. */
  impact: UserDeactivationImpact | null;
  submitting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const blocked = impact?.canDeactivate === false;
  const message = impact?.message || DEACTIVATE_FALLBACK_COPY;

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={blocked ? "Can't deactivate user" : "Deactivate user?"}
      width={480}
      zIndex={40}
      footer={
        blocked ? (
          <button type="button" className="btn btn-primary" onClick={onCancel}>
            OK
          </button>
        ) : (
          <>
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onConfirm}
              disabled={loading || submitting}
            >
              {submitting ? "Deactivating…" : "Deactivate"}
            </button>
          </>
        )
      }
    >
      {loading || !impact?.message ? (
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "var(--text)" }}>
          {loading ? "Checking pending requests…" : message}
        </p>
      ) : (
        <PendingRequestNotice tone={blocked ? "danger" : "warning"} message={impact.message} />
      )}
    </Modal>
  );
}
