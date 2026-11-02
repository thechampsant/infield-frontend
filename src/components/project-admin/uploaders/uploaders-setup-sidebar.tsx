"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ListOrdered,
  Users2,
  CalendarDays,
  Sparkles,
} from "lucide-react";
import {
  uploadersSetupSteps,
  uploadersStepIdFromPath,
} from "@/lib/project-admin/setup-paths";
import { useProjectContext } from "@/lib/project-admin/project-context";
import { useLeaveModuleEnabled } from "@/hooks/use-leave-module-enabled";

interface UploadersSetupSidebarProps {
  accountCode: string;
  projectCode: string;
}

export function UploadersSetupSidebar({
  accountCode,
  projectCode,
}: UploadersSetupSidebarProps) {
  const pathname = usePathname() ?? "/";
  const { projectId } = useProjectContext();
  const leaveEnabled = useLeaveModuleEnabled(projectId);
  const [mobileExpanded, setMobileExpanded] = useState(false);

  const steps = uploadersSetupSteps(accountCode, projectCode);
  const currentId = uploadersStepIdFromPath(pathname);
  const currentIndex = steps.findIndex((s) => s.id === currentId);

  // Additional uploaders not in the linear 1-9 setup order
  const baseUploadersUrl = `/project-admin/${accountCode}/${projectCode}/uploaders`;
  const additionalUploaders = [
    {
      id: "reportee-map",
      label: "Reportee Map",
      href: `${baseUploadersUrl}/reportee-map`,
      description: "Map field users to managers",
      icon: Users2,
    },
    ...(leaveEnabled
      ? [
          {
            id: "leave-balance",
            label: "Leave Balance",
            href: `${baseUploadersUrl}/leave-balance`,
            description: "Manage leave balances & quotas",
            icon: CalendarDays,
          },
        ]
      : []),
  ];

  const currentStep = currentIndex >= 0 ? steps[currentIndex] : null;
  const currentAdditional = additionalUploaders.find((item) =>
    pathname.startsWith(item.href)
  );

  const prevStep = currentIndex > 0 ? steps[currentIndex - 1] : null;
  const nextStep =
    currentIndex >= 0 && currentIndex < steps.length - 1
      ? steps[currentIndex + 1]
      : null;

  // Progress percentage (based on active setup step)
  const progressPercent =
    currentIndex >= 0
      ? Math.round(((currentIndex + 1) / steps.length) * 100)
      : 0;

  return (
    <nav className="pa-setup-nav-container" aria-label="Setup Order Navigation">
      {/* Mobile Top Header / Stepper Bar */}
      <div className="pa-setup-mobile-bar">
        <div className="pa-setup-mobile-info">
          <div className="pa-setup-mobile-tag">
            <span className="pa-setup-mobile-badge">
              {currentIndex >= 0 ? `${currentIndex + 1}/${steps.length}` : "•"}
            </span>
            <span className="pa-setup-mobile-title">
              {currentStep
                ? currentStep.label
                : currentAdditional
                ? currentAdditional.label
                : "Setup Order"}
            </span>
          </div>
          {currentStep && (
            <span className="pa-setup-mobile-desc">{currentStep.description}</span>
          )}
        </div>

        <div className="pa-setup-mobile-controls">
          {prevStep && (
            <Link
              href={prevStep.href}
              className="pa-setup-mobile-nav-btn"
              title={`Previous: ${prevStep.label}`}
              aria-label="Previous step"
            >
              <ChevronLeft size={16} />
            </Link>
          )}

          {nextStep && (
            <Link
              href={nextStep.href}
              className="pa-setup-mobile-nav-btn"
              title={`Next: ${nextStep.label}`}
              aria-label="Next step"
            >
              <ChevronRight size={16} />
            </Link>
          )}

          <button
            type="button"
            className={`pa-setup-mobile-toggle-btn${mobileExpanded ? " is-open" : ""}`}
            onClick={() => setMobileExpanded(!mobileExpanded)}
            aria-expanded={mobileExpanded}
            aria-label="Toggle setup steps list"
          >
            <span>All Steps</span>
            <ChevronDown
              size={15}
              className={`pa-setup-mobile-chevron${mobileExpanded ? " rotate-180" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Main Stepper Card (Visible on desktop; toggleable on mobile) */}
      <div
        className={`pa-setup-sidebar-card${mobileExpanded ? " mobile-open" : ""}`}
      >
        {/* Header with Title and Progress */}
        <div className="pa-setup-sidebar-header">
          <div className="pa-setup-header-row">
            <div className="pa-setup-title-group">
              <span className="pa-setup-eyebrow">
                <ListOrdered size={12} className="pa-setup-eyebrow-icon" />
                Setup Order
              </span>
              <h2 className="pa-setup-main-heading">Recommended Flow</h2>
            </div>
            {currentIndex >= 0 && (
              <span className="pa-setup-progress-pill">
                Step {currentIndex + 1} of {steps.length}
              </span>
            )}
          </div>

          <div
            className="pa-setup-progress-bar-track"
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Setup sequence progress"
          >
            <div
              className="pa-setup-progress-bar-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Stepper Ordered Steps */}
        <ol className="pa-setup-stepper-list">
          {steps.map((step, index) => {
            const isCurrent = step.id === currentId;
            const isPast = currentIndex >= 0 && index < currentIndex;
            const isLast = index === steps.length - 1;

            return (
              <li
                key={step.id}
                className={`pa-setup-step-item${
                  isCurrent ? " is-current" : ""
                }${isPast ? " is-past" : ""}`}
              >
                {/* Connecting track line */}
                {!isLast && (
                  <span
                    className={`pa-setup-step-line${
                      isPast ? " is-past" : ""
                    }`}
                    aria-hidden
                  />
                )}

                <Link
                  href={step.href}
                  className={`pa-setup-step-link${
                    isCurrent ? " active" : ""
                  }`}
                  aria-current={isCurrent ? "step" : undefined}
                  onClick={() => setMobileExpanded(false)}
                >
                  <span className="pa-setup-step-indicator" aria-hidden>
                    {isPast ? (
                      <Check size={12} strokeWidth={3} className="pa-setup-check-icon" />
                    ) : (
                      index + 1
                    )}
                  </span>

                  <div className="pa-setup-step-content">
                    <span className="pa-setup-step-label">{step.label}</span>
                    <span className="pa-setup-step-desc">
                      {step.description}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>

        {/* Additional Uploaders Section (e.g. Reportee Map, Leave Balance) */}
        {additionalUploaders.length > 0 && (
          <div className="pa-setup-additional-section">
            <div className="pa-setup-additional-divider" />
            <div className="pa-setup-additional-header">
              <span>Additional Uploaders</span>
            </div>
            <ul className="pa-setup-additional-list">
              {additionalUploaders.map((item) => {
                const isActive = pathname.startsWith(item.href);
                const ItemIcon = item.icon;
                return (
                  <li key={item.id} className="pa-setup-additional-item">
                    <Link
                      href={item.href}
                      className={`pa-setup-additional-link${
                        isActive ? " active" : ""
                      }`}
                      aria-current={isActive ? "page" : undefined}
                      onClick={() => setMobileExpanded(false)}
                    >
                      <span className="pa-setup-additional-icon-wrap" aria-hidden>
                        <ItemIcon size={14} />
                      </span>
                      <div className="pa-setup-step-content">
                        <span className="pa-setup-step-label">{item.label}</span>
                        <span className="pa-setup-step-desc">
                          {item.description}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Pro Tip Footer */}
        <div className="pa-setup-sidebar-footer">
          <Sparkles size={13} className="pa-setup-footer-icon" />
          <span>Follow the order from Roles to Targets to avoid missing dependencies.</span>
        </div>
      </div>
    </nav>
  );
}
