"use client";

import { AlertTriangle } from "lucide-react";
import { Modal, ModalFooter } from "./modal";
import { Button } from "./button";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default";
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showCloseButton={false}>
      <div className="flex flex-col items-center text-center">
        {variant === "danger" && (
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--orca-brand-4-light)]">
            <AlertTriangle className="h-6 w-6 text-[var(--orca-brand-4)]" />
          </div>
        )}
        {variant === "warning" && (
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--orca-brand-3-light)]">
            <AlertTriangle className="h-6 w-6 text-[var(--orca-brand-3)]" />
          </div>
        )}

        <h3 className="text-lg font-semibold text-[var(--orca-text)]">
          {title}
        </h3>
        <p className="mt-2 text-sm text-[var(--orca-text-3)]">{message}</p>
      </div>

      <ModalFooter className="justify-center">
        <Button variant="secondary" onClick={onClose} disabled={isLoading}>
          {cancelLabel}
        </Button>
        <Button
          variant={variant === "danger" ? "danger" : "primary"}
          onClick={onConfirm}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Processing...
            </>
          ) : (
            confirmLabel
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

