"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLeaveModuleEnabled } from "@/hooks/use-leave-module-enabled";
import { uploadersTabs } from "@/lib/nav/nav";
import { useProjectContext } from "@/lib/project-admin/project-context";

export function UploadersTabBar({
  accountCode,
  projectCode,
}: {
  accountCode: string;
  projectCode: string;
}) {
  const pathname = usePathname() ?? "/";
  const { projectId } = useProjectContext();
  const leaveEnabled = useLeaveModuleEnabled(projectId);
  const tabs = uploadersTabs(accountCode, projectCode, {
    leaveEnabled: leaveEnabled === true,
  });

  return (
    <nav className="tab-bar" aria-label="Uploaders sections">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`tab-btn${pathname.startsWith(tab.href) ? " active" : ""}`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
