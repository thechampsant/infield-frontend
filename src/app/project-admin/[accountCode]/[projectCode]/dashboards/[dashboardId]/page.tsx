"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import {
  extractDashboardEmbedUrl,
  projectDashboardsService,
  type ProjectDashboard,
} from "@/lib/api/project-dashboards-service";
import { projectAdminBase } from "@/lib/nav/nav";
import { useProjectContext } from "@/lib/project-admin/project-context";

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export default function DashboardViewerRoute() {
  const params = useParams<{ dashboardId: string }>();
  const dashboardId = String(params?.dashboardId ?? "");
  const { accountCode, projectCode, loading: projectLoading, error: projectError } =
    useProjectContext();
  const [dashboard, setDashboard] = useState<ProjectDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const listHref = `${projectAdminBase(accountCode, projectCode)}/dashboards`;
  const embedSrc = useMemo(
    () => extractDashboardEmbedUrl(dashboard?.url ?? ""),
    [dashboard?.url],
  );

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

  if (projectError || error || !dashboard || !isHttpUrl(embedSrc)) {
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
          {projectError ?? error ?? "Dashboard embed URL is missing or invalid"}
        </div>
      </div>
    );
  }

  return (
    <div className="att-config-page pa-dashboard-embed">
      <div className="pa-dashboard-embed__bar">
        <Link href={listHref} className="att-back-modules">
          <ChevronLeft size={14} /> Dashboards
        </Link>
        <div className="pa-page-title" style={{ margin: 0, fontSize: 18 }}>
          {dashboard.name}
        </div>
      </div>
      <div className="pa-dashboard-embed__frame">
        <iframe
          src={embedSrc}
          title={dashboard.name}
          frameBorder={0}
          width="100%"
          height="100%"
          allow="clipboard-write; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </div>
  );
}
