"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { isConnectAdmin } from "@/components/project-admin/connect/utils";
import type { BackendUser } from "@/lib/api/types";

export interface UseConnectPermissionOptions {
  /**
   * If true, non-admin users will be redirected to the rooms tab
   * and `isAuthorized` will only be true for admins after auth loads.
   */
  requireAdmin?: boolean;
}

export interface UseConnectPermissionResult {
  user: BackendUser | null;
  isAdmin: boolean;
  isProjectAdmin: boolean;
  isLoading: boolean;
  isAuthorized: boolean;
  currentUserName: string;
  senderDisplayName: string;
}

/**
 * Shared hook for permission checks, display names, and route gating across Connect.
 */
export function useConnectPermission(
  options?: UseConnectPermissionOptions,
): UseConnectPermissionResult {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const isAdmin = isConnectAdmin(user);

  useEffect(() => {
    if (options?.requireAdmin && !isLoading && !isAdmin) {
      const roomHref = pathname ? pathname.replace(/\/(wall|setting)\/?$/, "/room") : "";
      if (roomHref && router) {
        if (typeof router.replace === "function") {
          router.replace(roomHref);
        } else if (typeof router.push === "function") {
          router.push(roomHref);
        }
      }
    }
  }, [options?.requireAdmin, isLoading, isAdmin, pathname, router]);

  const currentUserName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Project Admin"
    : "Project Admin";

  const senderDisplayName = isAdmin
    ? "Program Team"
    : [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Member";

  const isAuthorized = !isLoading && (!options?.requireAdmin || isAdmin);

  return {
    user,
    isAdmin,
    isProjectAdmin: isAdmin,
    isLoading,
    isAuthorized,
    currentUserName,
    senderDisplayName,
  };
}
