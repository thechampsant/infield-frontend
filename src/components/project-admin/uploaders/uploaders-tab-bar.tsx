"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { uploadersTabs } from "@/lib/nav/nav";

export function UploadersTabBar({
  accountCode,
  projectCode,
}: {
  accountCode: string;
  projectCode: string;
}) {
  const pathname = usePathname() ?? "/";
  const tabs = uploadersTabs(accountCode, projectCode);

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
