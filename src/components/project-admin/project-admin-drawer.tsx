"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Users,
  Settings,
  FileText,
  PieChart,
  LogOut,
  ChevronDown,
  ChevronLeft,
  LayoutGrid,
  LayoutDashboard,
  RefreshCw,
  MessagesSquare,
  Star,
  Plus,
} from "lucide-react";
import { projectAdminBase, projectAdminDrawerNav } from "@/lib/nav/nav";
import {
  dynamicMenuService,
  type DynamicMenuConfig,
} from "@/lib/api/dynamic-menu-service";
import { reportConfigService } from "@/lib/api/report-config-service";
import {
  isReportFavoriteForUser,
  subscribeReportsChanged,
} from "@/lib/reports/report-nav-state";
import { useConnectBadge } from "@/hooks/use-connect-socket";
import { useAuth } from "@/lib/auth/auth-context";
import {
  canNavigateBackToProjects,
  resolvedAdminAccess,
} from "@/lib/auth/permissions";
import { projectHasVisibleSyncJobs } from "@/lib/api/integration-sync-service";
import { ApiError } from "@/lib/api/api-client";
import { canAccessOverview } from "@/lib/overview/access";

const ICONS = {
  users: Users,
  settings: Settings,
  fileText: FileText,
  pieChart: PieChart,
  refreshCw: RefreshCw,
  layoutDashboard: LayoutDashboard,
  messagesSquare: MessagesSquare,
  star: Star,
  plus: Plus,
} as const;

function ReportsTabObserver({
  onTabChange,
}: {
  onTabChange: (tab: "all" | "favorites") => void;
}) {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "favorites" ? "favorites" : "all";

  useEffect(() => {
    onTabChange(tab);
  }, [tab, onTabChange]);

  return null;
}

export type PaProfile = {
  name: string;
  role: string;
  email: string;
  mobile: string;
  employeeId: string;
  designation: string;
  dateOfJoining: string;
};

export function ProjectAdminDrawer({
  accountCode,
  projectCode,
  projectId,
  projectName,
  accountName,
  backHref,
  onLogout,
}: {
  accountCode: string;
  projectCode: string;
  projectId: string;
  projectName: string;
  accountName: string;
  backHref: string;
  onLogout: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const pathname = usePathname() ?? "/";
  const { user } = useAuth();
  const showBackToProjects = canNavigateBackToProjects(user);
  const { connectCount } = useConnectBadge(projectId);
  const base = projectAdminBase(accountCode, projectCode);
  const baseNavItems = [
    ...(canAccessOverview(user) && user?.projectId === projectId
      ? [
          {
            label: "Overview",
            href: `${base}/overview`,
            icon: "layoutDashboard" as const,
          },
        ]
      : []),
    ...projectAdminDrawerNav(accountCode, projectCode, {
    adminAccess: resolvedAdminAccess(user),
    }),
  ];

  const [dynamicItems, setDynamicItems] = useState<DynamicMenuConfig[]>([]);
  const [hasSyncJobs, setHasSyncJobs] = useState(false);
  const reportsHref = `${base}/reports`;
  const isReportsRoute =
    pathname === reportsHref || pathname.startsWith(`${reportsHref}/`);
  const [reportsCollapsedOnRoute, setReportsCollapsedOnRoute] = useState(false);
  const [reportsExpandedOffRoute, setReportsExpandedOffRoute] = useState(false);
  const reportsMenuOpen = isReportsRoute
    ? !reportsCollapsedOnRoute
    : reportsExpandedOffRoute;
  const toggleReportsMenu = useCallback(() => {
    if (isReportsRoute) {
      setReportsCollapsedOnRoute((prev) => !prev);
    } else {
      setReportsExpandedOffRoute((prev) => !prev);
    }
  }, [isReportsRoute]);
  const [reportsTab, setReportsTab] = useState<"all" | "favorites">("all");
  const [reportCounts, setReportCounts] = useState<{
    all: number;
    favorites: number;
  } | null>(null);

  const navItems = hasSyncJobs
    ? baseNavItems.flatMap((item) =>
      item.label === "Modules"
        ? [
          item,
          {
            label: "Sync Jobs",
                href: `${base}/sync-jobs`,
            icon: "refreshCw" as const,
          },
        ]
        : [item],
    )
    : baseNavItems;

  const hasReportsMenu = navItems.some(
    (item) => item.label === "Reports" && (item.children?.length ?? 0) > 0,
  );

  useEffect(() => {
    if (!projectId || !hasReportsMenu) return;
    let cancelled = false;
    const fetchCounts = () => {
      reportConfigService
        .listConfigs(projectId)
        .then((configs) => {
          if (cancelled) return;
          const favCount = configs.filter((cfg) =>
            isReportFavoriteForUser(cfg, user),
          ).length;
          setReportCounts({ all: configs.length, favorites: favCount });
        })
        .catch(() => {
          // Keep existing counts on transient failure
        });
    };
    fetchCounts();
    const unsubscribe = subscribeReportsChanged(fetchCounts);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [projectId, hasReportsMenu, user]);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    dynamicMenuService
      .getSidebarMenu()
      .then((items) => {
        if (!cancelled) setDynamicItems(items);
      })
      .catch(() => {
        if (!cancelled) setDynamicItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    projectHasVisibleSyncJobs(projectId)
      .then((value) => {
        if (!cancelled) setHasSyncJobs(value);
      })
      .catch((error) => {
        // Do not mistake an unavailable API for an empty job registry.
        if (error instanceof ApiError && error.status === 403) {
          console.warn("Access denied while checking Sync Jobs availability", { projectId });
        } else {
          console.error("Unable to check Sync Jobs availability", error);
        }
        if (!cancelled) setHasSyncJobs(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return (
    <aside
      className={`pa-drawer ${expanded ? "pa-drawer--expanded" : "pa-drawer--collapsed"}`}
    >
      <Suspense fallback={null}>
        <ReportsTabObserver onTabChange={setReportsTab} />
      </Suspense>

      <div className="pa-drawer-header">
        <button
          type="button"
          className="pa-drawer-toggle"
          onClick={() => setExpanded((e) => !e)}
          aria-label={expanded ? "Collapse menu" : "Expand menu"}
        >
          <span
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              width: 14,
            }}
          >
            {[100, expanded ? 70 : 100, expanded ? 50 : 100].map((w, i) => (
              <span
                key={i}
                style={{
                  display: "block",
                  width: `${w}%`,
                  height: 2,
                  background: "currentColor",
                  borderRadius: 1,
                  transition: "width .25s",
                }}
              />
            ))}
          </span>
        </button>
        {expanded && <span className="pa-drawer-title">Menu</span>}
      </div>

      {expanded && (
        <div className="pa-project-banner">
          <div className="pa-project-name">{projectName}</div>
          <div className="pa-project-sub">{accountName}</div>
        </div>
      )}

      <nav className="pa-drawer-body">
        {showBackToProjects ? (
          <Link href={backHref} className="pa-back-link">
            <ChevronLeft size={14} style={{ flexShrink: 0 }} />
            {expanded && <span>Back to Projects</span>}
          </Link>
        ) : null}

        {expanded && <div className="pa-nav-section">Setup</div>}

        {navItems.map((item) => {
          const active =
            item.label === "Uploaders"
              ? pathname.includes("/uploaders/")
              : item.label === "Modules"
                ? pathname.includes("/modules")
                : item.label === "Dashboards"
                  ? pathname.includes("/dashboards")
                  : pathname.startsWith(item.href);
          const Icon = ICONS[item.icon];

          if (item.children?.length && expanded) {
            return (
              <div key={item.href}>
                <button
                  type="button"
                  onClick={toggleReportsMenu}
                  aria-expanded={reportsMenuOpen}
                  className={`pa-nav-link pa-nav-group-btn${
                    active && !reportsMenuOpen ? " active" : ""
                  }${active && reportsMenuOpen ? " is-parent-active" : ""}`}
                  title={item.label}
                >
                  <span className="inline-flex items-center gap-3 min-w-0">
                    <span style={{ flexShrink: 0 }}>
                      <Icon size={18} />
                    </span>
                    <span>{item.label}</span>
                  </span>
                  <span
                    className={`pa-nav-chevron${reportsMenuOpen ? " pa-nav-chevron--open" : ""}`}
                    aria-hidden="true"
                  >
                    <ChevronDown size={15} />
                  </span>
                </button>

                {reportsMenuOpen && (
                  <div className="pa-nav-submenu" role="group" aria-label="Reports navigation">
                    {item.children.map((sub) => {
                      const SubIcon = (sub.icon && ICONS[sub.icon]) || FileText;
                      const isNewRoute =
                        pathname === `${reportsHref}/new` ||
                        pathname.startsWith(`${reportsHref}/new/`);
                      const isListingRoute = pathname === reportsHref;

                      const subActive =
                        sub.key === "new-report"
                          ? isNewRoute
                          : sub.key === "favorites"
                            ? isListingRoute && reportsTab === "favorites"
                            : isListingRoute && reportsTab !== "favorites";

                      const count =
                        sub.key === "all-reports"
                          ? reportCounts?.all
                          : sub.key === "favorites"
                            ? reportCounts?.favorites
                            : undefined;

                      return (
                        <Link
                          key={sub.key}
                          href={sub.href}
                          className={`pa-nav-sublink${subActive ? " active" : ""}`}
                        >
                          <span className="pa-nav-sublink-label">
                            <SubIcon size={13} style={{ flexShrink: 0 }} />
                            <span>{sub.label}</span>
                          </span>
                          {count !== undefined && (
                            <span className="pa-nav-subcount">{count}</span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`pa-nav-link${active ? " active" : ""}`}
              title={item.label}
            >
              <span style={{ flexShrink: 0 }}>
                <Icon size={18} />
              </span>
              {expanded && <span>{item.label}</span>}
            </Link>
          );
        })}

        {dynamicItems.length > 0 && (
          <>
            <div
              style={{
                height: 1,
                background: "var(--border, #e2e8f0)",
                margin: expanded ? "12px 16px" : "12px 8px",
              }}
              aria-hidden
            />
            {dynamicItems.map((item) => {
              const isInbox = item.menuKey === "inbox";
              const label = isInbox ? "Inbox" : item.label;
              const resolvedHref = isInbox
                ? `${base}/inbox-items`
                : item.route;
              const active = isInbox
                ? pathname.includes("/inbox-items")
                : pathname.includes(item.route);
              return (
                <Link
                  key={item.id}
                  href={resolvedHref}
                  className={`pa-nav-link${active ? " active" : ""}`}
                  title={label}
                >
                  <span style={{ flexShrink: 0 }}>
                    <LayoutGrid size={18} />
                  </span>
                  {expanded && <span>{label}</span>}
                </Link>
              );
            })}
          </>
        )}

          <div className="pa-nav-group pa-nav-group--engagement">
            {expanded && <div className="pa-nav-section">Engagement</div>}
            <Link
            href={`${base}/connect/wall`}
              className={`pa-nav-link pa-nav-link--engagement${pathname.includes("/connect") ? " active" : ""}`}
              title={connectCount > 0 ? `Connect (${connectCount} unseen)` : "Connect"}
            >
              <span style={{ flexShrink: 0, display: "flex", alignItems: "center", position: "relative" }}>
                <MessagesSquare size={18} />
                {!expanded && connectCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: -4,
                      right: -4,
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: "#1d4ed8",
                    }}
                  />
                )}
              </span>
              {expanded && (
                <span className="pa-nav-link-content">
                  <span>Connect</span>
                  {connectCount > 0 && (
                    <span className="pa-nav-badge-count">{connectCount > 99 ? "99+" : connectCount}</span>
                  )}
                </span>
              )}
            </Link>
          </div>
      </nav>

      <div className="pa-drawer-footer">
        <button type="button" className="pa-signout-btn" onClick={onLogout}>
          <LogOut size={14} style={{ flexShrink: 0 }} />
          {expanded && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
