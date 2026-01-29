"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Building2,
  Download,
  Eye,
  Folder,
  Pencil,
  Plus,
  Shield,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/pill";
import { Badge } from "@/components/ui/pill";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RoleFormModal, RoleDetailsModal } from "@/components/roles";
import { getAdminApi, getRoleDesignationApi } from "@/lib/api";
import { exportToCsv } from "@/lib/utils/export-csv";
import type {
  Account,
  Project,
  Role,
  CreateRoleDto,
  UpdateRoleDto,
} from "@/lib/api/types";
import { cn } from "@/lib/utils/cn";

export default function SuperAdminRolesPage() {
  // State
  const [roles, setRoles] = useState<Role[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedAccountCode, setSelectedAccountCode] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch accounts
  const fetchAccounts = useCallback(async () => {
    try {
      const api = getAdminApi();
      const response = await api.listAccounts({ pageSize: 100 });
      setAccounts(response.items);
      if (response.items.length > 0 && !selectedAccountCode) {
        setSelectedAccountCode(response.items[0].code);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch accounts");
    }
  }, [selectedAccountCode]);

  // Fetch projects for selected account
  const fetchProjects = useCallback(async (accountCode: string) => {
    if (!accountCode) return;
    try {
      const api = getAdminApi();
      const response = await api.listProjects(accountCode, { pageSize: 100 });
      setProjects(response.items);
      if (response.items.length > 0) {
        setSelectedProjectId(response.items[0].id);
      } else {
        setSelectedProjectId("");
        setRoles([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch projects");
      setProjects([]);
      setSelectedProjectId("");
    }
  }, []);

  // Fetch roles for selected project
  const fetchRoles = useCallback(async (projectId: string) => {
    if (!projectId) {
      setRoles([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const api = getRoleDesignationApi();
      const response = await api.getRolesByProject(projectId);
      setRoles(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch roles");
      setRoles([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    if (selectedAccountCode) {
      fetchProjects(selectedAccountCode);
    }
  }, [selectedAccountCode, fetchProjects]);

  useEffect(() => {
    if (selectedProjectId) {
      fetchRoles(selectedProjectId);
    }
  }, [selectedProjectId, fetchRoles]);

  // Get selected objects
  const selectedAccount = accounts.find((a) => a.code === selectedAccountCode);
  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // CRUD handlers
  async function handleCreateOrUpdate(data: CreateRoleDto | UpdateRoleDto) {
    setIsSubmitting(true);
    try {
      const api = getRoleDesignationApi();
      if (selectedRole) {
        await api.updateRoles([data as UpdateRoleDto]);
      } else {
        await api.createRoles([data as CreateRoleDto]);
      }
      setIsFormModalOpen(false);
      setSelectedRole(null);
      if (selectedProjectId) {
        fetchRoles(selectedProjectId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save role");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!selectedRole) return;
    setIsSubmitting(true);
    try {
      const api = getRoleDesignationApi();
      await api.deleteRoles([selectedRole.id]);
      setIsDeleteDialogOpen(false);
      setSelectedRole(null);
      if (selectedProjectId) {
        fetchRoles(selectedProjectId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete role");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleExport() {
    exportToCsv({
      data: filteredRoles,
      columns: [
        { key: "roleName", header: "Role Name" },
        { key: "level", header: "Level" },
        { key: "isActive", header: "Status" },
        { key: "createdAt", header: "Created Date" },
      ],
      filename: `roles_${selectedProject?.code || "export"}`,
    });
  }

  // Filter roles
  const filteredRoles = roles.filter((r) => {
    const matchesSearch =
      !searchQuery ||
      r.roleName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles"
        description="Manage roles across all projects"
        actions={
          <>
            <Button variant="secondary" onClick={handleExport} disabled={roles.length === 0}>
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setSelectedRole(null);
                setIsFormModalOpen(true);
              }}
              disabled={!selectedProjectId}
            >
              <Plus className="h-4 w-4" />
              Create Role
            </Button>
          </>
        }
      />

      {error && (
        <div className="rounded-lg border border-[var(--orca-brand-4)]/30 bg-[var(--orca-brand-4-light)] px-4 py-3 text-sm text-[var(--orca-brand-4)]">
          {error}
          <button
            onClick={() => selectedProjectId && fetchRoles(selectedProjectId)}
            className="ml-2 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Account & Project Selector */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-[var(--orca-border)] bg-[var(--orca-surface)] p-4">
        <div className="flex items-center gap-3">
          <Building2 className="h-5 w-5 text-[var(--orca-text-3)]" />
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--orca-text-3)]">
              Account
            </label>
            <select
              value={selectedAccountCode}
              onChange={(e) => setSelectedAccountCode(e.target.value)}
              className="h-9 w-48 rounded-lg border border-[var(--orca-border)] bg-[var(--orca-surface)] px-3 text-sm text-[var(--orca-text)]"
            >
              {accounts.length === 0 ? (
                <option value="">No accounts</option>
              ) : (
                accounts.map((account) => (
                  <option key={account.id || account.code} value={account.code}>
                    {account.name}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Folder className="h-5 w-5 text-[var(--orca-text-3)]" />
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--orca-text-3)]">
              Project
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              disabled={projects.length === 0}
              className="h-9 w-48 rounded-lg border border-[var(--orca-border)] bg-[var(--orca-surface)] px-3 text-sm text-[var(--orca-text)] disabled:opacity-50"
            >
              {projects.length === 0 ? (
                <option value="">No projects</option>
              ) : (
                projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {selectedProject && (
          <div className="ml-auto text-right">
            <div className="text-sm font-medium text-[var(--orca-text)]">
              {roles.length} Roles
            </div>
            <div className="text-xs text-[var(--orca-text-3)]">
              in {selectedProject.name}
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[var(--orca-border)] bg-[var(--orca-surface)]">
        <div className="flex flex-col gap-4 border-b border-[var(--orca-border)] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Input
                placeholder="Search roles..."
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
          </div>
          <div className="text-sm text-[var(--orca-text-3)]">
            {filteredRoles.length} roles
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--orca-border)]">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--orca-text-3)]">
                  Role Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--orca-text-3)]">
                  Level
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--orca-text-3)]">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--orca-text-3)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr key="loading">
                  <td colSpan={4} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--orca-surface-3)] border-t-[var(--orca-brand)]" />
                      <span className="text-sm text-[var(--orca-text-3)]">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : !selectedProjectId ? (
                <tr key="no-project">
                  <td colSpan={4} className="px-4 py-12 text-center text-sm text-[var(--orca-text-3)]">
                    Please select an account and project to view roles
                  </td>
                </tr>
              ) : filteredRoles.length === 0 ? (
                <tr key="empty">
                  <td colSpan={4} className="px-4 py-12 text-center text-sm text-[var(--orca-text-3)]">
                    {searchQuery ? "No roles found matching your search" : "No roles created yet"}
                  </td>
                </tr>
              ) : (
                filteredRoles.map((role, index) => (
                  <tr
                    key={role.id || `role-${index}`}
                    className="border-b border-[var(--orca-border-light)] last:border-b-0 hover:bg-[var(--orca-surface-2)] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--orca-brand-light)] text-[var(--orca-brand)]">
                          <Shield className="h-4 w-4" />
                        </div>
                        <div className="font-medium text-[var(--orca-text)]">{role.roleName}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="blue">Level {role.level}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={role.isActive ? "active" : "inactive"} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <ActionButton
                          icon={Eye}
                          label="View"
                          onClick={() => {
                            setSelectedRole(role);
                            setIsDetailsModalOpen(true);
                          }}
                        />
                        <ActionButton
                          icon={Pencil}
                          label="Edit"
                          onClick={() => {
                            setSelectedRole(role);
                            setIsFormModalOpen(true);
                          }}
                        />
                        <ActionButton
                          icon={Trash2}
                          label="Delete"
                          variant="danger"
                          onClick={() => {
                            setSelectedRole(role);
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
      </div>

      {/* Modals */}
      {selectedProjectId && (
        <RoleFormModal
          isOpen={isFormModalOpen}
          onClose={() => { setIsFormModalOpen(false); setSelectedRole(null); }}
          onSubmit={handleCreateOrUpdate}
          role={selectedRole}
          projectId={selectedProjectId}
          isLoading={isSubmitting}
        />
      )}
      <RoleDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => { setIsDetailsModalOpen(false); setSelectedRole(null); }}
        role={selectedRole}
        onEdit={() => { setIsDetailsModalOpen(false); setIsFormModalOpen(true); }}
      />
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => { setIsDeleteDialogOpen(false); setSelectedRole(null); }}
        onConfirm={handleDelete}
        title="Delete Role"
        message={`Are you sure you want to delete "${selectedRole?.roleName}"? This action cannot be undone.`}
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
