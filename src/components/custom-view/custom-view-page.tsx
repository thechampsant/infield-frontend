"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, LayoutGrid } from "lucide-react";
import {
  customViewService,
  designationService,
  formatApiError,
  type CustomViewConfiguration,
  type Designation,
} from "@/lib/api";
import { If2Toast, type ToastState } from "@/components/accounts/if2-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { projectAdminBase } from "@/lib/nav/nav";
import { DesignationPicker } from "./designation-picker";
import { DesignationViewsCard } from "./designation-views-card";
import { ViewManagementTable } from "./view-management-table";
import {
  configToDraft,
  createEmptyDraft,
  currentIstPeriod,
  type DraftView,
} from "./view-editor";

const PAGE_SIZE = 20;

interface Props {
  projectId: string;
  projectName: string;
  accountCode: string;
  projectCode: string;
}

function draftToPendingConfig(
  designationId: string,
  view: DraftView,
): CustomViewConfiguration {
  return {
    id: view.id!,
    projectId: "",
    designationId,
    designationName: "",
    designationCode: "",
    name: view.name || "Untitled view",
    taggingLogic: view.taggingLogic,
    columnStructure: view.columnStructure,
    columnCount: view.columnStructure.length,
    status: view.status || "draft",
    latestPeriodMonth: view.periodMonth,
    latestPeriodYear: view.periodYear,
    latestFileName: view.latestFileName ?? null,
    latestFileSize: view.latestFileSize ?? null,
    latestRowCount: view.latestRowCount ?? 0,
    latestUploadedAt: null,
    updatedAt: null,
    createdAt: null,
  };
}

export function CustomViewPage({
  projectId,
  projectName,
  accountCode,
  projectCode,
}: Props) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [configs, setConfigs] = useState<CustomViewConfiguration[]>([]);
  const [tableViews, setTableViews] = useState<CustomViewConfiguration[]>([]);
  const [tableTotal, setTableTotal] = useState(0);
  const [tablePage, setTablePage] = useState(1);
  const [tableLoading, setTableLoading] = useState(false);
  const [draftsByDesignation, setDraftsByDesignation] = useState<
    Record<string, DraftView[]>
  >({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedViewId, setExpandedViewId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "paused" | "draft"
  >("all");
  const initialPeriod = currentIstPeriod();
  const [downloadMonth, setDownloadMonth] = useState(initialPeriod.month);
  const [downloadYear, setDownloadYear] = useState(initialPeriod.year);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<CustomViewConfiguration | null>(
    null,
  );
  const didAutoSelect = useRef(false);

  const yearOptions = useMemo(() => {
    const current = currentIstPeriod().year;
    return [...new Set([current - 2, current - 1, current, current + 1, downloadYear])].sort(
      (a, b) => a - b,
    );
  }, [downloadYear]);

  const loadTable = useCallback(async () => {
    if (!projectId) return;
    setTableLoading(true);
    try {
      const page = await customViewService.listPage(projectId, {
        page: tablePage,
        limit: PAGE_SIZE,
        status: statusFilter,
      });
      setTableViews(page.items);
      setTableTotal(page.total);
    } catch (err) {
      setToast({
        message: formatApiError(err, "Failed to load View Management"),
        type: "error",
      });
    } finally {
      setTableLoading(false);
    }
  }, [projectId, tablePage, statusFilter]);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [designationResult, viewResult] = await Promise.all([
        designationService.listByProject(projectId),
        customViewService.list(projectId).then(
          (views) => ({ views, error: null as string | null }),
          (err) => ({
            views: [] as CustomViewConfiguration[],
            error: formatApiError(err, "Failed to load Custom View configurations"),
          }),
        ),
      ]);

      setDesignations(designationResult);
      setConfigs(viewResult.views);

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

  useEffect(() => {
    void loadTable();
  }, [loadTable]);

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
    setTableViews((prev) => {
      const index = prev.findIndex((item) => item.id === saved.id);
      if (index >= 0) {
        const next = [...prev];
        next[index] = saved;
        return next;
      }
      return prev;
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
    void loadTable();
    setToast({ message: "View saved", type: "success" });
  }, [upsertSaved, loadTable]);

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
        void loadTable();
        setToast({ message: "View paused", type: "success" });
      } catch (err) {
        setToast({ message: formatApiError(err, "Failed to pause view"), type: "error" });
      }
    },
    [projectId, upsertSaved, loadTable],
  );

  const handleResume = useCallback(
    async (view: CustomViewConfiguration) => {
      try {
        const saved = await customViewService.resume(projectId, view.id);
        upsertSaved(saved, view.id);
        void loadTable();
        setToast({ message: "View resumed", type: "success" });
      } catch (err) {
        setToast({ message: formatApiError(err, "Failed to resume view"), type: "error" });
      }
    },
    [projectId, upsertSaved, loadTable],
  );

  const handleRemoveFromCard = useCallback(
    (designationId: string, view: DraftView) => {
      if (!view.id) {
        setDraftsByDesignation((prev) => ({
          ...prev,
          [designationId]: (prev[designationId] || []).filter(
            (item) => item.localId !== view.localId,
          ),
        }));
        setExpandedViewId((current) => (current === view.localId ? null : current));
        return;
      }
      const existing = configs.find((item) => item.id === view.id);
      setPendingRemove(existing || draftToPendingConfig(designationId, view));
    },
    [configs],
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
      setTableTotal((prev) => {
        const next = Math.max(0, prev - 1);
        const maxPage = Math.max(1, Math.ceil(next / PAGE_SIZE));
        if (tablePage > maxPage) {
          setTablePage(maxPage);
        } else {
          void loadTable();
        }
        return next;
      });
      setToast({ message: "View removed", type: "success" });
    } catch (err) {
      setToast({ message: formatApiError(err, "Failed to remove view"), type: "error" });
    } finally {
      setRemoving(false);
    }
  }, [pendingRemove, projectId, loadTable, tablePage]);

  const handleDownloadData = useCallback(
    async (view: CustomViewConfiguration) => {
      try {
        const blob = await customViewService.downloadData(
          projectId,
          view.id,
          downloadMonth,
          downloadYear,
        );
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${view.name || "custom-view"}_${String(downloadMonth).padStart(2, "0")}-${downloadYear}.xlsx`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      } catch (err) {
        setToast({ message: formatApiError(err, "Failed to download data"), type: "error" });
      }
    },
    [projectId, downloadMonth, downloadYear],
  );

  const handleStatusFilterChange = useCallback(
    (value: "all" | "active" | "paused" | "draft") => {
      setStatusFilter(value);
      setTablePage(1);
    },
    [],
  );

  const removeConfirmMessage = useMemo(() => {
    if (!pendingRemove) return "";
    const name = pendingRemove.name || "this view";
    if (pendingRemove.status === "active") {
      return `Remove "${name}"? Field users will no longer see this view, and month data will no longer be downloadable from this screen. This cannot be undone.`;
    }
    return `Remove "${name}"? Field users will no longer see this view, and month data will no longer be downloadable from this screen. This cannot be undone.`;
  }, [pendingRemove]);

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
              onRemoveView={(view) => handleRemoveFromCard(designation.id, view)}
              onSaved={handleSaved}
              onError={(message) => setToast({ message, type: "error" })}
            />
          ))
        )}
      </section>

      <section className="cv-section">
        <ViewManagementTable
          views={tableViews}
          designations={designations}
          statusFilter={statusFilter}
          onStatusFilterChange={handleStatusFilterChange}
          downloadMonth={downloadMonth}
          downloadYear={downloadYear}
          yearOptions={yearOptions}
          onDownloadPeriodChange={(month, year) => {
            setDownloadMonth(month);
            setDownloadYear(year);
          }}
          page={tablePage}
          pageSize={PAGE_SIZE}
          total={tableTotal}
          onPageChange={setTablePage}
          loading={tableLoading}
          onEdit={handleEdit}
          onPause={handlePause}
          onResume={handleResume}
          onRemove={setPendingRemove}
          onDownloadData={(view) => void handleDownloadData(view)}
        />
      </section>

      <ConfirmDialog
        isOpen={Boolean(pendingRemove)}
        onClose={() => !removing && setPendingRemove(null)}
        onConfirm={() => void handleConfirmRemove()}
        title="Remove view"
        message={removeConfirmMessage}
        confirmLabel="Remove"
        variant="danger"
        isLoading={removing}
      />

      <If2Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
