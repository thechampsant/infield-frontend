"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  Bell,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  Copy,
  LogOut,
  Lock,
  Mail,
  Phone,
  User,
  X,
} from "lucide-react";
import { InfieldBrandLogo } from "@/components/brand/infield-brand-logo";
import { projectAdminBase } from "@/lib/nav/nav";
import { cn } from "@/lib/utils/cn";
import { copyTextToClipboard } from "@/lib/utils/copy-to-clipboard";
import type { PaProfile } from "@/components/project-admin/project-admin-drawer";

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

function titleCaseSegment(segment: string): string {
  return segment
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function projectBreadcrumbs(
  pathname: string,
  projectName: string,
  base: string,
): Array<{ label: string; href?: string }> {
  const tail = pathname.slice(base.length).split("/").filter(Boolean);
  if (tail.length === 0) {
    return [{ label: projectName }];
  }

  const crumbs: Array<{ label: string; href?: string }> = [
    { label: projectName, href: base },
  ];

  let href = base;
  tail.forEach((segment, index) => {
    href += `/${segment}`;
    const label = titleCaseSegment(segment);
    crumbs.push(
      index === tail.length - 1 ? { label } : { label, href },
    );
  });

  return crumbs;
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
  const [copied, setCopied] = useState(false);
  const textToCopy = copyValue?.trim() ?? "";

  async function handleCopy() {
    if (!textToCopy) return;
    const ok = await copyTextToClipboard(textToCopy);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="pf-card">
      <div className={cn("pf-card-icon", `pf-card-icon--${tone}`)}>{icon}</div>
      <div className="pf-card-content">
        <div className="pf-card-label">{label}</div>
        <div className="pf-card-value">{value}</div>
      </div>
      {textToCopy ? (
        <button
          type="button"
          className={cn("pf-copy", copied && "pf-copy--copied")}
          aria-label={copied ? `${label} copied` : `Copy ${label}`}
          onClick={() => {
            void handleCopy();
          }}
        >
          {copied ? <Check /> : <Copy />}
        </button>
      ) : null}
    </div>
  );
}

export function ProjectAdminTopbar({
  profile,
  projectName,
  accountName,
  accountCode,
  projectCode,
  onSignOut,
}: {
  profile: PaProfile;
  projectName: string;
  accountName: string;
  accountCode: string;
  projectCode: string;
  onSignOut: () => void;
}) {
  const pathname = usePathname() ?? "/";
  const [profileOpen, setProfileOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const base = projectAdminBase(accountCode, projectCode);
  const notificationsHref = `${base}/notifications`;
  const notifActive =
    pathname === notificationsHref ||
    pathname.startsWith(`${notificationsHref}/`);
  const breadcrumbs = useMemo(
    () => projectBreadcrumbs(pathname, projectName, base),
    [pathname, projectName, base],
  );

  const profileName = profile.name;
  const profileRole =
    profile.designation || profile.role || `${projectName} · Admin`;
  const initials = initialsFromName(profileName);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!profileOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setProfileOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [profileOpen]);

  return (
    <>
      <div className="if2-app pa-topbar-host">
        <header className="topbar">
          <div className="tb-left">
            <Link href={base} className="tb-brand" aria-label="Go to project home">
              <div className="infield-brand-wordmark-wrap">
                <InfieldBrandLogo variant="wordmark" theme="auto" size="topbar" />
                <div className="tb-brand-tag">{accountName || projectName}</div>
              </div>
            </Link>
            <div className="tb-divider" />
            <nav className="breadcrumb">
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <span
                    key={`${crumb.label}-${idx}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "var(--if2-sp-4)",
                    }}
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
            <Link
              href={notificationsHref}
              className={cn("tb-icon-btn", notifActive && "active-nav")}
              aria-label="Notifications"
            >
              <Bell />
            </Link>

            <button
              type="button"
              className={cn("name-card", profileOpen && "active-nav")}
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
      </div>

      {portalReady && profileOpen
        ? createPortal(
            <div className="if2-app" style={{ minHeight: 0 }}>
              <div
                className="pf-overlay"
                role="dialog"
                aria-modal="true"
                aria-labelledby="paTopbarProfileTitle"
                onClick={(e) => {
                  if (e.target === e.currentTarget) setProfileOpen(false);
                }}
              >
                <aside className="pf-drawer">
                  <div className="pf-hero">
                    <div className="pf-hero-top">
                      <div className="pf-eyebrow" id="paTopbarProfileTitle">
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
                        value={profileName}
                        tone="blue"
                      />
                      <ProfileInfoCard
                        icon={<Phone />}
                        label="Mobile"
                        value={profile.mobile || "Not available"}
                        copyValue={profile.mobile || undefined}
                        tone="green"
                      />
                      <ProfileInfoCard
                        icon={<Mail />}
                        label="E-Mail ID"
                        value={profile.email || "Not available"}
                        copyValue={profile.email || undefined}
                        tone="indigo"
                      />
                      <ProfileInfoCard
                        icon={<Lock />}
                        label="Login ID"
                        value={profile.employeeId || "Not available"}
                        copyValue={profile.employeeId || undefined}
                        tone="slate"
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
                        value={profile.designation || "Not available"}
                        tone="amber"
                      />
                      <ProfileInfoCard
                        icon={<CalendarDays />}
                        label="Date Of Joining"
                        value={
                          formatProfileDate(profile.dateOfJoining) ||
                          "Not available"
                        }
                        tone="violet"
                      />
                      <ProfileInfoCard
                        icon={<Building2 />}
                        label="Organization"
                        value={accountName || projectName}
                        tone="slate"
                      />
                    </div>

                    <button
                      type="button"
                      className="pf-signout"
                      onClick={() => {
                        setProfileOpen(false);
                        onSignOut();
                      }}
                    >
                      <LogOut />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </aside>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
