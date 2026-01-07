import { cn } from "@/lib/utils/cn";

export type StatusPillProps = {
  status: "active" | "inactive" | "pending" | "onboarding";
  className?: string;
};

const statusConfig = {
  active: {
    bg: "bg-[var(--orca-brand-2-light)]",
    text: "text-[var(--orca-brand-2)]",
    dot: "bg-[var(--orca-brand-2)]",
    label: "Active",
  },
  inactive: {
    bg: "bg-[var(--orca-surface-2)]",
    text: "text-[var(--orca-text-3)]",
    dot: "bg-[var(--orca-text-3)]",
    label: "Inactive",
  },
  pending: {
    bg: "bg-[var(--orca-brand-3-light)]",
    text: "text-[var(--orca-brand-3)]",
    dot: "bg-[var(--orca-brand-3)]",
    label: "Pending",
  },
  onboarding: {
    bg: "bg-[var(--orca-brand-4-light)]",
    text: "text-[var(--orca-brand-4)]",
    dot: "bg-[var(--orca-brand-4)]",
    label: "Onboarding",
  },
};

export function StatusPill({ status, className }: StatusPillProps) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        config.bg,
        config.text,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}

export type BadgeProps = {
  children: React.ReactNode;
  variant?: "blue" | "green" | "amber" | "gray";
  className?: string;
};

const badgeVariants = {
  blue: "bg-[var(--orca-brand-light)] text-[var(--orca-brand)]",
  green: "bg-[var(--orca-brand-2-light)] text-[var(--orca-brand-2)]",
  amber: "bg-[var(--orca-brand-3-light)] text-[var(--orca-brand-3)]",
  gray: "bg-[var(--orca-surface-2)] text-[var(--orca-text-2)]",
};

export function Badge({ children, variant = "blue", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        badgeVariants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
