"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { InfieldSplash } from "@/components/brand/infield-splash";
import { useAuth } from "@/lib/auth/auth-context";
import { resolveLandingRouteForCurrentUser } from "@/lib/auth/role-routing";

/**
 * Root page - redirects based on authentication status.
 */
export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    let cancelled = false;

    if (!isLoading) {
      if (isAuthenticated) {
        void resolveLandingRouteForCurrentUser(user).then((route) => {
          if (!cancelled) router.replace(route);
        });
      } else {
        router.replace("/login");
      }
    }

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading, user, router]);

  return <InfieldSplash message="Loading" />;
}
