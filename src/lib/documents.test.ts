import { describe, expect, it } from "vitest";
import { MAX_DOCUMENT_SIZE, getDocumentUrl, parseYouTubeUrl, validateDocumentDetails, validateDocumentFile } from "./documents";
import type { DocumentRecord } from "./api/documents-service";

const videoId = "dQw4w9WgXcQ";
const playlistId = "PL1234567890abcdefghij";

describe("YouTube resource links", () => {
  it.each([
    `https://www.youtube.com/watch?v=${videoId}`,
    `https://youtu.be/${videoId}?t=30`,
    `https://m.youtube.com/shorts/${videoId}`,
  ])("accepts a video and extracts its ID: %s", (url) => {
    expect(parseYouTubeUrl(url)).toMatchObject({ id: videoId, kind: "video", url: `https://www.youtube.com/watch?v=${videoId}` });
  });

  it("stores a playlist as one card", () => {
    expect(parseYouTubeUrl(`https://www.youtube.com/playlist?list=${playlistId}`)).toEqual({ id: playlistId, kind: "playlist", url: `https://www.youtube.com/playlist?list=${playlistId}`, notice: "This playlist shows as one card in the app." });
  });

  it("takes only the video from a video link containing a playlist", () => {
    const result = parseYouTubeUrl(`https://www.youtube.com/watch?v=${videoId}&list=${playlistId}&index=3`);
    expect(result?.kind).toBe("video");
    expect(result?.url).not.toContain("list=");
    expect(result?.notice).toContain("playlist page link");
  });

  it.each([
    "https://www.youtube.com/@channel", "https://www.youtube.com/channel/UC1234567890",
    "https://www.youtube.com/results?search_query=test", `https://www.youtube.com/playlist?list=RD${videoId}`,
    `https://youtube.com.evil.test/watch?v=${videoId}`, `https://evil.test/watch?v=${videoId}`,
    `https://youtube.com@evil.test/watch?v=${videoId}`, `javascript:alert(1)`,
    "https://youtu.be/invalid", "", "https://www.youtube.com/playlist?list=",
  ])("refuses unsupported or unsafe links: %s", (url) => {
    expect(parseYouTubeUrl(url)).toBeNull();
  });
});

describe("document validation", () => {
  const valid = { title: "Safety", category: "Training", fromDate: "2026-01-01", toDate: "2026-01-01" };
  it("allows equal dates and empty optional dates", () => {
    expect(validateDocumentDetails(valid)).toEqual({});
    expect(validateDocumentDetails({ ...valid, fromDate: "", toDate: "" })).toEqual({});
  });
  it("reports whitespace-only required fields and reversed dates", () => {
    expect(validateDocumentDetails({ ...valid, title: " ", category: "\t", toDate: "2025-12-31" })).toMatchObject({ title: expect.any(String), category: expect.any(String), toDate: expect.any(String) });
  });
  it("accepts a replacement exactly at 100 MB and rejects one byte over", () => {
    const file = { name: "guide.pdf", type: "application/pdf", size: MAX_DOCUMENT_SIZE };
    expect(validateDocumentFile(file, "PDF")).toBeNull();
    expect(validateDocumentFile({ ...file, size: MAX_DOCUMENT_SIZE + 1 }, "PDF")).toContain("100 MB");
  });
  it("rejects mismatched extensions and MIME types", () => {
    expect(validateDocumentFile({ name: "guide.docx", type: "application/pdf", size: 1 }, "PDF")).toContain("same document type");
    expect(validateDocumentFile({ name: "guide.pdf", type: "image/png", size: 1 }, "PDF")).toContain("same document type");
    expect(validateDocumentFile({ name: "guide.PDF", type: "", size: 1 }, "PDF")).toBeNull();
  });
  it("accepts formats within the same document type", () => {
    expect(validateDocumentFile({ name: "guide.xlsx", type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", size: 100 }, "Excel")).toBeNull();
    expect(validateDocumentFile({ name: "guide.docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 100 }, "Word")).toBeNull();
    expect(validateDocumentFile({ name: "image.png", type: "image/png", size: 100 }, "Image")).toBeNull();
  });
  it("never renders unsafe stored YouTube URLs as links", () => {
    expect(getDocumentUrl({ documentType: "YouTube", youtubeUrl: "javascript:alert(1)" } as DocumentRecord)).toBeNull();
    expect(getDocumentUrl({ documentType: "PDF", gcsPath: "project/file with spaces.pdf" } as DocumentRecord)).toBe("/api/v1/gcs/file?path=project%2Ffile%20with%20spaces.pdf");
  });
});
