"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileUp, FolderOpen } from "lucide-react";
import {
  documentsService,
  designationService,
  formatApiError,
  type Designation,
  type DocumentTargetModule,
  type DocumentsListResponse,
} from "@/lib/api";
import { If2Toast, type ToastState } from "@/components/accounts/if2-toast";
import { projectAdminBase } from "@/lib/nav/nav";
import { DesignationSelector } from "./designation-selector";
import { DesignationCard } from "./designation-card";
import { DocumentsTable } from "./documents-table";

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

  // ─── Initial data load ────────────────────────────────────────

  useEffect(() => {
    if (!projectId) return;

    designationService
      .listByProject(projectId)
      .then(setDesignations)
      .catch(() => setDesignations([]));

    documentsService
      .getTargetModules(projectId)
      .then((config) => setTargetModules(config.modules ?? []))
      .catch(() => setTargetModules([]));
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

      {/* Section 1: Upload Documents */}
      <section className="doc-section">
        <h2 className="doc-section-title">
          <FileUp size={16} />
          Upload Documents
        </h2>

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
        />
      </section>

      <If2Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
