"use client";

import { Bell, ChevronDown, ChevronRight, CircleHelp, Home } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function Topbar({
  breadcrumbs,
  projectSelector,
  rightSlot,
}: {
  breadcrumbs?: BreadcrumbItem[];
  projectSelector?: {
    label: string;
    options?: { label: string; value: string }[];
    onChange?: (value: string) => void;
  };
  rightSlot?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--orca-border)] bg-[var(--orca-surface)]">
      <div className="flex h-14 items-center justify-between px-6">
        {/* Left: Breadcrumbs */}
        <nav className="flex items-center gap-1.5 text-sm">
          <Link
            href="/"
            className="flex items-center justify-center text-[var(--orca-text-3)] hover:text-[var(--orca-text)] transition-colors"
          >
            <Home className="h-4 w-4" />
          </Link>
          {breadcrumbs?.map((item, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <ChevronRight className="h-4 w-4 text-[var(--orca-text-3)]" />
              {item.href ? (
                <Link
                  href={item.href}
                  className="text-[var(--orca-text-3)] hover:text-[var(--orca-text)] transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="font-medium text-[var(--orca-text)]">{item.label}</span>
              )}
            </div>
          ))}
        </nav>

        {/* Right: Project selector + actions */}
        <div className="flex items-center gap-2">
          {rightSlot}
          
          {/* Project Selector Dropdown */}
          {projectSelector && (
            <button
              type="button"
              className="flex h-9 items-center gap-2 rounded-lg border border-[var(--orca-border)] bg-[var(--orca-surface)] px-3 text-sm text-[var(--orca-text-2)] hover:bg-[var(--orca-surface-2)] hover:text-[var(--orca-text)] transition-colors"
            >
              <span className="max-w-[180px] truncate">{projectSelector.label}</span>
              <ChevronDown className="h-4 w-4 text-[var(--orca-text-3)]" />
            </button>
          )}
          
          <ThemeToggle />
          
          <IconBtn label="Notifications" hasNotification>
            <Bell className="h-4 w-4" />
          </IconBtn>
          <IconBtn label="Help">
            <CircleHelp className="h-4 w-4" />
          </IconBtn>
        </div>
      </div>
    </header>
  );
}

function IconBtn({
  children,
  label,
  className,
  hasNotification,
}: {
  children: React.ReactNode;
  label: string;
  className?: string;
  hasNotification?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--orca-text-2)] transition-colors hover:bg-[var(--orca-surface-2)] hover:text-[var(--orca-text)]",
        className
      )}
    >
      {children}
      {hasNotification && (
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
      )}
    </button>
  );
}
