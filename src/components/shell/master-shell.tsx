"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Check, LogOut } from "lucide-react";
import { InfieldBrandLogo } from "@/components/brand/infield-brand-logo";
import { cn } from "@/lib/utils/cn";
import { NAV_ICONS } from "@/lib/nav/icons";
import type { NavSection } from "@/lib/nav/nav";

export type Breadcrumb = { label: string; href?: string };

// Pages can override the trailing breadcrumbs (e.g. account detail name).
const BreadcrumbContext = createContext<(items: Breadcrumb[] | null) => void>(
  () => {},
);

/**
 * Sets the topbar breadcrumbs for the current page. Pass null to fall back
 * to the default crumbs derived from the pathname.
 */
export function useSetBreadcrumbs(items: Breadcrumb[] | null) {
  const setBreadcrumbs = useContext(BreadcrumbContext);
  const key = items ? items.map((i) => `${i.label}:${i.href ?? ""}`).join("|") : "";
  useEffect(() => {
    setBreadcrumbs(items);
    return () => setBreadcrumbs(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, setBreadcrumbs]);
}

interface ShellUser {
  name: string;
  role: string;
}

export interface ClientBrandDisplay {
  logoUrl: string;
  name: string;
}

export function MasterShell({
  sections,
  user,
  brandTag = "V5 Global · Admin",
  onLogout,
  children,
  notificationCount = 0,
  clientBrand = null,
  notificationsHref,
  profileHref,
  homeHref = "/super-admin",
}: {
  sections: NavSection[];
  user?: ShellUser;
  brandTag?: string;
  onLogout?: () => void;
  children: ReactNode;
  notificationCount?: number;
  clientBrand?: ClientBrandDisplay | null;
  notificationsHref?: string;
  profileHref?: string;
  homeHref?: string;
}) {
  const pathname = usePathname() ?? "/";
  const [collapsed, setCollapsed] = useState(false);
  const [override, setOverride] = useState<Breadcrumb[] | null>(null);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [signedOut, setSignedOut] = useState(false);

  const breadcrumbs = override ?? defaultBreadcrumbs(pathname);
  const initials = (user?.name ?? "SA").slice(0, 2).toUpperCase();

  const notifActive = Boolean(
    notificationsHref &&
      (pathname === notificationsHref ||
        pathname.startsWith(`${notificationsHref}/`)),
  );
  const profileActive = Boolean(
    profileHref &&
      (pathname === profileHref || pathname.startsWith(`${profileHref}/`)),
  );

  // Esc closes the sign-out modal.
  useEffect(() => {
    if (!signOutOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSignOutOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [signOutOpen]);

  function confirmSignOut() {
    setSignOutOpen(false);
    setSignedOut(true);
    // Show the signed-out screen briefly, then hand off to the layout's
    // logout handler (which clears the session and redirects to /login).
    window.setTimeout(() => {
      onLogout?.();
    }, 3500);
  }

  return (
    <BreadcrumbContext.Provider value={setOverride}>
      <div className="if2-app">
        <div className={cn("app", collapsed && "collapsed")}>
          {/* Drawer */}
          <aside className="drawer">
            <div className="drawer-head">
              <button
                type="button"
                className="ham-toggle"
                aria-label="Toggle menu"
                aria-expanded={!collapsed}
                onClick={() => setCollapsed((v) => !v)}
              >
                <div className="ham-bars">
                  <span />
                  <span />
                  <span />
                </div>
              </button>
              <span className="ham-label">Menu</span>
            </div>

            <nav className="drawer-body">
              {sections.map((section, idx) => (
                <div key={`${section.title ?? "root"}-${idx}`}>
                  {section.title && (
                    <div className="section-label">{section.title}</div>
                  )}
                  {section.items.map((item) => {
                    const active =
                      pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);
                    const Icon = item.icon ? NAV_ICONS[item.icon] : undefined;
                    const showBadge =
                      item.badge !== undefined &&
                      item.badge !== null &&
                      item.badge !== 0 &&
                      item.badge !== "0";
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn("nav-item", active && "active")}
                      >
                        {Icon && <Icon className="nav-icon" />}
                        <span className="nav-text">{item.label}</span>
                        {showBadge && (
                          <span className="nav-badge">{item.badge}</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>

            <div className="drawer-foot">
              <button
                type="button"
                className="signout-btn"
                onClick={() => setSignOutOpen(true)}
              >
                <LogOut />
                <span className="nav-text">Sign Out</span>
              </button>
            </div>
          </aside>

          {/* Main */}
          <div className="main">
            <header className="topbar">
              <div className="tb-left">
                <Link href={homeHref} className="tb-brand" aria-label="Go to home">
                  <div className="infield-brand-wordmark-wrap">
                    <InfieldBrandLogo variant="wordmark" theme="auto" size="topbar" />
                    <div className="tb-brand-tag">{brandTag}</div>
                  </div>
                </Link>
                <div className="tb-divider" />
                <nav className="breadcrumb">
                  {breadcrumbs.map((crumb, idx) => {
                    const isLast = idx === breadcrumbs.length - 1;
                    return (
                      <span
                        key={`${crumb.label}-${idx}`}
                        style={{ display: "inline-flex", alignItems: "center", gap: "var(--if2-sp-4)" }}
                      >
                        {idx > 0 && <span className="bc-sep">›</span>}
                        {crumb.href && !isLast ? (
                          <Link href={crumb.href} className="bc-link">
                            {crumb.label}
                          </Link>
                        ) : (
                          <span className={isLast ? "bc-current" : "bc-link"}>
                            {crumb.label}
                          </span>
                        )}
                      </span>
                    );
                  })}
                </nav>
              </div>

              <div className="tb-right">
                {clientBrand?.logoUrl && (
                  <div
                    className="client-brand"
                    title={`Client: ${clientBrand.name}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={clientBrand.logoUrl} alt={clientBrand.name} />
                  </div>
                )}

                {notificationsHref && (
                  <Link
                    href={notificationsHref}
                    className={cn("tb-icon-btn", notifActive && "active-nav")}
                    aria-label="Notifications"
                  >
                    <Bell />
                    <span
                      className={cn("dot", notificationCount > 0 && "visible")}
                    />
                  </Link>
                )}

                {profileHref ? (
                  <Link
                    href={profileHref}
                    className={cn("name-card", profileActive && "active-nav")}
                    aria-label="Profile"
                  >
                    <div className="nc-avatar">
                      {initials}
                      <div className="nc-status" />
                    </div>
                    <div className="nc-text">
                      <div className="nc-name">{user?.name ?? "Super Admin"}</div>
                      <div className="nc-role">{user?.role ?? brandTag}</div>
                    </div>
                  </Link>
                ) : (
                  <div className="name-card">
                    <div className="nc-avatar">
                      {initials}
                      <div className="nc-status" />
                    </div>
                    <div className="nc-text">
                      <div className="nc-name">{user?.name ?? "Super Admin"}</div>
                      <div className="nc-role">{user?.role ?? brandTag}</div>
                    </div>
                  </div>
                )}
              </div>
            </header>

            {children}
          </div>
        </div>

        {/* Sign-out confirmation modal */}
        {signOutOpen && (
          <div
            className="so-modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="signoutTitle"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSignOutOpen(false);
            }}
          >
            <div className="so-modal-card">
              <div className="so-modal-icon-row">
                <div className="so-modal-icon-circle">
                  <LogOut />
                </div>
              </div>
              <div className="so-modal-body">
                <div className="so-modal-title" id="signoutTitle">
                  Sign Out?
                </div>
                <div className="so-modal-desc">
                  Are you sure you want to log out? You&apos;ll need to sign in
                  again to access your account and any unsynced data may be lost.
                </div>
              </div>
              <div className="so-modal-actions">
                <button
                  type="button"
                  className="so-btn so-btn-cancel"
                  onClick={() => setSignOutOpen(false)}
                >
                  No, Stay Logged In
                </button>
                <button
                  type="button"
                  className="so-btn so-btn-logout"
                  onClick={confirmSignOut}
                >
                  Yes, Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Signed-out full-screen confirmation */}
        {signedOut && (
          <div className="logged-out-screen visible" aria-live="polite">
            <div className="lo-check-circle">
              <Check />
            </div>
            <div className="lo-title">Signed Out</div>
            <div className="lo-sub">You&apos;ve been logged out successfully</div>
          </div>
        )}
      </div>
    </BreadcrumbContext.Provider>
  );
}

function defaultBreadcrumbs(pathname: string): Breadcrumb[] {
  if (pathname.startsWith("/workspace")) {
    const crumbs: Breadcrumb[] = [
      { label: "Workspace", href: "/workspace" },
    ];
    const module = workspaceModuleLabel(pathname);
    if (module) crumbs.push({ label: module });
    return crumbs;
  }

  if (pathname.startsWith("/account-admin")) {
    const crumbs: Breadcrumb[] = [{ label: "Setup" }];
    if (pathname.startsWith("/account-admin/projects")) {
      crumbs.push({ label: "Projects" });
    }
    return crumbs;
  }

  const crumbs: Breadcrumb[] = [
    { label: "Setup", href: "/super-admin/accounts" },
  ];
  if (pathname.startsWith("/super-admin/accounts")) {
    crumbs.push({ label: "Accounts", href: "/super-admin/accounts" });
    if (pathname !== "/super-admin/accounts") {
      crumbs.push({ label: "Detail" });
    }
  }
  return crumbs;
}

function workspaceModuleLabel(pathname: string): string | null {
  if (pathname === "/workspace" || pathname === "/workspace/") return "Overview";
  if (pathname.startsWith("/workspace/inbox")) return "Inbox";
  if (pathname.startsWith("/workspace/reports")) return "Reports";
  if (pathname.startsWith("/workspace/notifications")) return "Notifications";
  if (pathname.startsWith("/workspace/profile")) return "Profile";
  return null;
}
