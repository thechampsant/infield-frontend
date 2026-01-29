"use client";

import { useState, useEffect } from "react";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Role, CreateRoleDto, UpdateRoleDto } from "@/lib/api/types";

interface RoleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateRoleDto | UpdateRoleDto) => Promise<void>;
  role?: Role | null;
  projectId: string;
  isLoading?: boolean;
}

export function RoleFormModal({
  isOpen,
  onClose,
  onSubmit,
  role,
  projectId,
  isLoading = false,
}: RoleFormModalProps) {
  const isEdit = !!role;

  const [formData, setFormData] = useState({
    roleName: "",
    level: 1,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens/closes or role changes
  useEffect(() => {
    if (isOpen) {
      if (role) {
        setFormData({
          roleName: role.roleName,
          level: role.level,
        });
      } else {
        setFormData({
          roleName: "",
          level: 1,
        });
      }
      setErrors({});
    }
  }, [isOpen, role]);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!formData.roleName.trim()) {
      newErrors.roleName = "Role name is required";
    }

    if (formData.level < 1 || formData.level > 100) {
      newErrors.level = "Level must be between 1 and 100";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validate()) return;

    if (isEdit && role) {
      await onSubmit({
        id: role.id,
        roleName: formData.roleName.trim(),
        level: formData.level,
      } as UpdateRoleDto);
    } else {
      await onSubmit({
        projectId,
        roleName: formData.roleName.trim(),
        level: formData.level,
      } as CreateRoleDto);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Role" : "Create Role"}
      description={
        isEdit
          ? "Update the role information below."
          : "Fill in the details to create a new role."
      }
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {/* Role Name */}
          <div>
            <label
              htmlFor="roleName"
              className="mb-1.5 block text-sm font-medium text-[var(--orca-text)]"
            >
              Role Name <span className="text-[var(--orca-brand-4)]">*</span>
            </label>
            <Input
              id="roleName"
              type="text"
              placeholder="e.g., SuperAdmin, Manager, Viewer"
              value={formData.roleName}
              onChange={(e) =>
                setFormData({ ...formData, roleName: e.target.value })
              }
              disabled={isLoading}
              className={errors.roleName ? "border-[var(--orca-brand-4)]" : ""}
            />
            {errors.roleName && (
              <p className="mt-1 text-xs text-[var(--orca-brand-4)]">
                {errors.roleName}
              </p>
            )}
          </div>

          {/* Role Level */}
          <div>
            <label
              htmlFor="level"
              className="mb-1.5 block text-sm font-medium text-[var(--orca-text)]"
            >
              Level <span className="text-[var(--orca-brand-4)]">*</span>
            </label>
            <Input
              id="level"
              type="number"
              min={1}
              max={100}
              placeholder="e.g., 1"
              value={formData.level}
              onChange={(e) =>
                setFormData({ ...formData, level: parseInt(e.target.value) || 1 })
              }
              disabled={isLoading}
              className={errors.level ? "border-[var(--orca-brand-4)]" : ""}
            />
            <p className="mt-1 text-xs text-[var(--orca-text-3)]">
              Lower numbers indicate higher authority (e.g., 1 = highest)
            </p>
            {errors.level && (
              <p className="mt-1 text-xs text-[var(--orca-brand-4)]">
                {errors.level}
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
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                {isEdit ? "Saving..." : "Creating..."}
              </>
            ) : isEdit ? (
              "Save Changes"
            ) : (
              "Create Role"
            )}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
