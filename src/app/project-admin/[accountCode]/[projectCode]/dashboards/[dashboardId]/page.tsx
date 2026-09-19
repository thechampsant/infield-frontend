"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { OnvoDashboardEmbed } from "@/components/project-admin/dashboards/onvo-dashboard-embed";
import {
  parseDashboardEmbed,
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
  const embed = useMemo(
    () => parseDashboardEmbed(dashboard?.url ?? ""),
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

  if (projectError || error || !dashboard || !embed) {
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
        <a
          href={embed.src}
          target="_blank"
          rel="noopener noreferrer"
          className="att-back-modules"
          style={{ marginLeft: "auto" }}
        >
          <ExternalLink size={14} /> Open
        </a>
      </div>
      <div className="pa-dashboard-embed__frame">
        {embed.kind === "onvo" ? (
          <OnvoDashboardEmbed
            baseUrl={embed.baseUrl}
            token={embed.token}
            dashboardId={embed.dashboardId}
          />
        ) : (
          <iframe
            src={embed.src}
            title={dashboard.name}
            frameBorder={0}
            width="100%"
            height="100%"
            allow="clipboard-write; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        )}
      </div>
    </div>
  );
}
