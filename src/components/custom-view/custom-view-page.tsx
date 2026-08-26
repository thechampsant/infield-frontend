"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, LayoutGrid } from "lucide-react";
import {
  customViewService,
  designationService,
  formatApiError,
  roleService,
  type BackendRole,
  type CustomViewConfiguration,
  type Designation,
} from "@/lib/api";
import type { PermissionOption } from "@/lib/api/designation-service";
import {
  accessForRole,
  permissionsForRole,
  type DesignationAccess,
} from "@/lib/designations/backend-roles";
import { If2Toast, type ToastState } from "@/components/accounts/if2-toast";
import {
  AddDesignationModal,
  type NewDesignationInput,
} from "@/components/designations/add-designation-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { projectAdminBase } from "@/lib/nav/nav";
import { DesignationPicker } from "./designation-picker";
import { DesignationViewsCard } from "./designation-views-card";
import { ViewManagementTable } from "./view-management-table";
import {
  configToDraft,
  createEmptyDraft,
  type DraftView,
} from "./view-editor";

interface Props {
  projectId: string;
  projectName: string;
  accountCode: string;
  projectCode: string;
}

export function CustomViewPage({
  projectId,
  projectName,
  accountCode,
  projectCode,
}: Props) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [roles, setRoles] = useState<BackendRole[]>([]);
  const [permissionOptions, setPermissionOptions] = useState<PermissionOption[]>([]);
  const [configs, setConfigs] = useState<CustomViewConfiguration[]>([]);
  const [draftsByDesignation, setDraftsByDesignation] = useState<
    Record<string, DraftView[]>
  >({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedViewId, setExpandedViewId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "paused" | "draft"
  >("all");
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<CustomViewConfiguration | null>(
    null,
  );
  const didAutoSelect = useRef(false);

  const roleById = useMemo(
    () => new Map(roles.map((role) => [role.id, role] as const)),
    [roles],
  );

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [designationResult, viewResult, roleList, permissionList] = await Promise.all([
        designationService.listByProject(projectId),
        customViewService.list(projectId).then(
          (views) => ({ views, error: null as string | null }),
          (err) => ({
            views: [] as CustomViewConfiguration[],
            error: formatApiError(err, "Failed to load Custom View configurations"),
          }),
        ),
        roleService.listByProject(projectId).catch(() => []),
        designationService.listPermissionOptions(projectId).catch(() => []),
      ]);

      setDesignations(designationResult);
      setConfigs(viewResult.views);
      setRoles(roleList);
      setPermissionOptions(permissionList);

      const grouped: Record<string, DraftView[]> = {};
      for (const view of viewResult.views) {
        if (!grouped[view.designationId]) grouped[view.designationId] = [];
        grouped[view.designationId].push(configToDraft(view));
      }
      setDraftsByDesignation((prev) => {
        const next = { ...grouped };
        for (const [designationId, drafts] of Object.entries(prev)) {
          const unsaved = drafts.filter((draft) => !draft.id);
          if (unsaved.length === 0) continue;
          next[designationId] = [...(next[designationId] || []), ...unsaved];
        }
        return next;
      });

      if (!didAutoSelect.current) {
        didAutoSelect.current = true;
        setSelectedIds(Object.keys(grouped));
      }

      if (viewResult.error) {
        setToast({ message: viewResult.error, type: "error" });
      }
    } catch (err) {
      setToast({ message: formatApiError(err, "Failed to load designations"), type: "error" });
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSelectionChange = useCallback((ids: string[]) => {
    setSelectedIds(ids);
    setDraftsByDesignation((prev) => {
      const next = { ...prev };
      for (const id of ids) {
        if (!next[id]) next[id] = [];
      }
      return next;
    });
  }, []);

  const handleChangeView = useCallback((designationId: string, localId: string, view: DraftView) => {
    setDraftsByDesignation((prev) => ({
      ...prev,
      [designationId]: (prev[designationId] || []).map((item) =>
        item.localId === localId ? view : item,
      ),
    }));
  }, []);

  const handleAddView = useCallback((designationId: string) => {
    const draft = createEmptyDraft();
    setDraftsByDesignation((prev) => ({
      ...prev,
      [designationId]: [...(prev[designationId] || []), draft],
    }));
    setExpandedViewId(draft.localId);
  }, []);

  const upsertSaved = useCallback((saved: CustomViewConfiguration, localId: string) => {
    setConfigs((prev) => {
      const index = prev.findIndex((item) => item.id === saved.id);
      if (index >= 0) {
        const next = [...prev];
        next[index] = saved;
        return next;
      }
      return [...prev, saved];
    });
    setDraftsByDesignation((prev) => {
      const list = prev[saved.designationId] || [];
      return {
        ...prev,
        [saved.designationId]: list.map((item) => {
          if (item.localId !== localId) return item;
          const next = configToDraft(saved);
          if (saved.latestPeriodMonth && saved.latestPeriodYear) return next;
          return { ...next, periodMonth: item.periodMonth, periodYear: item.periodYear };
        }),
      };
    });
    setExpandedViewId((current) => (current === localId ? saved.id : current));
  }, []);

  const handleSaved = useCallback((saved: CustomViewConfiguration, localId: string) => {
    upsertSaved(saved, localId);
    setToast({ message: "View saved", type: "success" });
  }, [upsertSaved]);

  const handleEdit = useCallback((view: CustomViewConfiguration) => {
    setSelectedIds((prev) =>
      prev.includes(view.designationId) ? prev : [...prev, view.designationId],
    );
    setDraftsByDesignation((prev) => {
      const list = prev[view.designationId] || [];
      if (list.some((item) => item.id === view.id)) return prev;
      return {
        ...prev,
        [view.designationId]: [...list, configToDraft(view)],
      };
    });
    setExpandedViewId(view.id);
  }, []);

  const handlePause = useCallback(
    async (view: CustomViewConfiguration) => {
      try {
        const saved = await customViewService.pause(projectId, view.id);
        upsertSaved(saved, view.id);
        setToast({ message: "View paused", type: "success" });
      } catch (err) {
        setToast({ message: formatApiError(err, "Failed to pause view"), type: "error" });
      }
    },
    [projectId, upsertSaved],
  );

  const handleResume = useCallback(
    async (view: CustomViewConfiguration) => {
      try {
        const saved = await customViewService.resume(projectId, view.id);
        upsertSaved(saved, view.id);
        setToast({ message: "View resumed", type: "success" });
      } catch (err) {
        setToast({ message: formatApiError(err, "Failed to resume view"), type: "error" });
      }
    },
    [projectId, upsertSaved],
  );

  const handleConfirmRemove = useCallback(async () => {
    if (!pendingRemove) return;
    setRemoving(true);
    try {
      await customViewService.remove(projectId, pendingRemove.id);
      setConfigs((prev) => prev.filter((item) => item.id !== pendingRemove.id));
      setDraftsByDesignation((prev) => ({
        ...prev,
        [pendingRemove.designationId]: (prev[pendingRemove.designationId] || []).filter(
          (item) => item.id !== pendingRemove.id,
        ),
      }));
      setExpandedViewId((current) => (current === pendingRemove.id ? null : current));
      setPendingRemove(null);
      setToast({ message: "View removed", type: "success" });
    } catch (err) {
      setToast({ message: formatApiError(err, "Failed to remove view"), type: "error" });
    } finally {
      setRemoving(false);
    }
  }, [pendingRemove, projectId]);

  const handleCreateDesignation = useCallback(
    async (items: NewDesignationInput[]) => {
      const payload = items.map((item) => {
        const role = roleById.get(item.roleId);
        const roleName = role?.roleName ?? "";
        const itemAccess = item.access as DesignationAccess | undefined;
        const access = itemAccess || accessForRole(roleName);
        return {
          projectId,
          name: item.name,
          externalCode: item.name,
          roleId: item.roleId,
          permissions: item.permissions?.length
            ? item.permissions
            : permissionsForRole(roleName),
          access,
        };
      });
      await designationService.create(payload);
      setAddOpen(false);
      setToast({
        message:
          items.length > 1
            ? `${items.length} designations created.`
            : "Designation created.",
        type: "success",
      });
      const previousIds = new Set(designations.map((item) => item.id));
      const nextDesignations = await designationService.listByProject(projectId);
      setDesignations(nextDesignations);
      const created = nextDesignations.filter((item) => !previousIds.has(item.id));
      if (created.length > 0) {
        setSelectedIds((prev) => [...prev, ...created.map((item) => item.id)]);
        setDraftsByDesignation((prev) => {
          const next = { ...prev };
          for (const item of created) {
            if (!next[item.id]) next[item.id] = [];
          }
          return next;
        });
      }
    },
    [projectId, roleById, designations],
  );

  const selectedDesignations = useMemo(
    () => designations.filter((item) => selectedIds.includes(item.id)),
    [designations, selectedIds],
  );

  const backHref = `${projectAdminBase(accountCode, projectCode)}/modules`;

  return (
    <div className="custom-view-page">
      <div className="pa-page-header">
        <div>
          <Link href={backHref} className="cv-back-link">
            <ArrowLeft size={14} />
            Back to Modules
          </Link>
          <div className="pa-eyebrow">Modules</div>
          <div className="pa-page-title">Custom View — {projectName}</div>
          <div className="pa-page-desc">
            Configure Excel-driven views per designation. Each view has its own
            month and year for template download and upload.
          </div>
        </div>
      </div>

      <div className="pa-info-banner">
        Config is one-time per view. Choose the Excel period inside each view;
        re-uploading that month replaces its rows. Pause hides a view from mobile;
        Remove permanently takes it off the catalog.
      </div>

      <section className="cv-section">
        <h2 className="cv-section-title">
          <LayoutGrid size={16} />
          Configure views
        </h2>
        <DesignationPicker
          designations={designations}
          selectedIds={selectedIds}
          onChange={handleSelectionChange}
          onAddNew={() => setAddOpen(true)}
        />
        {loading ? (
          <div className="cv-empty">Loading views…</div>
        ) : selectedDesignations.length === 0 ? (
          <div className="cv-empty">
            No designation selected. Choose one or more designations to configure
            views. Deselecting only hides the editor card.
          </div>
        ) : (
          selectedDesignations.map((designation) => (
            <DesignationViewsCard
              key={designation.id}
              designation={designation}
              views={draftsByDesignation[designation.id] || []}
              projectId={projectId}
              expandedViewId={expandedViewId}
              onToggleView={(localId) =>
                setExpandedViewId((current) => (current === localId ? null : localId))
              }
              onChangeView={(localId, view) =>
                handleChangeView(designation.id, localId, view)
              }
              onAddView={() => handleAddView(designation.id)}
              onSaved={handleSaved}
              onError={(message) => setToast({ message, type: "error" })}
            />
          ))
        )}
      </section>

      <section className="cv-section">
        <ViewManagementTable
          views={configs}
          designations={designations}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onEdit={handleEdit}
          onPause={handlePause}
          onResume={handleResume}
          onRemove={setPendingRemove}
        />
      </section>

      <ConfirmDialog
        isOpen={Boolean(pendingRemove)}
        onClose={() => !removing && setPendingRemove(null)}
        onConfirm={() => void handleConfirmRemove()}
        title="Remove view"
        message={
          pendingRemove
            ? `Remove "${pendingRemove.name}"? Field users will no longer see this view. This cannot be undone.`
            : ""
        }
        confirmLabel="Remove"
        variant="danger"
        isLoading={removing}
      />

      <AddDesignationModal
        isOpen={addOpen}
        roles={roles}
        permissionOptions={permissionOptions}
        onClose={() => setAddOpen(false)}
        onCreate={handleCreateDesignation}
      />

      <If2Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
