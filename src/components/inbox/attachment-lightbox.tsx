"use client";

import { useEffect } from "react";
import { FileText, Image as ImageIcon, MapPin, Paperclip, X } from "lucide-react";
import type { AttachmentItem } from "@/lib/api/inbox-service";

function rendererIcon(renderer: AttachmentItem["renderer"]) {
  switch (renderer) {
    case "image-preview":
      return <ImageIcon aria-hidden="true" />;
    case "pdf-viewer":
      return <FileText aria-hidden="true" />;
    case "geo-map":
      return <MapPin aria-hidden="true" />;
    default:
      return <Paperclip aria-hidden="true" />;
  }
}

function rendererSubtitle(renderer: AttachmentItem["renderer"]): string {
  switch (renderer) {
    case "geo-map":
      return "Geo-tagged attendance photo";
    case "image-preview":
      return "Image attachment";
    case "pdf-viewer":
      return "PDF document";
    default:
      return "File attachment";
  }
}

export function AttachmentLightbox({
  attachment,
  onClose,
}: {
  attachment: AttachmentItem | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!attachment) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [attachment, onClose]);

  if (!attachment) return null;

  return (
    <div
      className="ibx-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Attachment preview"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button
        type="button"
        className="ibx-lightbox-close"
        aria-label="Close preview"
        onClick={onClose}
      >
        <X aria-hidden="true" />
      </button>
      <div className="ibx-lightbox-card">
        <div className="ibx-lightbox-icon">{rendererIcon(attachment.renderer)}</div>
        <div className="ibx-lightbox-name">{attachment.fileName}</div>
        <div className="ibx-lightbox-sub">{rendererSubtitle(attachment.renderer)}</div>
      </div>
    </div>
  );
}
