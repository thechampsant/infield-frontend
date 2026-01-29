"use client";

import { Modal, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/pill";
import type { Designation, Role } from "@/lib/api/types";

interface DesignationDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  designation: Designation | null;
  roles: Role[];
  onEdit?: () => void;
}

export function DesignationDetailsModal({
  isOpen,
  onClose,
  designation,
  roles,
  onEdit,
}: DesignationDetailsModalProps) {
  if (!designation) return null;

  // Find the role name
  const role = roles.find((r) => r.id === designation.roleId);
  const roleName = role?.roleName || designation.roleName || "Unknown";

  // Map access level to human-readable text
  const accessLabels: Record<string, string> = {
    WEB: "Web Only",
    MOBILE: "Mobile Only",
    BOTH: "Both (Web & Mobile)",
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Designation Details"
      description="View detailed information about this designation."
      size="md"
    >
      <div className="space-y-4">
        <DetailRow label="Designation Name" value={designation.name} />
        <DetailRow label="Role" value={roleName} />
        <DetailRow
          label="Access Level"
          value={accessLabels[designation.access] || designation.access}
        />
        <DetailRow
          label="Status"
          value={designation.isActive ? "Active" : "Inactive"}
          valueClassName={
            designation.isActive
              ? "text-[var(--orca-brand-2)]"
              : "text-[var(--orca-text-3)]"
          }
        />
        {designation.permissions && designation.permissions.length > 0 && (
          <div className="border-b border-[var(--orca-border-light)] pb-3">
            <span className="block text-sm text-[var(--orca-text-3)] mb-2">Permissions</span>
            <div className="flex flex-wrap gap-1">
              {designation.permissions.map((perm, index) => (
                <Badge key={index} variant="blue">
                  {perm}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {designation.createdAt && (
          <DetailRow
            label="Created"
            value={new Date(designation.createdAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          />
        )}
        {designation.updatedAt && (
          <DetailRow
            label="Last Updated"
            value={new Date(designation.updatedAt).toLocaleDateString("en-US", {
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
            Edit Designation
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
