"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { InfieldSplash } from "@/components/brand/infield-splash";
import { useAuth } from "@/lib/auth/auth-context";

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Wrapper component that redirects to login if user is not authenticated.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return <InfieldSplash message="Loading" />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
