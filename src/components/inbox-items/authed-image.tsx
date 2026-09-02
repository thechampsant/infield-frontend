"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { apiClient } from "@/lib/api/api-client";

interface AuthedImageProps {
  /** Raw GCS path or absolute URL. */
  path: string;
  alt?: string;
  size?: number;
}

const PROXY_ENDPOINT = "/api/inbox-file";
const TOKEN_STORAGE_KEY = "infield_token";

function getToken(): string | null {
  const memToken = apiClient.getAccessToken();
  if (memToken) return memToken;
  if (typeof window !== "undefined") {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  }
  return null;
}

/**
 * Builds the same-origin proxy URL for a GCS path. Absolute URLs pass through.
 * The proxy route (/api/inbox-file) injects the bearer token server-side and
 * streams the bytes, so a plain <img src> works with no CORS preflight.
 */
function buildFileUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const token = getToken();
  const params = new URLSearchParams({ path });
  if (token) params.set("token", token);
  return `${PROXY_ENDPOINT}?${params.toString()}`;
}

/**
 * Renders a thumbnail image from the authenticated file proxy via a plain
 * <img> tag. Falls back to a placeholder icon on error. Click opens full size.
 */
export function AuthedImage({ path, alt = "", size = 64 }: AuthedImageProps) {
  const [failed, setFailed] = useState(false);
  const src = buildFileUrl(path);

  const boxStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: 6,
    border: "1px solid var(--border, #e2e8f0)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--bg-muted, #f8fafc)",
    color: "var(--text-muted, #94a3b8)",
    flexShrink: 0,
  };

  if (failed) {
    return (
      <span style={boxStyle} title="Failed to load image">
        <ImageIcon size={20} />
      </span>
    );
  }

  return (
    <a
      href={src}
      target="_blank"
      rel="noopener noreferrer"
      title="Open full size"
      style={{ display: "inline-block", lineHeight: 0 }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={size}
        height={size}
        onError={() => setFailed(true)}
        style={{
          width: size,
          height: size,
          borderRadius: 6,
          border: "1px solid var(--border, #e2e8f0)",
          objectFit: "cover",
          cursor: "pointer",
        }}
      />
    </a>
  );
}
