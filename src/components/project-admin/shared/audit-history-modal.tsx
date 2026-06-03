"use client";

import { Modal } from "@/components/project-admin/shared/modal";
import type { AuditEntry } from "@/types/project-admin";

export function AuditHistoryModal({
  open,
  onClose,
  entityType,
  entityId,
  entries,
}: {
  open: boolean;
  onClose: () => void;
  entityType: string;
  entityId: string;
  entries: AuditEntry[];
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Audit History — ${entityType}`}
      width={640}
      footer={
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
      }
    >
      <p
        style={{
          fontSize: 12,
          color: "var(--text-muted)",
          marginBottom: 16,
        }}
      >
        Record ID: <strong>{entityId}</strong>
      </p>
      {entries.length === 0 ? (
        <div className="pa-loading" style={{ padding: "24px 0" }}>
          No audit history available yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {entries.map((entry, i) => (
            <div
              key={i}
              style={{
                padding: 12,
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            >
              <div style={{ fontWeight: 700, color: "var(--navy)" }}>
                {entry.field}
              </div>
              <div style={{ color: "var(--text-muted)", marginTop: 4 }}>
                {entry.oldValue} → {entry.newValue}
              </div>
              <div style={{ color: "var(--text-muted)", marginTop: 4, fontSize: 11 }}>
                {entry.changedBy} · {new Date(entry.changedAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
