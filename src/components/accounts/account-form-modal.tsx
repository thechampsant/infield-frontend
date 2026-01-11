"use client";

import { useState, useEffect } from "react";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Account, CreateAccountDto, UpdateAccountDto } from "@/lib/api/types";

interface AccountFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateAccountDto | UpdateAccountDto) => Promise<void>;
  account?: Account | null; // If provided, we're editing
  isLoading?: boolean;
}

export function AccountFormModal({
  isOpen,
  onClose,
  onSubmit,
  account,
  isLoading = false,
}: AccountFormModalProps) {
  const isEdit = !!account;

  const [formData, setFormData] = useState({
    accountName: "",
    email: "",
    status: "ACTIVE" as "ACTIVE" | "INACTIVE",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens/closes or account changes
  useEffect(() => {
    if (isOpen) {
      if (account) {
        setFormData({
          accountName: account.name,
          email: account.primaryAdminEmail,
          status: account.status === "Active" ? "ACTIVE" : "INACTIVE",
        });
      } else {
        setFormData({
          accountName: "",
          email: "",
          status: "ACTIVE",
        });
      }
      setErrors({});
    }
  }, [isOpen, account]);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!formData.accountName.trim()) {
      newErrors.accountName = "Account name is required";
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

    await onSubmit({
      accountName: formData.accountName.trim(),
      email: formData.email.trim(),
      status: formData.status,
    });
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Account" : "Create Account"}
      description={
        isEdit
          ? "Update the account information below."
          : "Fill in the details to create a new account."
      }
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {/* Account Name */}
          <div>
            <label
              htmlFor="accountName"
              className="mb-1.5 block text-sm font-medium text-[var(--orca-text)]"
            >
              Account Name <span className="text-[var(--orca-brand-4)]">*</span>
            </label>
            <Input
              id="accountName"
              type="text"
              placeholder="e.g., Acme Corporation"
              value={formData.accountName}
              onChange={(e) =>
                setFormData({ ...formData, accountName: e.target.value })
              }
              disabled={isLoading}
              className={errors.accountName ? "border-[var(--orca-brand-4)]" : ""}
            />
            {errors.accountName && (
              <p className="mt-1 text-xs text-[var(--orca-brand-4)]">
                {errors.accountName}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-[var(--orca-text)]"
            >
              Admin Email <span className="text-[var(--orca-brand-4)]">*</span>
            </label>
            <Input
              id="email"
              type="email"
              placeholder="e.g., admin@acme.com"
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
              "Create Account"
            )}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

