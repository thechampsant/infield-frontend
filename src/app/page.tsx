"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { InfieldSplash } from "@/components/brand/infield-splash";
import { useAuth } from "@/lib/auth/auth-context";
import { landingRouteForUser } from "@/lib/auth/role-routing";

/**
 * Root page - redirects based on authentication status.
 */
export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace(landingRouteForUser(user));
      } else {
        router.replace("/login");
      }
    }
  }, [isAuthenticated, isLoading, user, router]);

  return <InfieldSplash message="Loading" />;
}
