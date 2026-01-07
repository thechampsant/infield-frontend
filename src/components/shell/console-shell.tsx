"use client";

import { usePathname } from "next/navigation";
import { Sidebar, type UserInfo } from "@/components/shell/sidebar";
import { Topbar, type BreadcrumbItem } from "@/components/shell/topbar";
import type { NavSection } from "@/lib/nav/nav";

export function ConsoleShell({
  brandTitle,
  brandSubtitle,
  brandIcon,
  sections,
  breadcrumbs,
  projectSelector,
  user,
  children,
  topbarRightSlot,
}: {
  brandTitle: string;
  brandSubtitle?: string;
  brandIcon?: React.ReactNode;
  sections: NavSection[];
  breadcrumbs?: BreadcrumbItem[];
  projectSelector?: {
    label: string;
    options?: { label: string; value: string }[];
    onChange?: (value: string) => void;
  };
  user?: UserInfo;
  topbarRightSlot?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "/";
  
  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      <Sidebar
        brandTitle={brandTitle}
        brandSubtitle={brandSubtitle}
        brandIcon={brandIcon}
        sections={sections}
        activePath={pathname}
        user={user}
      />
      <div className="min-w-0 flex-1 flex flex-col">
        <Topbar
          breadcrumbs={breadcrumbs}
          projectSelector={projectSelector}
          rightSlot={topbarRightSlot}
        />
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
