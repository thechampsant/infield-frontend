"use client";

import { Construction, Rocket } from "lucide-react";

interface ComingSoonProps {
  title?: string;
  description?: string;
  icon?: "construction" | "rocket";
}

/**
 * Coming Soon placeholder for features not yet available.
 */
export function ComingSoon({
  title = "Coming Soon",
  description = "This feature is currently under development and will be available soon.",
  icon = "construction",
}: ComingSoonProps) {
  const IconComponent = icon === "rocket" ? Rocket : Construction;

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--orca-border)] bg-[var(--orca-surface)] p-12">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--orca-brand-3-light)] to-[var(--orca-brand-3-light)]/50">
        <IconComponent className="h-10 w-10 text-[var(--orca-brand-3)]" />
      </div>
      <h2 className="mb-2 text-xl font-semibold text-[var(--orca-text)]">
        {title}
      </h2>
      <p className="max-w-md text-center text-sm text-[var(--orca-text-3)]">
        {description}
      </p>
      <div className="mt-6 flex items-center gap-2 rounded-full bg-[var(--orca-surface-2)] px-4 py-2 text-xs font-medium text-[var(--orca-text-2)]">
        <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--orca-brand-3)]" />
        In Development
      </div>
    </div>
  );
}

