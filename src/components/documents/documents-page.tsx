"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileUp, FolderOpen, Smartphone, Settings2 } from "lucide-react";
import {
  documentsService,
  designationService,
  featureConfigService,
  formatApiError,
  MODULE_DISPLAY_NAME_MAX_LENGTH,
  type Designation,
  type DocumentAcknowledgementReport,
  type DocumentRecord,
  type DocumentTargetModule,
  type DocumentsListResponse,
} from "@/lib/api";
import { If2Toast, type ToastState } from "@/components/accounts/if2-toast";
import { projectAdminBase } from "@/lib/nav/nav";
import { DesignationSelector } from "./designation-selector";
import { DesignationCard } from "./designation-card";
import { DocumentsTable } from "./documents-table";
import { ManageCategoriesModal } from "./manage-categories-modal";
import type { ResourceCategories, SaveResourceCategoriesInput } from "@/lib/api/documents-service";

const RESOURCES_MODULE_KEY = "resources";
const DEFAULT_APP_MODULE_NAME = "Resources";

interface Props {
  projectId: string;
  projectName: string;
  accountCode: string;
  projectCode: string;
}

export function DocumentsPage({
  projectId,
  projectName,
  accountCode,
  projectCode,
}: Props) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [targetModules, setTargetModules] = useState<DocumentTargetModule[]>(
    [],
  );
  const [selectedDesignationIds, setSelectedDesignationIds] = useState<
    string[]
  >([]);
  const [documents, setDocuments] = useState<DocumentsListResponse | null>(
    null,
  );
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [managingCategories, setManagingCategories] = useState(false);
  const [categoryRenames, setCategoryRenames] = useState<Record<string, string>>({});
  const [ackReport, setAckReport] = useState<DocumentAcknowledgementReport | null>(null);
  const [loadingAckReport, setLoadingAckReport] = useState(false);
  const [appModuleName, setAppModuleName] = useState("");
  const [savedAppModuleName, setSavedAppModuleName] = useState("");
  const [savingAppModuleName, setSavingAppModuleName] = useState(false);

  // ─── Initial data load ────────────────────────────────────────

  useEffect(() => {
    if (!projectId) return;

    designationService
      .listByProject(projectId)
      .then(setDesignations)
      .catch(() => setDesignations([]));

    documentsService
      .getCategories(projectId)
      .then((config) => setTargetModules(config.categories))
      .catch((error) => setToast({ message: formatApiError(error), type: "error" }));

    featureConfigService
      .getRawByProject(projectId)
      .then((config) => {
        const name =
          config.modules.find((m) => m.key === RESOURCES_MODULE_KEY)
            ?.displayName ?? "";
        setAppModuleName(name);
        setSavedAppModuleName(name);
      })
      .catch(() => {
        setAppModuleName("");
        setSavedAppModuleName("");
      });
  }, [projectId]);

  // ─── Load documents ───────────────────────────────────────────

  const loadDocuments = useCallback(
    async (fromDate?: string, toDate?: string) => {
      if (!projectId) return;
      setLoadingDocs(true);
      try {
        const result = await documentsService.listDocuments({
          projectId,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          page: 1,
          limit: 50,
        });
        setDocuments(result);
      } catch (err) {
        setToast({ message: formatApiError(err), type: "error" });
      } finally {
        setLoadingDocs(false);
      }
    },
    [projectId],
  );

  useEffect(() => {
    // Refresh the external document list when the project changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDocuments();
  }, [loadDocuments]);

  // ─── Handlers ─────────────────────────────────────────────────

  const handleUploadSuccess = useCallback(
    (designationId: string) => {
      setToast({ message: "Document uploaded successfully", type: "success" });
      setSelectedDesignationIds((prev) =>
        prev.filter((id) => id !== designationId),
      );
      loadDocuments(filterFromDate, filterToDate);
    },
    [loadDocuments, filterFromDate, filterToDate],
  );

  const handleUploadError = useCallback((errorMessage: string) => {
    setToast({ message: errorMessage, type: "error" });
  }, []);

  const handleStatusToggle = useCallback(
    async (docId: string, newStatus: "Active" | "Inactive") => {
      try {
        await documentsService.updateDocumentStatus(docId, newStatus);
        setToast({ message: "Status updated", type: "success" });
        loadDocuments(filterFromDate, filterToDate);
      } catch (err) {
        setToast({ message: formatApiError(err), type: "error" });
      }
    },
    [loadDocuments, filterFromDate, filterToDate],
  );

  const handleFilterLoad = useCallback(() => {
    loadDocuments(filterFromDate, filterToDate);
  }, [loadDocuments, filterFromDate, filterToDate]);

  const handleFilterClear = useCallback(() => {
    setFilterFromDate("");
    setFilterToDate("");
    loadDocuments();
  }, [loadDocuments]);

  const handleViewAcknowledgements = useCallback(async (doc: DocumentRecord) => {
    setLoadingAckReport(true);
    try {
      const report = await documentsService.getAcknowledgementReport(doc._id);
      setAckReport(report);
    } catch (err) {
      setToast({ message: formatApiError(err), type: "error" });
    } finally {
      setLoadingAckReport(false);
    }
  }, []);

  const handleCategoriesSaved = (result: ResourceCategories, categories: SaveResourceCategoriesInput["categories"]) => {
    setTargetModules(result.categories);
    // Update the current table immediately, then fetch the persisted document values.
    const renamed = new Map(categories.filter((category) => category.originalName).map((category) => [category.originalName!, category.name]));
    setDocuments((previous) => previous ? { ...previous, data: previous.data.map((document) => ({ ...document, targetModule: renamed.get(document.targetModule) ?? document.targetModule })) } : previous);
    setCategoryRenames(Object.fromEntries(renamed));
    setManagingCategories(false);
    setToast({ message: "Categories saved", type: "success" });
    loadDocuments(filterFromDate, filterToDate);
  };

  const handleSaveAppModuleName = useCallback(async () => {
    if (!projectId) return;
    setSavingAppModuleName(true);
    try {
      const config = await featureConfigService.setModuleDisplayName(
        projectId,
        RESOURCES_MODULE_KEY,
        appModuleName,
      );
      const name =
        config.modules.find((m) => m.key === RESOURCES_MODULE_KEY)
          ?.displayName ?? "";
      setAppModuleName(name);
      setSavedAppModuleName(name);
      setToast({
        message: name
          ? `The app will show this module as "${name}"`
          : `The app will show this module as "${DEFAULT_APP_MODULE_NAME}"`,
        type: "success",
      });
    } catch (err) {
      setToast({ message: formatApiError(err), type: "error" });
    } finally {
      setSavingAppModuleName(false);
    }
  }, [projectId, appModuleName]);

  // ─── Derived ──────────────────────────────────────────────────

  const selectedDesignations = useMemo(
    () => designations.filter((d) => selectedDesignationIds.includes(d.id)),
    [designations, selectedDesignationIds],
  );

  const activeModuleNames = useMemo(
    () => targetModules.filter((m) => m.isActive).map((m) => m.name),
    [targetModules],
  );

  const backHref = `${projectAdminBase(accountCode, projectCode)}/modules`;

  return (
    <div className="documents-page">
      {/* Header */}
      <div className="doc-page-head">
        <div>
          <Link href={backHref} className="doc-back-link">
            <ArrowLeft size={14} />
            <span>Back to Modules</span>
          </Link>
          <span className="doc-eyebrow">Documents</span>
          <h1>Documents — {projectName}</h1>
          <p>Upload, manage and distribute documents to field teams by designation</p>
        </div>
      </div>

      {/* Info banner */}
      <div className="doc-info-banner">
        Upload documents per designation and manage them with date filters and
        status toggles. Each designation is configured independently.
      </div>

      {/* App settings: module name shown in the mobile app */}
      <section className="doc-section">
        <h2 className="doc-section-title">
          <Smartphone size={16} />
          App Settings
        </h2>
        <div className="doc-filter-row">
          <div className="doc-filter-fields">
            <div className="doc-field">
              <label className="doc-label" htmlFor="doc-app-module-name">
                Show module name in app as
              </label>
              <input
                id="doc-app-module-name"
                type="text"
                className="doc-input"
                placeholder={DEFAULT_APP_MODULE_NAME}
                maxLength={MODULE_DISPLAY_NAME_MAX_LENGTH}
                value={appModuleName}
                onChange={(e) => setAppModuleName(e.target.value)}
                disabled={savingAppModuleName}
              />
            </div>
          </div>
          <div className="doc-filter-actions">
            <button
              type="button"
              className="doc-btn doc-btn-primary doc-btn-sm"
              onClick={handleSaveAppModuleName}
              disabled={
                savingAppModuleName ||
                appModuleName.trim() === savedAppModuleName.trim()
              }
            >
              {savingAppModuleName ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
        <p className="doc-table-info">
          Shown in this project&apos;s mobile app menu. Leave empty to show
          &quot;{DEFAULT_APP_MODULE_NAME}&quot;.
        </p>
      </section>

      {/* Section 1: Upload Documents */}
      <section className="doc-section">
        <div className="doc-section-head">
          <h2 className="doc-section-title"><FileUp size={16} /> Upload Documents</h2>
          <button type="button" className="doc-btn doc-btn-secondary doc-btn-sm" onClick={() => setManagingCategories(true)}><Settings2 size={14} /> Manage categories</button>
        </div>

        <DesignationSelector
          designations={designations}
          selectedIds={selectedDesignationIds}
          onChange={setSelectedDesignationIds}
        />

        {selectedDesignations.length === 0 && (
          <div className="doc-empty-state">
            No Designation Selected — Please select one or more designations to
            begin configuration.
          </div>
        )}

        {selectedDesignations.map((designation) => (
          <DesignationCard
            key={designation.id}
            designation={designation}
            targetModules={activeModuleNames}
            categoryRenames={categoryRenames}
            projectId={projectId}
            onUploadSuccess={() => handleUploadSuccess(designation.id)}
            onUploadError={handleUploadError}
          />
        ))}
      </section>

      {/* Section 2: Documents Management */}
      <section className="doc-section">
        <h2 className="doc-section-title">
          <FolderOpen size={16} />
          Documents Management
        </h2>

        <DocumentsTable
          documents={documents?.data ?? []}
          total={documents?.total ?? 0}
          loading={loadingDocs}
          designations={designations}
          filterFromDate={filterFromDate}
          filterToDate={filterToDate}
          onFilterFromDateChange={setFilterFromDate}
          onFilterToDateChange={setFilterToDate}
          onFilterLoad={handleFilterLoad}
          onFilterClear={handleFilterClear}
          onStatusToggle={handleStatusToggle}
          onViewAcknowledgements={handleViewAcknowledgements}
        />
      </section>

      {managingCategories && <ManageCategoriesModal projectId={projectId} onClose={() => setManagingCategories(false)} onSaved={handleCategoriesSaved} />}

      {(ackReport || loadingAckReport) && (
        <div className="doc-modal-backdrop" role="presentation">
          <div className="doc-modal" role="dialog" aria-modal="true">
            <div className="doc-modal-head">
              <div>
                <h3>Acknowledgement Status</h3>
                <p>
                  {ackReport
                    ? `${ackReport.document.title} · v${ackReport.document.documentVersion}`
                    : "Loading..."}
                </p>
              </div>
              <button
                type="button"
                className="doc-btn doc-btn-secondary doc-btn-sm"
                onClick={() => setAckReport(null)}
              >
                Close
              </button>
            </div>
            {loadingAckReport ? (
              <div className="doc-table-loading">Loading acknowledgements...</div>
            ) : ackReport ? (
              <>
                <div className="doc-table-info">
                  Total {ackReport.summary.totalUsers} · Acknowledged{" "}
                  {ackReport.summary.acknowledged} · Pending {ackReport.summary.pending}
                </div>
                <div className="doc-table-wrapper">
                  <table className="doc-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Acknowledged At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ackReport.users.map((user) => (
                        <tr key={user.userId}>
                          <td>{user.name || user.userId}</td>
                          <td>{user.email || "—"}</td>
                          <td>{user.status}</td>
                          <td>
                            {user.acknowledgedAt
                              ? JSON.stringify(user.acknowledgedAt)
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      <If2Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
