"use client";

import Link from "next/link";
import { projectAdminBase } from "@/lib/nav/nav";

export function DesignationsRequiredBanner({
  accountCode,
  projectCode,
}: {
  accountCode: string;
  projectCode: string;
}) {
  const designationsHref = `${projectAdminBase(accountCode, projectCode)}/uploaders/designations`;

  return (
    <div className="pa-info-banner pa-designations-banner" role="status">
      <strong>Create designations first.</strong> Map each job title to a backend
      role before adding users.{" "}
      <Link href={designationsHref} className="pa-designations-banner-link">
        Go to Designations Master →
      </Link>
    </div>
  );
}
