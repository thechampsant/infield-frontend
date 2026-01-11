"use client";

import { useState, useEffect } from "react";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  Account,
  Project,
  CreateProjectDto,
  UpdateProjectDto,
} from "@/lib/api/types";

interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProjectDto | UpdateProjectDto) => Promise<void>;
  project?: Project | null;
  accounts?: Account[];
  selectedAccountId?: string;
  isLoading?: boolean;
}

export function ProjectFormModal({
  isOpen,
  onClose,
  onSubmit,
  project,
  accounts = [],
  selectedAccountId,
  isLoading = false,
}: ProjectFormModalProps) {
  const isEdit = !!project;

  const [formData, setFormData] = useState({
    accountId: "",
    projectName: "",
    email: "",
    status: "ACTIVE" as "ACTIVE" | "INACTIVE",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (project) {
        // Find accountId from accounts list based on accountCode
        const account = accounts.find((a) => a.code === project.accountCode);
        setFormData({
          accountId: account?.id || selectedAccountId || "",
          projectName: project.name,
          email: project.projectAdminEmail,
          status: project.status === "Active" ? "ACTIVE" : "INACTIVE",
        });
      } else {
        setFormData({
          accountId: selectedAccountId || (accounts[0]?.id || ""),
          projectName: "",
          email: "",
          status: "ACTIVE",
        });
      }
      setErrors({});
    }
  }, [isOpen, project, accounts, selectedAccountId]);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!isEdit && !formData.accountId) {
      newErrors.accountId = "Please select an account";
    }

    if (!formData.projectName.trim()) {
      newErrors.projectName = "Project name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validate()) return;

    if (isEdit) {
      await onSubmit({
        projectName: formData.projectName.trim(),
        email: formData.email.trim(),
        status: formData.status,
      } as UpdateProjectDto);
    } else {
      await onSubmit({
        accountId: formData.accountId,
        projectName: formData.projectName.trim(),
        email: formData.email.trim(),
        status: formData.status,
      } as CreateProjectDto);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Project" : "Create Project"}
      description={
        isEdit
          ? "Update the project information below."
          : "Fill in the details to create a new project."
      }
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {/* Account Selector (only for create) */}
          {!isEdit && (
            <div>
              <label
                htmlFor="accountId"
                className="mb-1.5 block text-sm font-medium text-[var(--orca-text)]"
              >
                Account <span className="text-[var(--orca-brand-4)]">*</span>
              </label>
              <select
                id="accountId"
                value={formData.accountId}
                onChange={(e) =>
                  setFormData({ ...formData, accountId: e.target.value })
                }
                disabled={isLoading || !!selectedAccountId}
                className={`flex h-9 w-full rounded-lg border bg-[var(--orca-surface)] px-3 text-sm text-[var(--orca-text)] transition-colors focus:border-[var(--orca-brand)] focus:outline-none focus:ring-2 focus:ring-[var(--orca-brand)]/20 disabled:cursor-not-allowed disabled:opacity-60 ${
                  errors.accountId
                    ? "border-[var(--orca-brand-4)]"
                    : "border-[var(--orca-border)]"
                }`}
              >
                <option value="">Select an account...</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.code})
                  </option>
                ))}
              </select>
              {errors.accountId && (
                <p className="mt-1 text-xs text-[var(--orca-brand-4)]">
                  {errors.accountId}
                </p>
              )}
            </div>
          )}

          {/* Project Name */}
          <div>
            <label
              htmlFor="projectName"
              className="mb-1.5 block text-sm font-medium text-[var(--orca-text)]"
            >
              Project Name <span className="text-[var(--orca-brand-4)]">*</span>
            </label>
            <Input
              id="projectName"
              type="text"
              placeholder="e.g., Mumbai Operations"
              value={formData.projectName}
              onChange={(e) =>
                setFormData({ ...formData, projectName: e.target.value })
              }
              disabled={isLoading}
              className={errors.projectName ? "border-[var(--orca-brand-4)]" : ""}
            />
            {errors.projectName && (
              <p className="mt-1 text-xs text-[var(--orca-brand-4)]">
                {errors.projectName}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-[var(--orca-text)]"
            >
              Project Admin Email{" "}
              <span className="text-[var(--orca-brand-4)]">*</span>
            </label>
            <Input
              id="email"
              type="email"
              placeholder="e.g., admin@project.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              disabled={isLoading}
              className={errors.email ? "border-[var(--orca-brand-4)]" : ""}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-[var(--orca-brand-4)]">
                {errors.email}
              </p>
            )}
          </div>

          {/* Status */}
          <div>
            <label
              htmlFor="status"
              className="mb-1.5 block text-sm font-medium text-[var(--orca-text)]"
            >
              Status
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  status: e.target.value as "ACTIVE" | "INACTIVE",
                })
              }
              disabled={isLoading}
              className="flex h-9 w-full rounded-lg border border-[var(--orca-border)] bg-[var(--orca-surface)] px-3 text-sm text-[var(--orca-text)] transition-colors focus:border-[var(--orca-brand)] focus:outline-none focus:ring-2 focus:ring-[var(--orca-brand)]/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
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
              "Create Project"
            )}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

