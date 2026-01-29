"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BadgeCheck,
  Building2,
  Download,
  Eye,
  Folder,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/pill";
import { Badge } from "@/components/ui/pill";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DesignationFormModal, DesignationDetailsModal } from "@/components/designations";
import { getAdminApi, getRoleDesignationApi } from "@/lib/api";
import { exportToCsv } from "@/lib/utils/export-csv";
import type {
  Account,
  Project,
  Role,
  Designation,
  CreateDesignationDto,
  UpdateDesignationDto,
} from "@/lib/api/types";
import { cn } from "@/lib/utils/cn";

export default function SuperAdminDesignationsPage() {
  // State
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedAccountCode, setSelectedAccountCode] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [accessFilter, setAccessFilter] = useState<"All" | "WEB" | "MOBILE" | "BOTH">("All");

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDesignation, setSelectedDesignation] = useState<Designation | null>(null);
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
        setDesignations([]);
        setRoles([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch projects");
      setProjects([]);
      setSelectedProjectId("");
    }
  }, []);

  // Fetch designations and roles for selected project
  const fetchData = useCallback(async (projectId: string) => {
    if (!projectId) {
      setDesignations([]);
      setRoles([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const api = getRoleDesignationApi();
      const [rolesResponse, designationsResponse] = await Promise.all([
        api.getRolesByProject(projectId),
        api.getDesignationsByProject(projectId),
      ]);
      setRoles(rolesResponse);
      
      // Enrich designations with role names
      const enrichedDesignations = designationsResponse.map((des) => {
        const role = rolesResponse.find((r) => r.id === des.roleId);
        return {
          ...des,
          roleName: role?.roleName || des.roleName || "Unknown",
        };
      });
      setDesignations(enrichedDesignations);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
      setDesignations([]);
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
      fetchData(selectedProjectId);
    }
  }, [selectedProjectId, fetchData]);

  // Get selected objects
  const selectedAccount = accounts.find((a) => a.code === selectedAccountCode);
  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // CRUD handlers
  async function handleCreateOrUpdate(data: CreateDesignationDto | UpdateDesignationDto) {
    setIsSubmitting(true);
    try {
      const api = getRoleDesignationApi();
      if (selectedDesignation) {
        await api.updateDesignations([data as UpdateDesignationDto]);
      } else {
        await api.createDesignations([data as CreateDesignationDto]);
      }
      setIsFormModalOpen(false);
      setSelectedDesignation(null);
      if (selectedProjectId) {
        fetchData(selectedProjectId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save designation");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!selectedDesignation) return;
    setIsSubmitting(true);
    try {
      const api = getRoleDesignationApi();
      await api.deleteDesignations([selectedDesignation.id]);
      setIsDeleteDialogOpen(false);
      setSelectedDesignation(null);
      if (selectedProjectId) {
        fetchData(selectedProjectId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete designation");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleExport() {
    exportToCsv({
      data: filteredDesignations.map((d) => ({
        ...d,
        roleName: roles.find((r) => r.id === d.roleId)?.roleName || d.roleName || "Unknown",
      })),
      columns: [
        { key: "name", header: "Designation Name" },
        { key: "roleName", header: "Role" },
        { key: "access", header: "Access Level" },
        { key: "isActive", header: "Status" },
        { key: "createdAt", header: "Created Date" },
      ],
      filename: `designations_${selectedProject?.code || "export"}`,
    });
  }

  // Filter designations
  const filteredDesignations = designations.filter((d) => {
    const matchesSearch =
      !searchQuery ||
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.roleName && d.roleName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesAccess = accessFilter === "All" || d.access === accessFilter;
    return matchesSearch && matchesAccess;
  });

  // Access level display mapping
  const accessLabels: Record<string, { label: string; variant: "blue" | "green" | "amber" }> = {
    WEB: { label: "Web", variant: "blue" },
    MOBILE: { label: "Mobile", variant: "amber" },
    BOTH: { label: "Both", variant: "green" },
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Designations"
        description="Manage designations across all projects"
        actions={
          <>
            <Button variant="secondary" onClick={handleExport} disabled={designations.length === 0}>
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setSelectedDesignation(null);
                setIsFormModalOpen(true);
              }}
              disabled={!selectedProjectId || roles.length === 0}
            >
              <Plus className="h-4 w-4" />
              Create Designation
            </Button>
          </>
        }
      />

      {error && (
        <div className="rounded-lg border border-[var(--orca-brand-4)]/30 bg-[var(--orca-brand-4-light)] px-4 py-3 text-sm text-[var(--orca-brand-4)]">
          {error}
          <button
            onClick={() => selectedProjectId && fetchData(selectedProjectId)}
            className="ml-2 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {roles.length === 0 && selectedProjectId && !isLoading && (
        <div className="rounded-lg border border-[var(--orca-brand)]/30 bg-[var(--orca-brand-light)] px-4 py-3 text-sm text-[var(--orca-brand)]">
          No roles found for this project. Please create roles first before adding designations.
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
              {designations.length} Designations
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
                placeholder="Search designations..."
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
              value={accessFilter}
              onChange={(e) => setAccessFilter(e.target.value as "All" | "WEB" | "MOBILE" | "BOTH")}
              className="h-9 rounded-lg border border-[var(--orca-border)] bg-[var(--orca-surface)] px-3 text-sm text-[var(--orca-text)]"
            >
              <option value="All">All Access</option>
              <option value="WEB">Web Only</option>
              <option value="MOBILE">Mobile Only</option>
              <option value="BOTH">Both</option>
            </select>
          </div>
          <div className="text-sm text-[var(--orca-text-3)]">
            {filteredDesignations.length} designations
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--orca-border)]">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--orca-text-3)]">
                  Designation
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--orca-text-3)]">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--orca-text-3)]">
                  Access
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
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--orca-surface-3)] border-t-[var(--orca-brand)]" />
                      <span className="text-sm text-[var(--orca-text-3)]">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : !selectedProjectId ? (
                <tr key="no-project">
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-[var(--orca-text-3)]">
                    Please select an account and project to view designations
                  </td>
                </tr>
              ) : filteredDesignations.length === 0 ? (
                <tr key="empty">
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-[var(--orca-text-3)]">
                    {searchQuery || accessFilter !== "All"
                      ? "No designations found matching your filters"
                      : "No designations created yet"}
                  </td>
                </tr>
              ) : (
                filteredDesignations.map((designation, index) => (
                  <tr
                    key={designation.id || `designation-${index}`}
                    className="border-b border-[var(--orca-border-light)] last:border-b-0 hover:bg-[var(--orca-surface-2)] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--orca-brand-2-light)] text-[var(--orca-brand-2)]">
                          <BadgeCheck className="h-4 w-4" />
                        </div>
                        <div className="font-medium text-[var(--orca-text)]">{designation.name}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[var(--orca-text-2)]">
                        {designation.roleName || "Unknown"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={accessLabels[designation.access]?.variant || "blue"}>
                        {accessLabels[designation.access]?.label || designation.access}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={designation.isActive ? "active" : "inactive"} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <ActionButton
                          icon={Eye}
                          label="View"
                          onClick={() => {
                            setSelectedDesignation(designation);
                            setIsDetailsModalOpen(true);
                          }}
                        />
                        <ActionButton
                          icon={Pencil}
                          label="Edit"
                          onClick={() => {
                            setSelectedDesignation(designation);
                            setIsFormModalOpen(true);
                          }}
                        />
                        <ActionButton
                          icon={Trash2}
                          label="Delete"
                          variant="danger"
                          onClick={() => {
                            setSelectedDesignation(designation);
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
        <DesignationFormModal
          isOpen={isFormModalOpen}
          onClose={() => { setIsFormModalOpen(false); setSelectedDesignation(null); }}
          onSubmit={handleCreateOrUpdate}
          designation={selectedDesignation}
          projectId={selectedProjectId}
          roles={roles}
          isLoading={isSubmitting}
        />
      )}
      <DesignationDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => { setIsDetailsModalOpen(false); setSelectedDesignation(null); }}
        designation={selectedDesignation}
        roles={roles}
        onEdit={() => { setIsDetailsModalOpen(false); setIsFormModalOpen(true); }}
      />
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => { setIsDeleteDialogOpen(false); setSelectedDesignation(null); }}
        onConfirm={handleDelete}
        title="Delete Designation"
        message={`Are you sure you want to delete "${selectedDesignation?.name}"? This action cannot be undone.`}
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
