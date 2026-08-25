"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  Settings,
  FileText,
  PieChart,
  LogOut,
  ChevronLeft,
  LayoutGrid,
} from "lucide-react";
import { projectAdminBase, projectAdminDrawerNav } from "@/lib/nav/nav";
import {
  dynamicMenuService,
  type DynamicMenuConfig,
} from "@/lib/api/dynamic-menu-service";
import { useAuth } from "@/lib/auth/auth-context";
import { canManageModules } from "@/lib/auth/permissions";

const ICONS = {
  users: Users,
  settings: Settings,
  fileText: FileText,
  pieChart: PieChart,
} as const;

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
  const navItems = projectAdminDrawerNav(accountCode, projectCode, {
    canManageModules: canManageModules(user),
  });

  // Dynamic menu items
  const [dynamicItems, setDynamicItems] = useState<DynamicMenuConfig[]>([]);

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

  return (
    <aside
      className={`pa-drawer ${expanded ? "pa-drawer--expanded" : "pa-drawer--collapsed"}`}
    >
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
        <Link href={backHref} className="pa-back-link">
          <ChevronLeft size={14} style={{ flexShrink: 0 }} />
          {expanded && <span>Back to Projects</span>}
        </Link>

        {expanded && <div className="pa-nav-section">Setup</div>}

        {navItems.map((item) => {
          const active =
            item.label === "Uploaders"
              ? pathname.includes("/uploaders/")
              : item.label === "Modules"
                ? pathname.includes("/modules")
                : pathname.startsWith(item.href);
          const Icon = ICONS[item.icon];
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

        {/* Dynamic menu items */}
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
              // Resolve route: inbox key goes to project-admin inbox-items page
              const base = projectAdminBase(accountCode, projectCode);
              const resolvedHref =
                item.menuKey === "inbox"
                  ? `${base}/inbox-items`
                  : item.route;
              const active =
                item.menuKey === "inbox"
                  ? pathname.includes("/inbox-items")
                  : pathname.includes(item.route);
              return (
                <Link
                  key={item.id}
                  href={resolvedHref}
                  className={`pa-nav-link${active ? " active" : ""}`}
                  title={item.label}
                >
                  <span style={{ flexShrink: 0 }}>
                    <LayoutGrid size={18} />
                  </span>
                  {expanded && <span>{item.label}</span>}
                </Link>
              );
            })}
          </>
        )}
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
