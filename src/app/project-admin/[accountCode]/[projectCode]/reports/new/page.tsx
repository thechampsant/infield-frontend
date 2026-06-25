"use client";

import { use } from "react";
import { ReportBuilderPage } from "@/components/reports/report-builder/report-builder-page";

export default function NewReportPage({
  params,
}: {
  params: Promise<{ accountCode: string; projectCode: string }>;
}) {
  const { accountCode, projectCode } = use(params);

  return (
    <ReportBuilderPage accountCode={accountCode} projectCode={projectCode} />
  );
}
