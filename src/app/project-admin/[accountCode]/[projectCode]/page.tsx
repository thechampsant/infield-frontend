"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { InfieldSplash } from "@/components/brand/infield-splash";
import { useAuth } from "@/lib/auth/auth-context";
import { projectAdminLandingPath } from "@/lib/auth/permissions";

/**
 * Project admin root: land on Uploaders for setup users, Reports for report-only.
 */
export default function ProjectAdminRootPage() {
  const router = useRouter();
  const params = useParams<{ accountCode: string; projectCode: string }>();
  const { user, isLoading } = useAuth();
  const accountCode = params.accountCode;
  const projectCode = params.projectCode;

  useEffect(() => {
    if (isLoading || !accountCode || !projectCode) return;
    router.replace(projectAdminLandingPath(accountCode, projectCode, user));
  }, [isLoading, accountCode, projectCode, user, router]);

  return <InfieldSplash message="Loading" />;
}
