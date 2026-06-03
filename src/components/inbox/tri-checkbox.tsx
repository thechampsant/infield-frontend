"use client";

import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type CheckState = "unchecked" | "partial" | "checked";

export function TriCheckbox({
  state,
  onToggle,
  label,
}: {
  state: CheckState;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={state === "checked" ? true : state === "partial" ? "mixed" : false}
      aria-label={label}
      className={cn(
        "ibx-check",
        state === "checked" && "checked",
        state === "partial" && "partial",
      )}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
    >
      {state === "checked" && <Check aria-hidden="true" />}
      {state === "partial" && <Minus aria-hidden="true" />}
    </button>
  );
}
