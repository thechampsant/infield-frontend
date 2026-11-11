import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "./api-client";

const fetchMock = vi.fn<typeof fetch>();
afterEach(() => {
  apiClient.clearAccessToken();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("authenticated multipart transport", () => {
  it.each(["POST", "PATCH"] as const)("sends %s with browser-generated boundaries and session credentials", async (method) => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ statusCode: 200, message: "OK", data: { _id: "doc1" } }), { status: 200 }));
    apiClient.setAccessToken("test-token");
    const form = new FormData();
    form.append("file", new File(["pdf"], "safety.pdf"));
    const result = method === "PATCH"
      ? await apiClient.patchFormData("/api/v1/documents/doc1", form)
      : await apiClient.postFormData("/api/v1/documents/upload", form);
    const options = fetchMock.mock.calls[0][1]!;
    expect(options.method).toBe(method);
    expect(options.body).toBe(form);
    expect(options.credentials).toBe("include");
    const headers = new Headers(options.headers);
    expect(headers.get("Authorization")).toBe("Bearer test-token");
    expect(headers.has("Content-Type")).toBe(false);
    expect(result).toEqual({ _id: "doc1" });
  });

  it("surfaces a replacement validation error returned by the backend", async () => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ errorCode: "INVALID_FILE", message: "File type does not match" }), { status: 422 }));
    await expect(apiClient.patchFormData("/api/v1/documents/doc1", new FormData())).rejects.toMatchObject({ name: "ApiError", status: 422, errorCode: "INVALID_FILE", message: "File type does not match" });
  });
});
