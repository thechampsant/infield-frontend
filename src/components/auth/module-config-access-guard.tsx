"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { InfieldSplash } from "@/components/brand/infield-splash";
import { useAuth } from "@/lib/auth/auth-context";
import {
  adminAccessAreaForPath,
  firstAllowedAdminPath,
  hasAdminAccess,
} from "@/lib/auth/permissions";

/**
 * Web-only: redirects away from setup/module routes the user is not granted.
 * Super Admin / Account Admin keep all areas; Project Admin uses adminAccess.
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
  const area = adminAccessAreaForPath(pathname);
  const blocked = Boolean(area && !hasAdminAccess(user, area));

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    if (isLoading || !blocked) return;
    router.replace(firstAllowedAdminPath(accountCode, projectCode, user));
  }, [isLoading, blocked, accountCode, projectCode, router, user]);

  if (isLoading) {
    return <InfieldSplash message="Loading" />;
  }

  if (blocked) {
    return <InfieldSplash message="Redirecting" />;
  }

  return <>{children}</>;
}
