"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";

/**
 * Root page - redirects based on authentication status.
 * Authenticated users go to super-admin dashboard.
 * Unauthenticated users go to login page.
 */
export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace("/super-admin");
      } else {
        router.replace("/login");
      }
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading while determining redirect
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-3 border-[var(--orca-surface-3)] border-t-[var(--orca-brand)]" />
        <p className="text-sm text-[var(--orca-text-3)]">Loading Singularity...</p>
      </div>
    </main>
  );
}
