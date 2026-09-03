"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
  Mail,
  Phone,
  User,
  CalendarDays,
  X,
} from "lucide-react";
import { projectAdminBase, projectAdminDrawerNav } from "@/lib/nav/nav";
import {
  dynamicMenuService,
  type DynamicMenuConfig,
} from "@/lib/api/dynamic-menu-service";
import { useAuth } from "@/lib/auth/auth-context";
import {
  canNavigateBackToProjects,
  resolvedAdminAccess,
} from "@/lib/auth/permissions";

const ICONS = {
  users: Users,
  settings: Settings,
  fileText: FileText,
  pieChart: PieChart,
} as const;

export type PaProfile = {
  name: string;
  role: string;
  email: string;
  mobile: string;
  designation: string;
  dateOfJoining: string;
};

function initialsFromName(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "PA"
  );
}

function formatProfileDate(value?: string): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ProjectAdminDrawer({
  accountCode,
  projectCode,
  projectId,
  projectName,
  accountName,
  backHref,
  onLogout,
  profile,
}: {
  accountCode: string;
  projectCode: string;
  projectId: string;
  projectName: string;
  accountName: string;
  backHref: string;
  onLogout: () => void;
  profile: PaProfile;
}) {
  const [expanded, setExpanded] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const pathname = usePathname() ?? "/";
  const { user } = useAuth();
  const showBackToProjects = canNavigateBackToProjects(user);
  const navItems = projectAdminDrawerNav(accountCode, projectCode, {
    adminAccess: resolvedAdminAccess(user),
  });

  const [dynamicItems, setDynamicItems] = useState<DynamicMenuConfig[]>([]);

  useEffect(() => {
    setPortalReady(true);
  }, []);

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
    if (!profileOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setProfileOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [profileOpen]);

  const initials = initialsFromName(profile.name);
  const roleLine = profile.designation
    ? `${projectName} · ${profile.designation}`
    : profile.role || `${projectName} · Admin`;
  const dojDisplay = formatProfileDate(profile.dateOfJoining);

  const detailRows: Array<{ icon: typeof User; label: string; value: string }> =
    [];
  if (profile.name) {
    detailRows.push({ icon: User, label: "Full Name", value: profile.name });
  }
  if (profile.designation || roleLine) {
    detailRows.push({
      icon: Users,
      label: "Role",
      value: profile.designation || roleLine,
    });
  }
  if (profile.email) {
    detailRows.push({ icon: Mail, label: "E-Mail ID", value: profile.email });
  }
  if (profile.mobile) {
    detailRows.push({ icon: Phone, label: "Mobile", value: profile.mobile });
  }
  if (dojDisplay) {
    detailRows.push({
      icon: CalendarDays,
      label: "Date of Joining",
      value: dojDisplay,
    });
  }

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
        <button
          type="button"
          className="pa-profile-chip"
          onClick={() => setProfileOpen(true)}
          title={profile.name}
          aria-label={`Open profile for ${profile.name}`}
        >
          <span className="pa-profile-avatar" aria-hidden>
            {initials}
          </span>
          {expanded && (
            <span className="pa-profile-copy">
              <span className="pa-profile-name">{profile.name}</span>
              <span className="pa-profile-role">{roleLine}</span>
            </span>
          )}
        </button>

        <button type="button" className="pa-signout-btn" onClick={onLogout}>
          <LogOut size={14} style={{ flexShrink: 0 }} />
          {expanded && <span>Sign Out</span>}
        </button>
      </div>

      {portalReady && profileOpen
        ? createPortal(
            <div
              className="pa-profile-overlay"
              role="dialog"
              aria-modal="true"
              aria-labelledby="paProfileTitle"
              onClick={(e) => {
                if (e.target === e.currentTarget) setProfileOpen(false);
              }}
            >
              <aside className="pa-profile-panel">
                <div className="pa-profile-panel-hero">
                  <div className="pa-profile-panel-top">
                    <div className="pa-profile-panel-eyebrow" id="paProfileTitle">
                      My Profile
                    </div>
                    <button
                      type="button"
                      className="pa-profile-panel-close"
                      onClick={() => setProfileOpen(false)}
                      aria-label="Close profile"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="pa-profile-panel-main">
                    <div
                      className="pa-profile-avatar pa-profile-avatar--lg"
                      aria-hidden
                    >
                      {initials}
                    </div>
                    <div>
                      <div className="pa-profile-panel-name">{profile.name}</div>
                      <div className="pa-profile-panel-sub">{roleLine}</div>
                    </div>
                  </div>
                </div>

                <div className="pa-profile-panel-body">
                  {detailRows.map((row) => {
                    const Icon = row.icon;
                    return (
                      <div key={row.label} className="pa-profile-row">
                        <span className="pa-profile-row-icon" aria-hidden>
                          <Icon size={14} />
                        </span>
                        <div>
                          <div className="pa-profile-row-label">{row.label}</div>
                          <div className="pa-profile-row-value">{row.value}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </aside>
            </div>,
            document.body,
          )
        : null}
    </aside>
  );
}
