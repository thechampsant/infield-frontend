"use client";

import { use } from "react";
import { ProjectAdminShell } from "@/components/project-admin/project-admin-shell";

export default function ProjectAdminLayout({
  params,
  children,
}: {
  params: Promise<{ accountCode: string; projectCode: string }>;
  children: React.ReactNode;
}) {
  const { accountCode, projectCode } = use(params);

  return (
    <ProjectAdminShell accountCode={accountCode} projectCode={projectCode}>
      {children}
    </ProjectAdminShell>
  );
}
