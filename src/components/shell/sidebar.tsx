"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { LogOut, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { NavSection } from "@/lib/nav/nav";
import { NAV_ICONS } from "@/lib/nav/icons";

export type UserInfo = {
  name: string;
  role: string;
  avatar?: string;
  onLogout?: () => void;
};

export function Sidebar({
  brandTitle,
  brandSubtitle,
  brandIcon,
  sections,
  activePath,
  user,
}: {
  brandTitle: string;
  brandSubtitle?: string;
  brandIcon?: React.ReactNode;
  sections: NavSection[];
  activePath: string;
  user?: UserInfo;
}) {
  return (
    <aside className="hidden h-screen w-[260px] flex-none flex-col border-r border-[var(--orca-border)] bg-[var(--orca-surface)] md:flex">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-5 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--orca-brand)] text-white shadow-sm">
          {brandIcon ?? <span className="text-lg font-bold">W</span>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-[var(--orca-text)]">
            {brandTitle}
          </div>
          {brandSubtitle && (
            <div className="truncate text-xs text-[var(--orca-text-3)]">
              {brandSubtitle}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {sections.map((section, idx) => (
          <div key={`${section.title ?? "root"}-${idx}`} className="mb-4">
            {section.title && (
              <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--orca-text-3)]">
                {section.title}
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active =
                  item.href === "/super-admin" ||
                  item.href === "/account-admin" ||
                  item.href.endsWith(`/${activePath.split("/").pop()}`)
                    ? activePath === item.href
                    : activePath === item.href || activePath.startsWith(`${item.href}/`);
                const Icon = item.icon ? NAV_ICONS[item.icon] : undefined;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                      active
                        ? "bg-[var(--orca-brand-light)] text-[var(--orca-brand)]"
                        : "text-[var(--orca-text-2)] hover:bg-[var(--orca-surface-2)] hover:text-[var(--orca-text)]"
                    )}
                  >
                    {/* Active indicator dot */}
                    {active && (
                      <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-[var(--orca-brand)]" />
                    )}
                    
                    {Icon && (
                      <Icon
                        className={cn(
                          "h-[18px] w-[18px] flex-shrink-0",
                          active ? "text-[var(--orca-brand)]" : "text-[var(--orca-text-3)] group-hover:text-[var(--orca-text-2)]"
                        )}
                      />
                    )}
                    <span className="flex-1 truncate">{item.label}</span>
                    
                    {/* Badge */}
                    {item.badge !== undefined && (
                      <span
                        className={cn(
                          "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                          active
                            ? "bg-[var(--orca-brand)] text-white"
                            : "bg-[var(--orca-brand-light)] text-[var(--orca-brand)]"
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Card Footer */}
      {user && <UserCard user={user} />}
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────
// User Card Component with Dropdown
// ─────────────────────────────────────────────────────────────

function UserCard({ user }: { user: UserInfo }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="relative border-t border-[var(--orca-border)] p-3">
      <div className="flex items-center gap-3 rounded-lg p-2 hover:bg-[var(--orca-surface-2)] transition-colors cursor-pointer">
        <div className="relative h-9 w-9 overflow-hidden rounded-full bg-[var(--orca-surface-2)]">
          {user.avatar ? (
            <Image
              src={user.avatar}
              alt={user.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--orca-brand)] to-[var(--orca-brand-2)] text-sm font-semibold text-white">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-[var(--orca-text)]">
            {user.name}
          </div>
          <div className="truncate text-xs text-[var(--orca-text-3)]">
            {user.role}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowMenu(!showMenu)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--orca-text-3)] hover:bg-[var(--orca-surface-3)] hover:text-[var(--orca-text-2)] transition-colors"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>

      {/* Dropdown Menu */}
      {showMenu && (
        <>
          {/* Backdrop to close menu */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          {/* Menu */}
          <div className="absolute bottom-full left-3 right-3 z-50 mb-2 rounded-lg border border-[var(--orca-border)] bg-[var(--orca-surface)] py-1 shadow-lg">
            <button
              type="button"
              onClick={() => {
                setShowMenu(false);
                user.onLogout?.();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--orca-brand-4)] hover:bg-[var(--orca-brand-4-light)] transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
