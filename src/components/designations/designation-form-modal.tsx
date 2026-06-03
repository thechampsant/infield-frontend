"use client";

import { useState, useEffect } from "react";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  Designation,
  CreateDesignationDto,
  UpdateDesignationDto,
  Role,
  AccessLevel,
} from "@/lib/api/types";

interface DesignationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateDesignationDto | UpdateDesignationDto) => Promise<void>;
  designation?: Designation | null;
  projectId: string;
  roles: Role[];
  isLoading?: boolean;
}

export function DesignationFormModal({
  isOpen,
  onClose,
  onSubmit,
  designation,
  projectId,
  roles,
  isLoading = false,
}: DesignationFormModalProps) {
  const isEdit = !!designation;

  const [formData, setFormData] = useState({
    name: "",
    roleId: "",
    access: "BOTH" as AccessLevel,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens/closes or designation changes
  useEffect(() => {
    if (isOpen) {
      if (designation) {
        setFormData({
          name: designation.name,
          roleId: designation.roleId,
          access: designation.access,
        });
      } else {
        setFormData({
          name: "",
          roleId: roles.length > 0 ? roles[0].id : "",
          access: "BOTH",
        });
      }
      setErrors({});
    }
  }, [isOpen, designation, roles]);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Designation name is required";
    }

    if (!formData.roleId) {
      newErrors.roleId = "Role is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validate()) return;

    if (isEdit && designation) {
      await onSubmit({
        id: designation.id,
        name: formData.name.trim(),
        roleId: formData.roleId,
        access: formData.access,
      } as UpdateDesignationDto);
    } else {
      await onSubmit({
        projectId,
        name: formData.name.trim(),
        roleId: formData.roleId,
        access: formData.access,
      } as CreateDesignationDto);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Designation" : "Create Designation"}
      description={
        isEdit
          ? "Update the designation information below."
          : "Fill in the details to create a new designation."
      }
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {/* Designation Name */}
          <div>
            <label
              htmlFor="name"
              className="mb-1.5 block text-sm font-medium text-[var(--orca-text)]"
            >
              Designation Name <span className="text-[var(--orca-brand-4)]">*</span>
            </label>
            <Input
              id="name"
              type="text"
              placeholder="e.g., Senior Recruiter, Team Lead"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              disabled={isLoading}
              className={errors.name ? "border-[var(--orca-brand-4)]" : ""}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-[var(--orca-brand-4)]">
                {errors.name}
              </p>
            )}
          </div>

          {/* Role Selection */}
          <div>
            <label
              htmlFor="roleId"
              className="mb-1.5 block text-sm font-medium text-[var(--orca-text)]"
            >
              Role <span className="text-[var(--orca-brand-4)]">*</span>
            </label>
            <select
              id="roleId"
              value={formData.roleId}
              onChange={(e) =>
                setFormData({ ...formData, roleId: e.target.value })
              }
              disabled={isLoading || roles.length === 0}
              className={`flex h-9 w-full rounded-lg border bg-[var(--orca-surface)] px-3 text-sm text-[var(--orca-text)] transition-colors focus:border-[var(--orca-brand)] focus:outline-none focus:ring-2 focus:ring-[var(--orca-brand)]/20 disabled:cursor-not-allowed disabled:opacity-60 ${
                errors.roleId ? "border-[var(--orca-brand-4)]" : "border-[var(--orca-border)]"
              }`}
            >
              {roles.length === 0 ? (
                <option value="">No roles available</option>
              ) : (
                roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.roleName} (Level {role.level})
                  </option>
                ))
              )}
            </select>
            {errors.roleId && (
              <p className="mt-1 text-xs text-[var(--orca-brand-4)]">
                {errors.roleId}
              </p>
            )}
            {roles.length === 0 && (
              <p className="mt-1 text-xs text-[var(--orca-text-3)]">
                Please create roles first before adding designations.
              </p>
            )}
          </div>

          {/* Access Level */}
          <div>
            <label
              htmlFor="access"
              className="mb-1.5 block text-sm font-medium text-[var(--orca-text)]"
            >
              Access Level
            </label>
            <select
              id="access"
              value={formData.access}
              onChange={(e) =>
                setFormData({ ...formData, access: e.target.value as AccessLevel })
              }
              disabled={isLoading}
              className="flex h-9 w-full rounded-lg border border-[var(--orca-border)] bg-[var(--orca-surface)] px-3 text-sm text-[var(--orca-text)] transition-colors focus:border-[var(--orca-brand)] focus:outline-none focus:ring-2 focus:ring-[var(--orca-brand)]/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="BOTH">Both (Web & Mobile)</option>
              <option value="WEB">Web Only</option>
              <option value="MOBILE">Mobile Only</option>
            </select>
            <p className="mt-1 text-xs text-[var(--orca-text-3)]">
              Determines which platforms this designation can access.
            </p>
          </div>
        </div>

        <ModalFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isLoading || roles.length === 0}
          >
            {isLoading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                {isEdit ? "Saving..." : "Creating..."}
              </>
            ) : isEdit ? (
              "Save Changes"
            ) : (
              "Create Designation"
            )}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
