"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, MoreVertical, Pencil, Plus, Star, Trash2 } from "lucide-react";
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
    <div
      className="bg-white rounded-lg border border-gray-200 p-5 hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer"
      onClick={() => onClick(reportId)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold text-gray-900 truncate">
              {report.reportName}
            </h3>
            {report.status === "draft" && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
                Draft
              </span>
            )}
          </div>
          {report.description && (
            <p className="text-sm text-gray-500 mb-2 line-clamp-2">
              {report.description.length > 200
                ? `${report.description.slice(0, 200)}...`
                : report.description}
            </p>
          )}
          <div className="flex items-center gap-4 text-xs text-gray-400">
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
        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFavoriteToggle(reportId);
            }}
            className="p-1 hover:bg-gray-100 rounded"
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
              className="p-1 hover:bg-gray-100 rounded"
              aria-label="More actions"
            >
              <MoreVertical className="h-5 w-5 text-gray-400" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMenuClose();
                    onClick(reportId);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
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
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
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
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-lg"
                >
                  <Trash2 className="h-4 w-4 text-red-400" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
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
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">
            Reports
          </p>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">All Reports</h1>
        </div>
        <button
          type="button"
          onClick={handleNewReport}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          New Report
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "all"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          All Reports
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("favorites")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "favorites"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Favorites
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600">{error}</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">
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
