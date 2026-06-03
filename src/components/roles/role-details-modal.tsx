"use client";

import { Modal, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import type { Role } from "@/lib/api/types";

interface RoleDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role | null;
  onEdit?: () => void;
}

export function RoleDetailsModal({
  isOpen,
  onClose,
  role,
  onEdit,
}: RoleDetailsModalProps) {
  if (!role) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Role Details"
      description="View detailed information about this role."
      size="md"
    >
      <div className="space-y-4">
        <DetailRow label="Role Name" value={role.roleName} />
        <DetailRow label="Level" value={String(role.level)} />
        <DetailRow
          label="Status"
          value={role.isActive ? "Active" : "Inactive"}
          valueClassName={
            role.isActive
              ? "text-[var(--orca-brand-2)]"
              : "text-[var(--orca-text-3)]"
          }
        />
        {role.createdAt && (
          <DetailRow
            label="Created"
            value={new Date(role.createdAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          />
        )}
        {role.updatedAt && (
          <DetailRow
            label="Last Updated"
            value={new Date(role.updatedAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          />
        )}
      </div>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        {onEdit && (
          <Button variant="primary" onClick={onEdit}>
            Edit Role
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
}

function DetailRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-start justify-between border-b border-[var(--orca-border-light)] pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-[var(--orca-text-3)]">{label}</span>
      <span className={`text-sm font-medium text-[var(--orca-text)] ${valueClassName || ""}`}>
        {value}
      </span>
    </div>
  );
}
