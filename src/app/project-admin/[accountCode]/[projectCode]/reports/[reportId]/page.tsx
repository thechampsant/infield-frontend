"use client";

import { use } from "react";
import { ReportViewPage } from "@/components/reports/report-view/report-view-page";

export default function ViewReportPage({
  params,
}: {
  params: Promise<{ accountCode: string; projectCode: string; reportId: string }>;
}) {
  const { accountCode, projectCode, reportId } = use(params);

  return (
    <ReportViewPage
      accountCode={accountCode}
      projectCode={projectCode}
      reportId={reportId}
    />
  );
}
