"use client";

import { Pencil, XCircle, CheckCircle, Clock } from "lucide-react";
import type { Status } from "@/types/project-admin";

interface ActionButtonsProps {
  status: Status;
  entityType: string;
  entityId: string;
  projectId: string;
  onEdit: () => void;
  onAudit: () => void;
  onRefresh: () => void;
  onDeactivate?: () => Promise<void>;
  onReactivate?: () => Promise<void>;
}

export function ActionButtons({
  status,
  onEdit,
  onAudit,
  onRefresh,
  onDeactivate,
  onReactivate,
}: ActionButtonsProps) {
  const handleDeactivate = async () => {
    if (!confirm("Deactivate this record?")) return;
    if (onDeactivate) await onDeactivate();
    onRefresh();
  };

  const handleReactivate = async () => {
    if (onReactivate) await onReactivate();
    onRefresh();
  };

  return (
    <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
      <ActionBtn title="Edit" onClick={onEdit}>
        <Pencil size={14} />
      </ActionBtn>

      {status === "active" ? (
        <ActionBtn title="Deactivate" variant="danger" onClick={handleDeactivate}>
          <XCircle size={14} />
        </ActionBtn>
      ) : (
        <ActionBtn title="Re-activate" variant="teal" onClick={handleReactivate}>
          <CheckCircle size={14} />
        </ActionBtn>
      )}

      <ActionBtn title="Audit History" onClick={onAudit}>
        <Clock size={14} />
      </ActionBtn>
    </div>
  );
}

function ActionBtn({
  children,
  title,
  onClick,
  variant,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  variant?: "danger" | "teal";
}) {
  const hoverStyle =
    variant === "danger"
      ? {
          background: "var(--red-light)",
          borderColor: "var(--red)",
          color: "var(--red)",
        }
      : variant === "teal"
        ? {
            background: "var(--teal-light)",
            borderColor: "var(--teal)",
            color: "var(--teal)",
          }
        : {
            background: "var(--blue-pale)",
            borderColor: "var(--blue)",
            color: "var(--blue)",
          };

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        border: "1px solid var(--border)",
        background: "var(--surface)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: "var(--text-mid)",
        transition: "all .15s",
      }}
      onMouseEnter={(e) =>
        Object.assign((e.currentTarget as HTMLElement).style, hoverStyle)
      }
      onMouseLeave={(e) =>
        Object.assign((e.currentTarget as HTMLElement).style, {
          background: "var(--surface)",
          borderColor: "var(--border)",
          color: "var(--text-mid)",
        })
      }
    >
      {children}
    </button>
  );
}
