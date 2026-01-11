"use client";

import { Building2, Calendar, Mail } from "lucide-react";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/pill";
import type { Account } from "@/lib/api/types";

interface AccountDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: Account | null;
  onEdit?: () => void;
}

export function AccountDetailsModal({
  isOpen,
  onClose,
  account,
  onEdit,
}: AccountDetailsModalProps) {
  if (!account) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Account Details"
      size="md"
    >
      <div className="space-y-6">
        {/* Header with icon and name */}
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--orca-brand-4-light)] text-[var(--orca-brand-4)]">
            <Building2 className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[var(--orca-text)]">
              {account.name}
            </h3>
            <p className="font-mono text-sm text-[var(--orca-text-3)]">
              {account.code}
            </p>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          <DetailItem
            icon={<Mail className="h-4 w-4" />}
            label="Admin Email"
            value={account.primaryAdminEmail}
          />
          <DetailItem
            icon={<Building2 className="h-4 w-4" />}
            label="Active Projects"
            value={String(account.projectsActiveCount)}
          />
          <DetailItem
            icon={<Calendar className="h-4 w-4" />}
            label="Created"
            value={new Date(account.createdAtIso).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          />
          <div className="rounded-lg bg-[var(--orca-surface-2)] p-3">
            <p className="mb-1 text-xs font-medium text-[var(--orca-text-3)]">
              Status
            </p>
            <StatusPill
              status={account.status === "Active" ? "active" : "inactive"}
            />
          </div>
        </div>
      </div>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        {onEdit && (
          <Button variant="primary" onClick={onEdit}>
            Edit Account
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-[var(--orca-surface-2)] p-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-[var(--orca-text-3)]">
        {icon}
        {label}
      </div>
      <p className="text-sm font-medium text-[var(--orca-text)]">{value}</p>
    </div>
  );
}

