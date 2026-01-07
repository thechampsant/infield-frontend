"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useTheme, type ThemePreference } from "@/components/theme/theme-provider";
import { useEffect, useRef, useState } from "react";

export function ThemeToggle({ className }: { className?: string }) {
  const { preference, setPreference, resolvedTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const options: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  const CurrentIcon = resolvedTheme === "dark" ? Moon : Sun;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Toggle theme"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--orca-text-2)] transition-colors hover:bg-[var(--orca-surface-2)] hover:text-[var(--orca-text)]",
          className
        )}
      >
        <CurrentIcon className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-36 overflow-hidden rounded-xl border border-[var(--orca-border)] bg-[var(--orca-surface)] py-1 shadow-lg">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setPreference(opt.value);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors",
                preference === opt.value
                  ? "bg-[var(--orca-brand-light)] text-[var(--orca-brand)]"
                  : "text-[var(--orca-text-2)] hover:bg-[var(--orca-surface-2)]"
              )}
            >
              <opt.icon className="h-4 w-4" />
              <span className="flex-1 text-left">{opt.label}</span>
              {preference === opt.value && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
