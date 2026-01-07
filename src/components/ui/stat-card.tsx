import { cn } from "@/lib/utils/cn";
import type { LucideIcon } from "lucide-react";

export type StatCardProps = {
  label: string;
  value: string | number;
  change?: {
    value: string;
    label: string;
    trend?: "up" | "down" | "neutral";
  };
  icon?: LucideIcon;
  iconColor?: "blue" | "green" | "amber" | "red";
  className?: string;
};

const iconColorMap = {
  blue: "bg-[var(--orca-brand-light)] text-[var(--orca-brand)]",
  green: "bg-[var(--orca-brand-2-light)] text-[var(--orca-brand-2)]",
  amber: "bg-[var(--orca-brand-3-light)] text-[var(--orca-brand-3)]",
  red: "bg-[var(--orca-brand-4-light)] text-[var(--orca-brand-4)]",
};

export function StatCard({
  label,
  value,
  change,
  icon: Icon,
  iconColor = "blue",
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between rounded-xl border border-[var(--orca-border)] bg-[var(--orca-surface)] p-5",
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-[var(--orca-text-3)]">{label}</div>
        <div className="mt-1 text-2xl font-bold text-[var(--orca-text)]">{value}</div>
        {change && (
          <div className="mt-2 flex items-center gap-1.5 text-sm">
            <span
              className={cn(
                "font-semibold",
                change.trend === "up" && "text-[var(--orca-brand-2)]",
                change.trend === "down" && "text-[var(--orca-brand-4)]",
                change.trend === "neutral" && "text-[var(--orca-text-3)]"
              )}
            >
              {change.value}
            </span>
            <span className="text-[var(--orca-text-3)]">{change.label}</span>
          </div>
        )}
      </div>
      {Icon && (
        <div
          className={cn(
            "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl",
            iconColorMap[iconColor]
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      )}
    </div>
  );
}

export function StatCardGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {children}
    </div>
  );
}

