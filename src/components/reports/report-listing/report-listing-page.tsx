"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Eye, FileText, MoreVertical, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { reportConfigService } from "@/lib/api/report-config-service";
import type { ReportConfigDocument } from "@/lib/api/report-config-service";
import { useProjectContext } from "@/lib/project-admin/project-context";

interface ReportListingPageProps {
  accountCode: string;
  projectCode: string;
}

type Tab = "all" | "favorites";

function ReportCard({
  report,
  onFavoriteToggle,
  onClick,
  onEdit,
  onDelete,
  isMenuOpen,
  onMenuOpen,
  onMenuClose,
}: {
  report: ReportConfigDocument;
  onFavoriteToggle: (reportId: string) => void;
  onClick: (reportId: string) => void;
  onEdit: (reportId: string) => void;
  onDelete: (reportId: string) => void;
  isMenuOpen: boolean;
  onMenuOpen: (reportId: string) => void;
  onMenuClose: () => void;
}) {
  const reportId = report._id || report.id || "";
  const isFavorite = (report.favorites || []).length > 0; // Simplified; real check needs userId
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!isMenuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onMenuClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen, onMenuClose]);

  return (
    <article
      className="group flex cursor-pointer items-center gap-4 rounded-lg border border-[#dde6f0] bg-white p-4 shadow-[0_2px_8px_rgba(30,95,168,0.08)] transition hover:border-[#c8d8eb] hover:shadow-[0_4px_20px_rgba(30,95,168,0.13)]"
      onClick={() => onClick(reportId)}
    >
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-[#f0f6ff] text-[#1e5fa8]">
        <FileText className="h-5 w-5" />
      </div>
      <div className="flex min-w-0 flex-1 items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="truncate text-sm font-bold text-[#0c1929]">
              {report.reportName}
            </h3>
            {report.status === "draft" && (
              <span className="rounded-full border border-[#f59e0b]/25 bg-[#fef3c7] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#92400e]">
                Draft
              </span>
            )}
          </div>
          {report.description && (
            <p className="mb-2 line-clamp-2 text-xs leading-5 text-[#3a5272]">
              {report.description.length > 200
                ? `${report.description.slice(0, 200)}...`
                : report.description}
            </p>
          )}
          <div className="flex items-center gap-4 text-[11px] font-medium text-[#7a95b5]">
            {report.createdAt && (
              <span>
                {new Date(report.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="ml-2 flex flex-shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFavoriteToggle(reportId);
            }}
            className="rounded-md p-2 text-[#7a95b5] hover:bg-[#f7fafd]"
            aria-label={isFavorite ? "Remove favorite" : "Mark favorite"}
          >
            <Star
              className={`h-5 w-5 ${
                isFavorite
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300 hover:text-yellow-400"
              }`}
            />
          </button>

          {/* Kebab menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (isMenuOpen) {
                  onMenuClose();
                } else {
                  onMenuOpen(reportId);
                }
              }}
              className="rounded-md p-2 text-[#7a95b5] hover:bg-[#f7fafd]"
              aria-label="More actions"
            >
              <MoreVertical className="h-5 w-5 text-gray-400" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-lg border border-[#dde6f0] bg-white shadow-[0_8px_40px_rgba(30,95,168,0.18)]">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMenuClose();
                    onClick(reportId);
                  }}
                  className="flex w-full items-center gap-2 rounded-t-lg px-3 py-2 text-sm text-[#3a5272] hover:bg-[#f7fafd]"
                >
                  <Eye className="h-4 w-4 text-gray-400" />
                  View
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMenuClose();
                    onEdit(reportId);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#3a5272] hover:bg-[#f7fafd]"
                >
                  <Pencil className="h-4 w-4 text-gray-400" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMenuClose();
                    onDelete(reportId);
                  }}
                  className="flex w-full items-center gap-2 rounded-b-lg px-3 py-2 text-sm text-[#e8382d] hover:bg-[#fff0ef]"
                >
                  <Trash2 className="h-4 w-4 text-red-400" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export function ReportListingPage({
  accountCode,
  projectCode,
}: ReportListingPageProps) {
  const router = useRouter();
  const { projectId } = useProjectContext();
  const baseUrl = `/project-admin/${accountCode}/${projectCode}/reports`;

  const [reports, setReports] = useState<ReportConfigDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Load reports
  useEffect(() => {
    let mounted = true;
    async function loadReports() {
      try {
        setLoading(true);
        const configs = await reportConfigService.listConfigs(projectId || '');
        if (!mounted) return;
        // Sort by creation date descending
        const sorted = [...configs].sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime(),
        );
        setReports(sorted);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to load reports");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadReports();
    return () => {
      mounted = false;
    };
  }, [projectId]);

  const filteredReports =
    activeTab === "favorites"
      ? reports.filter((r) => (r.favorites || []).length > 0)
      : reports;

  const handleFavoriteToggle = useCallback(async (reportId: string) => {
    try {
      await reportConfigService.toggleFavorite(reportId);
      // Refresh list
      const configs = await reportConfigService.listConfigs(projectId || '');
      const sorted = [...configs].sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime(),
      );
      setReports(sorted);
    } catch {
      // Silently handle
    }
  }, [projectId]);

  const handleReportClick = useCallback(
    (reportId: string) => {
      router.push(`${baseUrl}/${reportId}`);
    },
    [router, baseUrl],
  );

  const handleEdit = useCallback(
    (reportId: string) => {
      router.push(`${baseUrl}/${reportId}/edit`);
    },
    [router, baseUrl],
  );

  const handleDelete = useCallback(async (reportId: string) => {
    const confirmed = window.confirm(
      "Delete this report? This cannot be undone.",
    );
    if (!confirmed) return;
    try {
      await reportConfigService.deleteConfig(reportId);
      setReports((prev) =>
        prev.filter((r) => (r._id || r.id) !== reportId),
      );
    } catch {
      // Silently handle
    }
  }, []);

  const handleNewReport = useCallback(() => {
    router.push(`${baseUrl}/new`);
  }, [router, baseUrl]);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#1e5fa8]">
            Reports Module
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#0c1929]">Report Configurations</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[#3a5272]">
            Build, publish, and export project reports from configured data sources.
          </p>
        </div>
        <button
          type="button"
          onClick={handleNewReport}
          className="inline-flex items-center gap-2 rounded-lg bg-[#1e5fa8] px-4 py-2 text-sm font-bold text-white shadow-[0_2px_8px_rgba(30,95,168,0.18)] hover:bg-[#174d88]"
        >
          <Plus className="h-4 w-4" />
          New Report
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex rounded-lg border border-[#dde6f0] bg-white p-1 shadow-[0_2px_8px_rgba(30,95,168,0.08)]">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`rounded-md px-4 py-2 text-sm font-bold transition-colors ${
            activeTab === "all"
              ? "bg-[#f0f6ff] text-[#1e5fa8]"
              : "text-[#7a95b5] hover:bg-[#f7fafd] hover:text-[#3a5272]"
          }`}
        >
          All Reports
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("favorites")}
          className={`rounded-md px-4 py-2 text-sm font-bold transition-colors ${
            activeTab === "favorites"
              ? "bg-[#f0f6ff] text-[#1e5fa8]"
              : "text-[#7a95b5] hover:bg-[#f7fafd] hover:text-[#3a5272]"
          }`}
        >
          Favorites
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center rounded-lg border border-[#dde6f0] bg-white py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-[#ffd5d3] bg-[#fff0ef] py-12 text-center">
          <p className="text-red-600">{error}</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#c8d8eb] bg-white py-12 text-center">
          <BarChart3 className="mx-auto mb-3 h-8 w-8 text-[#7a95b5]" />
          <p className="text-sm text-[#3a5272]">
            {activeTab === "favorites"
              ? "No favorite reports yet."
              : "No reports found. Create your first report to get started."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredReports.map((report) => {
            const reportId = report._id || report.id || "";
            return (
              <ReportCard
                key={reportId}
                report={report}
                onFavoriteToggle={handleFavoriteToggle}
                onClick={handleReportClick}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isMenuOpen={openMenuId === reportId}
                onMenuOpen={setOpenMenuId}
                onMenuClose={() => setOpenMenuId(null)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
