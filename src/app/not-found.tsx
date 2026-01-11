"use client";

import Link from "next/link";
import { Construction, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Custom 404 page - shows "In Development" message.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-1/4 -top-1/4 h-[500px] w-[500px] rounded-full bg-[var(--orca-brand-3)]/5 blur-3xl" />
        <div className="absolute -bottom-1/4 -right-1/4 h-[400px] w-[400px] rounded-full bg-[var(--orca-brand)]/5 blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Icon */}
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-[var(--orca-brand-3-light)] to-[var(--orca-brand-3-light)]/50 shadow-lg">
          <Construction className="h-12 w-12 text-[var(--orca-brand-3)]" />
        </div>

        {/* Status badge */}
        <div className="mb-4 flex items-center gap-2 rounded-full bg-[var(--orca-surface)] px-4 py-2 text-sm font-medium text-[var(--orca-brand-3)] shadow-sm border border-[var(--orca-border)]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--orca-brand-3)]" />
          In Development
        </div>

        {/* Title */}
        <h1 className="mb-3 text-3xl font-bold text-[var(--orca-text)] sm:text-4xl">
          Page Under Construction
        </h1>

        {/* Description */}
        <p className="mb-8 max-w-md text-[var(--orca-text-3)]">
          This page is currently being developed and will be available soon.
          Check back later or return to the dashboard.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/">
            <Button variant="primary" size="lg">
              <Home className="h-4 w-4" />
              Go to Dashboard
            </Button>
          </Link>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => window.history.back()}
          >
            Go Back
          </Button>
        </div>

        {/* Footer */}
        <p className="mt-12 text-xs text-[var(--orca-text-3)]">
          Singularity • Under Active Development
        </p>
      </div>
    </main>
  );
}

