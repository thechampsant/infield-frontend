"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Building2,
  Download,
  Eye,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/pill";
import { Badge } from "@/components/ui/pill";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AccountFormModal } from "@/components/accounts/account-form-modal";
import { AccountDetailsModal } from "@/components/accounts/account-details-modal";
import { getAdminApi } from "@/lib/api";
import { exportToCsv } from "@/lib/utils/export-csv";
import type {
  Account,
  CreateAccountDto,
  Paginated,
  UpdateAccountDto,
} from "@/lib/api/types";
import { cn } from "@/lib/utils/cn";

export default function AccountsPage() {
  // State
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Inactive">("All");

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch accounts
  const fetchAccounts = useCallback(async (page: number, pageSize: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const api = getAdminApi();
      const response: Paginated<Account> = await api.listAccounts({
        page,
        pageSize,
      });

      setAccounts(response.items);
      setPagination({
        page: response.page,
        pageSize: response.pageSize,
        total: response.total,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch accounts");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts(1, 10);
  }, [fetchAccounts]);

  // CRUD handlers
  async function handleCreateOrUpdate(data: CreateAccountDto | UpdateAccountDto) {
    setIsSubmitting(true);
    try {
      const api = getAdminApi();
      if (selectedAccount) {
        await api.updateAccount(selectedAccount.id, data as UpdateAccountDto);
      } else {
        await api.createAccount(data as CreateAccountDto);
      }
      setIsFormModalOpen(false);
      setSelectedAccount(null);
      fetchAccounts(pagination.page, pagination.pageSize);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!selectedAccount) return;
    setIsSubmitting(true);
    try {
      const api = getAdminApi();
      await api.deleteAccount(selectedAccount.id);
      setIsDeleteDialogOpen(false);
      setSelectedAccount(null);
      fetchAccounts(pagination.page, pagination.pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete account");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleExport() {
    exportToCsv({
      data: filteredAccounts,
      columns: [
        { key: "name", header: "Account Name" },
        { key: "code", header: "Account Code" },
        { key: "primaryAdminEmail", header: "Admin Email" },
        { key: "projectsActiveCount", header: "Active Projects" },
        { key: "status", header: "Status" },
        { key: "createdAtIso", header: "Created Date" },
      ],
      filename: "accounts_export",
    });
  }

  // Filter accounts
  const filteredAccounts = accounts.filter((a) => {
    const matchesSearch =
      !searchQuery ||
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.primaryAdminEmail.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const startItem = (pagination.page - 1) * pagination.pageSize + 1;
  const endItem = Math.min(pagination.page * pagination.pageSize, pagination.total);
  const totalPages = Math.ceil(pagination.total / pagination.pageSize);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts"
        description="Manage all organizational accounts"
        actions={
          <>
            <Button variant="secondary" onClick={handleExport}>
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button variant="secondary" disabled>
              <Upload className="h-4 w-4" />
              Bulk Upload
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setSelectedAccount(null);
                setIsFormModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Create Account
            </Button>
          </>
        }
      />

      {error && (
        <div className="rounded-lg border border-[var(--orca-brand-4)]/30 bg-[var(--orca-brand-4-light)] px-4 py-3 text-sm text-[var(--orca-brand-4)]">
          {error}
          <button
            onClick={() => fetchAccounts(pagination.page, pagination.pageSize)}
            className="ml-2 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-[var(--orca-border)] bg-[var(--orca-surface)]">
        <div className="flex flex-col gap-4 border-b border-[var(--orca-border)] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Input
                placeholder="Search accounts..."
                className="w-[240px] pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <svg
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--orca-text-3)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "All" | "Active" | "Inactive")}
              className="h-9 rounded-lg border border-[var(--orca-border)] bg-[var(--orca-surface)] px-3 text-sm text-[var(--orca-text)]"
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div className="text-sm text-[var(--orca-text-3)]">
            {filteredAccounts.length} accounts
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--orca-border)]">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--orca-text-3)]">
                  Account Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--orca-text-3)]">
                  Account Code
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--orca-text-3)]">
                  Projects
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--orca-text-3)]">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--orca-text-3)]">
                  Created
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--orca-text-3)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr key="loading">
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--orca-surface-3)] border-t-[var(--orca-brand)]" />
                      <span className="text-sm text-[var(--orca-text-3)]">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredAccounts.length === 0 ? (
                <tr key="empty">
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-[var(--orca-text-3)]">
                    No accounts found
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((account, index) => (
                  <tr
                    key={account.id || `account-${index}`}
                    className="border-b border-[var(--orca-border-light)] last:border-b-0 hover:bg-[var(--orca-surface-2)] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--orca-brand-4-light)] text-[var(--orca-brand-4)]">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-medium text-[var(--orca-text)]">{account.name}</div>
                          <div className="text-xs text-[var(--orca-text-3)]">{account.primaryAdminEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-[var(--orca-text-2)]">{account.code}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="blue">{account.projectsActiveCount} Projects</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={account.status === "Active" ? "active" : "inactive"} />
                    </td>
                    <td className="px-4 py-3 text-[var(--orca-text-2)]">
                      {new Date(account.createdAtIso).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <ActionButton
                          icon={Eye}
                          label="View"
                          onClick={() => {
                            setSelectedAccount(account);
                            setIsDetailsModalOpen(true);
                          }}
                        />
                        <ActionButton
                          icon={Pencil}
                          label="Edit"
                          onClick={() => {
                            setSelectedAccount(account);
                            setIsFormModalOpen(true);
                          }}
                        />
                        <ActionButton
                          icon={Trash2}
                          label="Delete"
                          variant="danger"
                          onClick={() => {
                            setSelectedAccount(account);
                            setIsDeleteDialogOpen(true);
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-[var(--orca-border)] px-5 py-4 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-[var(--orca-text-3)]">
            <span>Show</span>
            <select
              value={pagination.pageSize}
              onChange={(e) => fetchAccounts(1, Number(e.target.value))}
              className="h-8 rounded-lg border border-[var(--orca-border)] bg-[var(--orca-surface)] px-2 text-sm text-[var(--orca-text)]"
            >
              {[10, 25, 50].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <span>entries</span>
          </div>
          <div className="text-sm text-[var(--orca-text-3)]">
            Showing {pagination.total > 0 ? startItem : 0} to {endItem} of {pagination.total}
          </div>
          <div className="flex items-center gap-1">
            <PaginationBtn disabled={pagination.page <= 1} onClick={() => fetchAccounts(pagination.page - 1, pagination.pageSize)}>
              Previous
            </PaginationBtn>
            {Array.from({ length: Math.min(3, totalPages) }, (_, i) => i + 1).map((num) => (
              <PaginationBtn key={num} active={pagination.page === num} onClick={() => fetchAccounts(num, pagination.pageSize)}>
                {num}
              </PaginationBtn>
            ))}
            <PaginationBtn disabled={pagination.page >= totalPages} onClick={() => fetchAccounts(pagination.page + 1, pagination.pageSize)}>
              Next
            </PaginationBtn>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AccountFormModal
        isOpen={isFormModalOpen}
        onClose={() => { setIsFormModalOpen(false); setSelectedAccount(null); }}
        onSubmit={handleCreateOrUpdate}
        account={selectedAccount}
        isLoading={isSubmitting}
      />
      <AccountDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => { setIsDetailsModalOpen(false); setSelectedAccount(null); }}
        account={selectedAccount}
        onEdit={() => { setIsDetailsModalOpen(false); setIsFormModalOpen(true); }}
      />
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => { setIsDeleteDialogOpen(false); setSelectedAccount(null); }}
        onConfirm={handleDelete}
        title="Delete Account"
        message={`Are you sure you want to delete "${selectedAccount?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={isSubmitting}
      />
    </div>
  );
}

function ActionButton({ icon: Icon, label, variant = "default", onClick }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  variant?: "default" | "danger";
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
        variant === "default" && "text-[var(--orca-text-3)] hover:bg-[var(--orca-surface-2)] hover:text-[var(--orca-text)]",
        variant === "danger" && "text-[var(--orca-text-3)] hover:bg-[var(--orca-brand-4-light)] hover:text-[var(--orca-brand-4)]"
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function PaginationBtn({ children, active, disabled, onClick }: {
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors",
        active ? "bg-[var(--orca-brand)] text-white" : "text-[var(--orca-text-2)] hover:bg-[var(--orca-surface-2)]",
        disabled && "pointer-events-none opacity-50"
      )}
    >
      {children}
    </button>
  );
}

