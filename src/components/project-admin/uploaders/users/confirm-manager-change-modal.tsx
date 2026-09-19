"use client";

import { Modal } from "@/components/project-admin/shared/modal";
import { formatUserNameWithCode } from "@/lib/project-admin/user-display";
import type { DirectManagerDisplay } from "@/lib/api/user-reportee-mapping-service";

export type ManagerChangeKind = "reassign" | "unassign";

export function managerChangeConfirmCopy(params: {
  kind: ManagerChangeKind;
  userName: string;
  userCode?: string | null;
  currentManager: DirectManagerDisplay | null;
  nextManagerLabel?: string | null;
}): string {
  const user = formatUserNameWithCode(params.userName, params.userCode);
  const current = params.currentManager
    ? formatUserNameWithCode(params.currentManager.name, params.currentManager.employeeId)
    : "their current manager";

  if (params.kind === "unassign") {
    return `Remove ${user} from ${current}? They will have no manager.`;
  }

  const next = params.nextManagerLabel?.trim() || "the selected manager";
  return `${user} currently reports to ${current}. Map them to ${next} instead?`;
}

export function ConfirmManagerChangeModal({
  open,
  kind,
  userName,
  userCode,
  currentManager,
  nextManagerLabel,
  submitting,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  kind: ManagerChangeKind;
  userName: string;
  userCode?: string | null;
  currentManager: DirectManagerDisplay | null;
  nextManagerLabel?: string | null;
  submitting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={kind === "unassign" ? "Remove manager?" : "Change manager?"}
      width={440}
      zIndex={40}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting ? "Saving…" : "Confirm"}
          </button>
        </>
      }
    >
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "var(--text)" }}>
        {managerChangeConfirmCopy({
          kind,
          userName,
          userCode,
          currentManager,
          nextManagerLabel,
        })}
      </p>
    </Modal>
  );
}
