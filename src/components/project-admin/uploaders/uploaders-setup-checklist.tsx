"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  uploadersSetupSteps,
  uploadersStepIdFromPath,
} from "@/lib/project-admin/setup-paths";

export function UploadersSetupChecklist({
  accountCode,
  projectCode,
}: {
  accountCode: string;
  projectCode: string;
}) {
  const pathname = usePathname() ?? "/";
  const currentId = uploadersStepIdFromPath(pathname);
  const steps = uploadersSetupSteps(accountCode, projectCode);
  const currentIndex = steps.findIndex((s) => s.id === currentId);

  return (
    <nav className="pa-setup-checklist" aria-label="Project setup steps">
      <div className="pa-setup-checklist-title">Setup order</div>
      <ol className="pa-setup-checklist-list">
        {steps.map((step, index) => {
          const isCurrent = step.id === currentId;
          const isPast = currentIndex >= 0 && index < currentIndex;
          return (
            <li
              key={step.id}
              className={`pa-setup-checklist-item${isCurrent ? " is-current" : ""}${isPast ? " is-past" : ""}`}
            >
              <span className="pa-setup-checklist-num" aria-hidden>
                {index + 1}
              </span>
              <div className="pa-setup-checklist-body">
                <Link
                  href={step.href}
                  className={`pa-setup-checklist-link${isCurrent ? " active" : ""}`}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {step.label}
                </Link>
                <span className="pa-setup-checklist-desc">{step.description}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
