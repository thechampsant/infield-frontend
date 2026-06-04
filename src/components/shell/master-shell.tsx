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
import {
  Bell,
  Briefcase,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  Copy,
  LogOut,
  Mail,
  Phone,
  User,
  X,
} from "lucide-react";
import { InfieldBrandLogo } from "@/components/brand/infield-brand-logo";
import { authService } from "@/lib/api/auth-service";
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

interface ProfileData {
  fullName: string;
  designation: string;
  mobile: string;
  email: string;
  dateOfJoining: string;
  company: string;
  raw: Record<string, unknown>;
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
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  const breadcrumbs = override ?? defaultBreadcrumbs(pathname);
  const profileName = profile?.fullName || user?.name || "Super Admin";
  const profileRole = profile?.designation || user?.role || brandTag;
  const initials = profileName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "SA";

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

  useEffect(() => {
    let active = true;
    authService
      .getMe()
      .then((response) => {
        if (!active) return;
        setProfile(normalizeProfile(response));
      })
      .catch(() => {
        if (!active) return;
        setProfile(null);
      });
    return () => {
      active = false;
    };
  }, []);

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

                <button
                  type="button"
                  className={cn("name-card", (profileActive || profileOpen) && "active-nav")}
                  aria-label="Profile"
                  onClick={() => setProfileOpen(true)}
                >
                  <div className="nc-avatar">
                    {initials}
                    <div className="nc-status" />
                  </div>
                  <div className="nc-text">
                    <div className="nc-name">{profileName}</div>
                    <div className="nc-role">{profileRole}</div>
                  </div>
                  <span className="nc-caret" aria-hidden="true">
                    <ChevronDown />
                  </span>
                </button>
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

        {profileOpen && (
          <div
            className="pf-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profileTitle"
            onClick={(e) => {
              if (e.target === e.currentTarget) setProfileOpen(false);
            }}
          >
            <aside className="pf-drawer">
              <div className="pf-hero">
                <div className="pf-hero-top">
                  <div className="pf-eyebrow" id="profileTitle">
                    My Profile
                  </div>
                  <button
                    type="button"
                    className="pf-close"
                    onClick={() => setProfileOpen(false)}
                    aria-label="Close profile"
                  >
                    <X />
                  </button>
                </div>

                <div className="pf-hero-main">
                  <div className="pf-avatar">{initials}</div>
                  <div className="pf-hero-copy">
                    <div className="pf-name">{profileName}</div>
                    <div className="pf-sub">{profileRole}</div>
                  </div>
                </div>
              </div>

              <div className="pf-body">
                <div className="pf-stack">
                  <ProfileInfoCard
                    icon={<User />}
                    label="Full Name"
                    value={profile?.fullName || profileName}
                    tone="blue"
                  />
                  <ProfileInfoCard
                    icon={<Phone />}
                    label="Mobile"
                    value={profile?.mobile || "Not available"}
                    copyValue={profile?.mobile}
                    tone="green"
                  />
                  <ProfileInfoCard
                    icon={<Mail />}
                    label="E-Mail ID"
                    value={profile?.email || "Not available"}
                    copyValue={profile?.email}
                    tone="indigo"
                  />
                </div>

                <div className="pf-section">
                  <div className="pf-section-title">
                    <Briefcase />
                    <span>Work Information</span>
                  </div>
                  <ProfileInfoCard
                    icon={<Briefcase />}
                    label="Designation"
                    value={profile?.designation || "Not available"}
                    tone="amber"
                  />
                  <ProfileInfoCard
                    icon={<CalendarDays />}
                    label="Date Of Joining"
                    value={formatProfileDate(profile?.dateOfJoining) || "Not available"}
                    tone="violet"
                  />
                  <ProfileInfoCard
                    icon={<Building2 />}
                    label="Organization"
                    value={profile?.company || brandTag}
                    tone="slate"
                  />
                </div>

                <button
                  type="button"
                  className="pf-signout"
                  onClick={() => {
                    setProfileOpen(false);
                    setSignOutOpen(true);
                  }}
                >
                  <LogOut />
                  <span>Sign Out</span>
                </button>
              </div>
            </aside>
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

function normalizeProfile(value: unknown): ProfileData {
  const raw = (value ?? {}) as Record<string, unknown>;
  const first = stringValue(raw.firstName);
  const last = stringValue(raw.lastName);
  const fullName =
    [first, last].filter(Boolean).join(" ") ||
    stringValue(raw.name) ||
    stringValue(raw.fullName) ||
    stringValue(raw.displayName) ||
    stringValue(raw.email).split("@")[0] ||
    "User";

  return {
    fullName,
    designation:
      stringValue(raw.designation) ||
      stringValue(raw.designationName) ||
      stringValue(raw.jobTitle) ||
      stringValue(raw.role) ||
      "Not available",
    mobile:
      stringValue(raw.mobile) ||
      stringValue(raw.phone) ||
      stringValue(raw.phoneNumber) ||
      stringValue(raw.contactNumber),
    email: stringValue(raw.email),
    dateOfJoining:
      stringValue(raw.dateOfJoining) ||
      stringValue(raw.joiningDate) ||
      stringValue(raw.createdAt),
    company:
      stringValue(raw.companyName) ||
      stringValue(raw.accountName) ||
      stringValue(raw.organizationName) ||
      stringValue(raw.clientName),
    raw,
  };
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function formatProfileDate(value?: string): string {
  const raw = stringValue(value);
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function ProfileInfoCard({
  icon,
  label,
  value,
  copyValue,
  tone = "blue",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  copyValue?: string;
  tone?: "blue" | "green" | "indigo" | "amber" | "violet" | "slate";
}) {
  return (
    <div className="pf-card">
      <div className={cn("pf-card-icon", `pf-card-icon--${tone}`)}>{icon}</div>
      <div className="pf-card-content">
        <div className="pf-card-label">{label}</div>
        <div className="pf-card-value">{value}</div>
      </div>
      {copyValue ? (
        <button
          type="button"
          className="pf-copy"
          aria-label={`Copy ${label}`}
          onClick={() => {
            void navigator.clipboard?.writeText(copyValue);
          }}
        >
          <Copy />
        </button>
      ) : null}
    </div>
  );
}

function defaultBreadcrumbs(pathname: string): Breadcrumb[] {
  if (pathname.startsWith("/workspace")) {
    const crumbs: Breadcrumb[] = [
      { label: "Workspace", href: "/workspace" },
    ];
    const workspaceSection = workspaceModuleLabel(pathname);
    if (workspaceSection) crumbs.push({ label: workspaceSection });
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
