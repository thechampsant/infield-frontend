"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orca-brand)] focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-60",
        // Sizes
        size === "sm" && "h-8 px-3 text-sm",
        size === "md" && "h-9 px-4 text-sm",
        size === "lg" && "h-11 px-5 text-base",
        // Variants
        variant === "primary" &&
          "bg-[var(--orca-brand)] text-white shadow-sm hover:bg-[color-mix(in_srgb,var(--orca-brand)_90%,black)] active:scale-[0.98]",
        variant === "secondary" &&
          "border border-[var(--orca-border)] bg-[var(--orca-surface)] text-[var(--orca-text)] shadow-sm hover:bg-[var(--orca-surface-2)]",
        variant === "ghost" &&
          "text-[var(--orca-text-2)] hover:bg-[var(--orca-surface-2)] hover:text-[var(--orca-text)]",
        variant === "danger" &&
          "bg-[var(--orca-brand-4)] text-white shadow-sm hover:bg-[color-mix(in_srgb,var(--orca-brand-4)_90%,black)]",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
