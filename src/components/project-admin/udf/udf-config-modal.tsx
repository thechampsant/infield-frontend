"use client";

import { Modal } from "@/components/project-admin/shared/modal";
import type { UDFScope } from "@/types/project-admin";

export function UDFConfigModal({
  open,
  onClose,
  scope,
  projectId,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  scope: UDFScope;
  projectId: string;
  onSuccess: () => void;
}) {
  const scopeLabel =
    scope === "user" ? "User" : scope === "store" ? "Store" : "Product";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${scopeLabel} UDF Configuration`}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              onSuccess();
              onClose();
            }}
          >
            Save Configuration
          </button>
        </>
      }
    >
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
        Configure user-defined fields for {scopeLabel.toLowerCase()} master data
        in project <strong>{projectId}</strong>. Full UDF editor will connect to{" "}
        <code>/api/v1/udf</code> endpoints when available.
      </p>
      <div className="pa-coming-soon" style={{ padding: "32px 16px" }}>
        <div className="pa-coming-soon-tag">Coming Soon</div>
        <div className="pa-coming-soon-title">UDF field builder</div>
        <div className="pa-coming-soon-desc">
          Add, edit, and reorder custom fields with validation rules.
        </div>
      </div>
    </Modal>
  );
}
