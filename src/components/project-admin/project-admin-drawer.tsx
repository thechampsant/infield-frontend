"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  Settings,
  FileText,
  PieChart,
  LogOut,
  ChevronLeft,
} from "lucide-react";
import { projectAdminDrawerNav } from "@/lib/nav/nav";

const ICONS = {
  users: Users,
  settings: Settings,
  fileText: FileText,
  pieChart: PieChart,
} as const;

export function ProjectAdminDrawer({
  accountCode,
  projectCode,
  projectName,
  accountName,
  backHref,
  onLogout,
}: {
  accountCode: string;
  projectCode: string;
  projectName: string;
  accountName: string;
  backHref: string;
  onLogout: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const pathname = usePathname() ?? "/";
  const navItems = projectAdminDrawerNav(accountCode, projectCode);

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
