"use client";

import { use } from "react";
import { ReportListingPage } from "@/components/reports/report-listing/report-listing-page";

export default function ReportsPage({
  params,
}: {
  params: Promise<{ accountCode: string; projectCode: string }>;
}) {
  const { accountCode, projectCode } = use(params);

  return (
    <ReportListingPage accountCode={accountCode} projectCode={projectCode} />
  );
}
