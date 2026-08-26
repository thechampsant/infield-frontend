"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { InfieldSplash } from "@/components/brand/infield-splash";
import { useAuth } from "@/lib/auth/auth-context";
import {
  canManageModules,
  isModuleConfigPath,
} from "@/lib/auth/permissions";
import { projectAdminBase } from "@/lib/nav/nav";

/**
 * Web-only: redirects away from setup/module routes when the user lacks
 * module-config:update. Reports stay open; Uploaders/Modules/etc. go to Reports.
 */
export function ModuleConfigAccessGuard({
  accountCode,
  projectCode,
  children,
}: {
  accountCode: string;
  projectCode: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const { user, isLoading, refreshUser } = useAuth();
  const allowed = canManageModules(user);
  const blocked = isModuleConfigPath(pathname) && !allowed;

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    if (isLoading || !blocked) return;
    const reportsHref = `${projectAdminBase(accountCode, projectCode)}/reports`;
    router.replace(reportsHref);
  }, [isLoading, blocked, accountCode, projectCode, router]);

  if (isLoading) {
    return <InfieldSplash message="Loading" />;
  }

  if (blocked) {
    return <InfieldSplash message="Redirecting" />;
  }

  return <>{children}</>;
}
