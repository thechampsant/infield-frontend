"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

export type ModalMaxWidth =
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "2xl"
  | "720px"
  | (string & {});

const maxWidthMap: Record<string, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "720px": "max-w-[720px]",
};

function resolveMaxWidthClass(maxWidth: ModalMaxWidth = "xl"): string {
  if (maxWidth in maxWidthMap) return maxWidthMap[maxWidth];
  if (maxWidth.startsWith("max-w-")) return maxWidth;
  return `max-w-[${maxWidth}]`;
}

export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: ModalMaxWidth;
  maxHeight?: string;
  zIndex?: string;
  className?: string;
  bodyClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
  backdropClassName?: string;
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  closeOnEsc?: boolean;
  isSubmitting?: boolean;
  formProps?: React.FormHTMLAttributes<HTMLFormElement>;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  role?: string;
  closeButtonAriaLabel?: string;
  rawContent?: boolean;
}

export function BaseModal({
  isOpen,
  onClose,
  title,
  subtitle,
  header,
  footer,
  children,
  maxWidth = "xl",
  maxHeight = "max-h-[90vh]",
  zIndex = "z-50",
  className = "",
  bodyClassName = "",
  headerClassName = "",
  footerClassName = "",
  backdropClassName = "",
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEsc = true,
  isSubmitting = false,
  formProps,
  ariaLabelledBy,
  ariaDescribedBy,
  role = "dialog",
  closeButtonAriaLabel = "Close",
  rawContent = false,
}: BaseModalProps) {
  useEffect(() => {
    if (!isOpen || !closeOnEsc) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeOnEsc, isSubmitting, onClose]);

  if (!isOpen) return null;

  const widthClass = resolveMaxWidthClass(maxWidth);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdropClick && !isSubmitting && e.target === e.currentTarget) {
      onClose();
    }
  };

  const hasHeader = Boolean(header || title);

  return (
    <div
      role={role}
      aria-modal="true"
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      className={`fixed inset-0 ${zIndex} bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-hidden ${backdropClassName}`}
      onClick={handleBackdropClick}
    >
      <div
        className={`bg-white rounded-2xl w-full ${widthClass} shadow-2xl border border-slate-200 flex flex-col ${maxHeight} overflow-hidden overflow-x-hidden animate-in fade-in zoom-in-95 duration-150 ${className}`}
      >
        {/* Modal Header */}
        {hasHeader && (
          header ? (
            header
          ) : (
            <div
              className={`flex items-start justify-between px-6 py-4 border-b border-slate-100 shrink-0 ${headerClassName}`}
            >
              <div className="min-w-0 pr-4">
                {typeof title === "string" ? (
                  <h3
                    id={ariaLabelledBy}
                    className="text-base font-bold text-slate-900"
                  >
                    {title}
                  </h3>
                ) : (
                  title
                )}
                {subtitle && (
                  typeof subtitle === "string" ? (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {subtitle}
                    </p>
                  ) : (
                    subtitle
                  )
                )}
              </div>
              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  aria-label={closeButtonAriaLabel}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          )
        )}

        {rawContent ? (
          children
        ) : (
          <>
            {/* Modal Body & Footer */}
            {formProps ? (
              <form
                {...formProps}
                className="flex flex-col flex-1 min-h-0 overflow-hidden"
              >
                <div
                  className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-6 py-4 ${bodyClassName}`}
                >
                  {children}
                </div>
                {footer && (
                  <div className={`shrink-0 ${footerClassName}`}>
                    {footer}
                  </div>
                )}
              </form>
            ) : (
              <>
                <div
                  className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-6 py-4 ${bodyClassName}`}
                >
                  {children}
                </div>
                {footer && (
                  <div className={`shrink-0 ${footerClassName}`}>
                    {footer}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function BaseModalHeader({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`px-6 py-4 border-b border-slate-100 flex items-start justify-between shrink-0 ${className}`}
    >
      {children}
    </div>
  );
}

export function BaseModalBody({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-6 py-4 ${className}`}
    >
      {children}
    </div>
  );
}

export function BaseModalFooter({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2 shrink-0 ${className}`}
    >
      {children}
    </div>
  );
}

BaseModal.Header = BaseModalHeader;
BaseModal.Body = BaseModalBody;
BaseModal.Footer = BaseModalFooter;

export const ConnectBaseModal = BaseModal;
