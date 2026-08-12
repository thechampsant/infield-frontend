"use client";

import { useState, useEffect } from "react";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PermissionOption } from "@/lib/api/designation-service";
import {
  defaultPermissionsForAccess,
  type DesignationAccess,
} from "@/lib/designations/backend-roles";
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
  permissionOptions?: PermissionOption[];
  isLoading?: boolean;
}

export function DesignationFormModal({
  isOpen,
  onClose,
  onSubmit,
  designation,
  projectId,
  roles,
  permissionOptions = [],
  isLoading = false,
}: DesignationFormModalProps) {
  const isEdit = !!designation;

  const [formData, setFormData] = useState({
    name: "",
    roleId: "",
    access: "BOTH" as AccessLevel,
  });
  const [permissions, setPermissions] = useState<string[]>(
    defaultPermissionsForAccess("BOTH"),
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens/closes or designation changes.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isOpen) {
      if (designation) {
        setFormData({
          name: designation.name,
          roleId: designation.roleId,
          access: designation.access,
        });
        setPermissions(
          designation.permissions.length > 0
            ? designation.permissions
            : defaultPermissionsForAccess(designation.access),
        );
      } else {
        setFormData({
          name: "",
          roleId: roles.length > 0 ? roles[0].id : "",
          access: "BOTH",
        });
        setPermissions(defaultPermissionsForAccess("BOTH"));
      }
      setErrors({});
    }
  }, [isOpen, designation, roles]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Designation name is required";
    }

    if (!formData.roleId) {
      newErrors.roleId = "Role is required";
    }

    if (permissions.length === 0) {
      newErrors.permissions = "Select at least one permission";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleAccessChange(access: AccessLevel) {
    setFormData({ ...formData, access });
    setPermissions(defaultPermissionsForAccess(access as DesignationAccess));
  }

  function togglePermission(key: string) {
    setPermissions((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  }

  const mergedPermissionOptions = [
    ...permissionOptions,
    ...permissions
      .filter((key) => !permissionOptions.some((option) => option.key === key))
      .map((key) => ({ key, name: key })),
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validate()) return;

    if (isEdit && designation) {
      await onSubmit({
        id: designation.id,
        name: formData.name.trim(),
        roleId: formData.roleId,
        access: formData.access,
        permissions,
      } as UpdateDesignationDto);
    } else {
      await onSubmit({
        projectId,
        name: formData.name.trim(),
        externalCode: formData.name.trim(),
        roleId: formData.roleId,
        access: formData.access,
        permissions,
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
                handleAccessChange(e.target.value as AccessLevel)
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

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--orca-text)]">
              Permissions <span className="text-[var(--orca-brand-4)]">*</span>
            </label>
            <div className="max-h-56 overflow-auto rounded-lg border border-[var(--orca-border)] p-2">
              {mergedPermissionOptions.length === 0 ? (
                <p className="p-2 text-xs text-[var(--orca-text-3)]">
                  No permission options found.
                </p>
              ) : (
                mergedPermissionOptions.map((option) => (
                  <label
                    key={option.key}
                    className="flex cursor-pointer items-start gap-2 rounded-md p-2 text-sm hover:bg-[var(--orca-surface-2)]"
                  >
                    <input
                      type="checkbox"
                      checked={permissions.includes(option.key)}
                      onChange={() => togglePermission(option.key)}
                      disabled={isLoading}
                      className="mt-1"
                    />
                    <span>
                      <span className="block font-medium text-[var(--orca-text)]">
                        {option.name}
                      </span>
                      <span className="block text-xs text-[var(--orca-text-3)]">
                        {option.key}
                      </span>
                    </span>
                  </label>
                ))
              )}
            </div>
            {errors.permissions ? (
              <p className="mt-1 text-xs text-[var(--orca-brand-4)]">
                {errors.permissions}
              </p>
            ) : (
              <p className="mt-1 text-xs text-[var(--orca-text-3)]">
                {permissions.length} permission
                {permissions.length !== 1 ? "s" : ""} selected.
              </p>
            )}
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
