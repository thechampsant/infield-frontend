"use client";

import { use } from "react";
import { ReportBuilderPage } from "@/components/reports/report-builder/report-builder-page";

export default function EditReportPage({
  params,
}: {
  params: Promise<{ accountCode: string; projectCode: string; reportId: string }>;
}) {
  const { accountCode, projectCode, reportId } = use(params);

  return (
    <ReportBuilderPage
      accountCode={accountCode}
      projectCode={projectCode}
      reportId={reportId}
    />
  );
}
