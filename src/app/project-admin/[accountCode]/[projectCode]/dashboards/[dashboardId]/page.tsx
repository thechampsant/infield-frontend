"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import {
  projectDashboardsService,
  type ProjectDashboard,
} from "@/lib/api/project-dashboards-service";
import { projectAdminBase } from "@/lib/nav/nav";
import { useProjectContext } from "@/lib/project-admin/project-context";

export default function DashboardViewerRoute() {
  const params = useParams<{ dashboardId: string }>();
  const dashboardId = String(params?.dashboardId ?? "");
  const { accountCode, projectCode, loading: projectLoading, error: projectError } =
    useProjectContext();
  const [dashboard, setDashboard] = useState<ProjectDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const listHref = `${projectAdminBase(accountCode, projectCode)}/dashboards`;

  useEffect(() => {
    if (!dashboardId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    projectDashboardsService
      .getById(dashboardId)
      .then((row) => {
        if (!cancelled) setDashboard(row);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load dashboard");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dashboardId]);

  if (projectLoading || loading) {
    return (
      <div className="att-config-page">
        <div className="pa-loading">Loading dashboard…</div>
      </div>
    );
  }

  if (projectError || error || !dashboard?.url) {
    return (
      <div className="att-config-page">
        <Link href={listHref} className="att-back-modules">
          <ChevronLeft size={14} /> Back to Dashboards
        </Link>
        <div
          className="pa-info-banner"
          style={{
            color: "var(--red)",
            background: "var(--red-light)",
            borderColor: "var(--red-mid)",
            marginTop: 16,
          }}
        >
          {projectError ?? error ?? "Dashboard not found"}
        </div>
      </div>
    );
  }

  return (
    <div
      className="att-config-page"
      style={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - 140px)", gap: 12 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Link href={listHref} className="att-back-modules">
          <ChevronLeft size={14} /> Dashboards
        </Link>
        <div className="pa-page-title" style={{ margin: 0, fontSize: 18 }}>
          {dashboard.name}
        </div>
      </div>
      <iframe
        src={dashboard.url}
        title={dashboard.name}
        style={{
          flex: 1,
          width: "100%",
          minHeight: "70vh",
          border: "1px solid var(--border)",
          borderRadius: 12,
          background: "var(--surface)",
        }}
      />
    </div>
  );
}
