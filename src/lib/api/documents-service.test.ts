import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiClient } from "./api-client";
import { documentsService, type UpdateDocumentInput } from "./documents-service";

vi.mock("./api-client", async (importOriginal) => ({
  ...await importOriginal<typeof import("./api-client")>(),
  apiClient: { get: vi.fn(), patch: vi.fn(), patchFormData: vi.fn(), postFormData: vi.fn() },
}));
afterEach(() => vi.clearAllMocks());
const metadata: UpdateDocumentInput = { title: "Safety", targetModule: "Training", description: null, fromDate: null, toDate: null, acknowledgementRequired: false, alsoAssignTo: ["designation-2"] };

describe("document editing API boundary", () => {
  it("sends metadata and explicit clears without a file, version or status mutation", async () => {
    await documentsService.updateDocument("doc/1", metadata);
    expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/documents/doc%2F1", metadata);
    expect(vi.mocked(apiClient.patch).mock.calls[0][1]).toMatchObject({ targetModule: "Training" });
    expect(vi.mocked(apiClient.patch).mock.calls[0][1]).not.toHaveProperty("category");
    expect(apiClient.patchFormData).not.toHaveBeenCalled();
    expect(apiClient.postFormData).not.toHaveBeenCalled();
  });
  it("sends one replacement file and preserves JSON field types", async () => {
    const file = new File(["pdf"], "new.pdf", { type: "application/pdf" });
    await documentsService.updateDocument("doc-1", { ...metadata, file });
    const [url, form] = vi.mocked(apiClient.patchFormData).mock.calls[0];
    expect(url).toBe("/api/v1/documents/doc-1");
    expect(form.get("file")).toEqual(file);
    expect(JSON.parse(String(form.get("metadata")))).toEqual(metadata);
    expect(apiClient.patch).not.toHaveBeenCalled();
  });
  it("uses the backend assignment family lookup, including for legacy rows", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ designationIds: ["d1", "d2"] });
    expect(await documentsService.getAssignments({ _id: "doc/1", designationId: "d1" })).toEqual({ designationIds: ["d1", "d2"], canAssign: true });
    expect(apiClient.get).toHaveBeenCalledExactlyOnceWith("/api/v1/documents/doc%2F1/assignments");
  });
  it("disables assignments gracefully when an older deployment has no route", async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new ApiError(404, "NOT_FOUND", undefined, "Cannot GET assignments"));
    expect(await documentsService.getAssignments({ _id: "doc1", designationId: "d1" })).toEqual({ designationIds: ["d1"], canAssign: false });
    expect(apiClient.get).toHaveBeenCalledTimes(1);
  });
  it.each([401, 403, 500])("preserves errors other than a missing route (%s)", async (status) => {
    const error = new ApiError(status, "REQUEST_FAILED");
    vi.mocked(apiClient.get).mockRejectedValueOnce(error);
    await expect(documentsService.getAssignments({ _id: "doc1", designationId: "d1" })).rejects.toBe(error);
  });
  it("stores a video ID and kind and removes playlist context from a video edit", async () => {
    await documentsService.updateDocument("doc-1", { ...metadata, youtubeUrl: "https://youtu.be/dQw4w9WgXcQ?list=PL1234567890abcdefghij" });
    expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/documents/doc-1", { ...metadata, youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", youtubeId: "dQw4w9WgXcQ", youtubeKind: "video" });
  });
  it("does not submit unsupported YouTube links", async () => {
    await expect(documentsService.updateDocument("doc-1", { ...metadata, youtubeUrl: "https://www.youtube.com/@channel" })).rejects.toThrow("valid YouTube");
    expect(apiClient.patch).not.toHaveBeenCalled();
  });
  it("adds a playlist without uploading a file or calling YouTube", async () => {
    await documentsService.uploadDocument({ title: "Training", documentType: "YouTube", youtubeUrl: "https://www.youtube.com/playlist?list=PL1234567890abcdefghij", designationId: "d1", projectId: "p1", targetModule: "Resources" });
    const [url, form] = vi.mocked(apiClient.postFormData).mock.calls[0];
    expect(url).toBe("/api/v1/documents/upload");
    expect(form.has("file")).toBe(false);
    expect(form.has("category")).toBe(false);
    expect(form.get("youtubeKind")).toBe("playlist");
    expect(form.get("youtubeId")).toBe("PL1234567890abcdefghij");
  });
  it("uploads files using only fields accepted by the deployed upload DTO", async () => {
    const file = new File(["pdf"], "guide.pdf", { type: "application/pdf" });
    await documentsService.uploadDocument({
      title: "Safety guide", documentType: "PDF", targetModule: "Resources",
      designationId: "d1", projectId: "p1", file,
      description: "Read before visits", fromDate: "2026-01-01", toDate: "2026-12-31",
      acknowledgementRequired: true,
    });
    const [endpoint, form] = vi.mocked(apiClient.postFormData).mock.calls[0];
    expect(endpoint).toBe("/api/v1/documents/upload");
    expect(Object.fromEntries(form.entries())).toEqual({
      file, title: "Safety guide", documentType: "PDF", targetModule: "Resources",
      designationId: "d1", projectId: "p1", description: "Read before visits",
      fromDate: "2026-01-01", toDate: "2026-12-31", acknowledgementRequired: "true",
    });
    expect(form.has("category")).toBe(false);
  });
  it("requests later document pages with applied filters", async () => {
    await documentsService.listDocuments({ projectId: "p1", page: 3, limit: 50, fromDate: "2026-01-01", toDate: "2026-12-31" });
    const url = new URL(String(vi.mocked(apiClient.get).mock.calls[0][0]), "https://example.test");
    expect(Object.fromEntries(url.searchParams)).toEqual({ projectId: "p1", page: "3", limit: "50", fromDate: "2026-01-01", toDate: "2026-12-31" });
  });
});
