import type { DocumentRecord, DocumentType } from "./api/documents-service";

export const MAX_DOCUMENT_SIZE = 100 * 1024 * 1024;

const FILE_TYPES: Record<Exclude<DocumentType, "YouTube">, { extensions: string[]; mimeTypes: string[] }> = {
  PDF: { extensions: ["pdf"], mimeTypes: ["application/pdf"] },
  Excel: { extensions: ["xls", "xlsx", "csv"], mimeTypes: ["application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/csv"] },
  Word: { extensions: ["doc", "docx"], mimeTypes: ["application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"] },
  Video: { extensions: ["mp4", "webm", "mov", "avi", "mkv", "m4v"], mimeTypes: ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/x-matroska", "video/x-m4v"] },
  Image: { extensions: ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "heic", "heif"], mimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp", "image/svg+xml", "image/heic", "image/heif"] },
};

export function documentFileAccept(type: DocumentType): string {
  return type === "YouTube" ? "" : FILE_TYPES[type].extensions.map((ext) => `.${ext}`).join(",");
}

export function validateDocumentFile(file: Pick<File, "name" | "size" | "type">, type: DocumentType): string | null {
  if (file.size > MAX_DOCUMENT_SIZE) return "File size exceeds the 100 MB limit.";
  if (type === "YouTube") return "YouTube documents require a link, not a file.";
  const allowed = FILE_TYPES[type];
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const genericMime = !file.type || file.type === "application/octet-stream";
  if (!allowed.extensions.includes(extension) || (!genericMime && !allowed.mimeTypes.includes(file.type.toLowerCase()))) {
    return `Choose a file of the same document type (${type}).`;
  }
  return null;
}

export interface YouTubeLinkDetails {
  url: string;
  id: string;
  kind: "video" | "playlist";
  notice: string;
}

/** Parse locally without calling the YouTube Data API (INF2-2858). */
export function parseYouTubeUrl(value: string): YouTubeLinkDetails | null {
  try {
    const url = new URL(value.trim());
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase();
    const isYouTube = ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(host);
    if (isYouTube && url.pathname === "/playlist") {
      const id = url.searchParams.get("list");
      // RD prefixes are auto-generated mixes rather than supported playlists.
      if (!id || /^RD/i.test(id) || !/^[A-Za-z0-9_-]{10,}$/.test(id)) return null;
      return { url: `https://www.youtube.com/playlist?list=${id}`, id, kind: "playlist", notice: "This playlist shows as one card in the app." };
    }
    let id: string | null = null;
    if (isYouTube) {
      if (url.pathname === "/watch") id = url.searchParams.get("v");
      else id = url.pathname.match(/^\/shorts\/([^/]+)\/?$/)?.[1] ?? null;
    } else if (host === "youtu.be") {
      id = url.pathname.match(/^\/([^/]+)\/?$/)?.[1] ?? null;
    }
    if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
    return {
      url: `https://www.youtube.com/watch?v=${id}`,
      id,
      kind: "video",
      notice: url.searchParams.has("list") ? "Only this video will be added. Use the playlist page link to add the whole playlist." : "",
    };
  } catch {
    return null;
  }
}

export function validateYouTubeUrl(value: string): string | null {
  return parseYouTubeUrl(value) ? null : "Enter a YouTube watch, youtu.be, shorts or playlist page link. Channels, search pages and auto-generated mixes are not supported.";
}

export function getDocumentUrl(doc: DocumentRecord): string | null {
  if (doc.documentType === "YouTube") {
    const url = doc.youtubeUrl || doc.fileUrl;
    return url && !validateYouTubeUrl(url) ? url : null;
  }
  return doc.gcsPath ? `/api/v1/gcs/file?path=${encodeURIComponent(doc.gcsPath)}` : null;
}

export function validateDocumentDetails(values: { title: string; category: string; fromDate: string; toDate: string }): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!values.title.trim()) errors.title = "Title is required.";
  if (!values.category.trim()) errors.category = "Category is required.";
  if (values.fromDate && values.toDate && values.toDate < values.fromDate) errors.toDate = "To Date cannot be before From Date.";
  return errors;
}
