"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Error boundary page for handling runtime errors.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console (could send to error reporting service)
    console.error("Application error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4">
      <div className="flex flex-col items-center text-center">
        {/* Icon */}
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--orca-brand-4-light)]">
          <AlertTriangle className="h-10 w-10 text-[var(--orca-brand-4)]" />
        </div>

        {/* Title */}
        <h1 className="mb-3 text-2xl font-bold text-[var(--orca-text)]">
          Something went wrong
        </h1>

        {/* Description */}
        <p className="mb-6 max-w-md text-sm text-[var(--orca-text-3)]">
          An unexpected error occurred. Please try again or contact support if
          the problem persists.
        </p>

        {/* Error details (development only) */}
        {process.env.NODE_ENV === "development" && (
          <div className="mb-6 max-w-lg rounded-lg bg-[var(--orca-surface-2)] p-4 text-left">
            <p className="mb-1 text-xs font-medium text-[var(--orca-text-3)]">
              Error Details:
            </p>
            <p className="font-mono text-xs text-[var(--orca-brand-4)]">
              {error.message}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="primary" onClick={reset}>
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
          <Button variant="secondary" onClick={() => (window.location.href = "/")}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    </main>
  );
}

