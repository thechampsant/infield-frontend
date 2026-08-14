"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileUp, FolderOpen } from "lucide-react";
import {
  documentsService,
  designationService,
  formatApiError,
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
  const [ackReport, setAckReport] = useState<DocumentAcknowledgementReport | null>(null);
  const [loadingAckReport, setLoadingAckReport] = useState(false);

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
          onViewAcknowledgements={handleViewAcknowledgements}
        />
      </section>

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
