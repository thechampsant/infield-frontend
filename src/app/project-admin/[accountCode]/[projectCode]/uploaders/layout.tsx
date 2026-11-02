"use client";

import { use } from "react";
import { UploadersSetupSidebar } from "@/components/project-admin/uploaders/uploaders-setup-sidebar";

export default function UploadersLayout({
  params,
  children,
}: {
  params: Promise<{ accountCode: string; projectCode: string }>;
  children: React.ReactNode;
}) {
  const { accountCode, projectCode } = use(params);

  return (
    <div className="pa-uploaders-layout-root">
      <div className="pa-eyebrow" style={{ marginBottom: 14 }}>
        Uploaders
      </div>
      <div className="pa-uploaders-workspace">
        <aside className="pa-uploaders-sidebar-wrap">
          <UploadersSetupSidebar
            accountCode={accountCode}
            projectCode={projectCode}
          />
        </aside>
        <div className="pa-uploaders-content-area">
          {children}
        </div>
      </div>
    </div>
  );
}

