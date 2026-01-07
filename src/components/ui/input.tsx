"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-lg border border-[var(--orca-border)] bg-[var(--orca-surface)] px-3 text-sm text-[var(--orca-text)] placeholder:text-[var(--orca-text-3)]",
          "transition-colors",
          "focus:border-[var(--orca-brand)] focus:outline-none focus:ring-2 focus:ring-[var(--orca-brand)]/20",
          "disabled:cursor-not-allowed disabled:opacity-60",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
