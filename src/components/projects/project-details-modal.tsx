"use client";

import { Building2, Calendar, Folder, Mail } from "lucide-react";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/pill";
import type { Project } from "@/lib/api/types";

interface ProjectDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onEdit?: () => void;
}

export function ProjectDetailsModal({
  isOpen,
  onClose,
  project,
  onEdit,
}: ProjectDetailsModalProps) {
  if (!project) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Project Details" size="md">
      <div className="space-y-6">
        {/* Header with icon and name */}
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--orca-brand-light)] text-[var(--orca-brand)]">
            <Folder className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[var(--orca-text)]">
              {project.name}
            </h3>
            <p className="font-mono text-sm text-[var(--orca-text-3)]">
              {project.code}
            </p>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          <DetailItem
            icon={<Building2 className="h-4 w-4" />}
            label="Account"
            value={project.accountCode}
          />
          <DetailItem
            icon={<Mail className="h-4 w-4" />}
            label="Project Admin Email"
            value={project.projectAdminEmail || "—"}
          />
          {project.regionLabel && (
            <DetailItem
              icon={<Folder className="h-4 w-4" />}
              label="Region"
              value={project.regionLabel}
            />
          )}
          <div className="rounded-lg bg-[var(--orca-surface-2)] p-3">
            <p className="mb-1 text-xs font-medium text-[var(--orca-text-3)]">
              Status
            </p>
            <StatusPill
              status={project.status === "Active" ? "active" : "inactive"}
            />
          </div>
        </div>

        {/* Modules */}
        {project.modulesActive.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-[var(--orca-text-3)]">
              Active Modules
            </p>
            <div className="flex flex-wrap gap-2">
              {project.modulesActive.map((mod) => (
                <span
                  key={mod}
                  className="rounded-full bg-[var(--orca-brand-light)] px-3 py-1 text-xs font-medium text-[var(--orca-brand)]"
                >
                  {mod}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        {onEdit && (
          <Button variant="primary" onClick={onEdit}>
            Edit Project
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

