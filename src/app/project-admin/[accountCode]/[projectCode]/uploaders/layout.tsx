"use client";

import { use } from "react";
import { UploadersTabBar } from "@/components/project-admin/uploaders/uploaders-tab-bar";
import { UploadersSetupChecklist } from "@/components/project-admin/uploaders/uploaders-setup-checklist";

export default function UploadersLayout({
  params,
  children,
}: {
  params: Promise<{ accountCode: string; projectCode: string }>;
  children: React.ReactNode;
}) {
  const { accountCode, projectCode } = use(params);

  return (
    <div className="pa-uploaders-layout">
      <div className="pa-eyebrow" style={{ marginBottom: 12 }}>
        Uploaders
      </div>
      <UploadersSetupChecklist
        accountCode={accountCode}
        projectCode={projectCode}
      />
      <UploadersTabBar accountCode={accountCode} projectCode={projectCode} />
      {children}
    </div>
  );
}
