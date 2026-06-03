/**
 * HTTP API client with authentication handling.
 * Follows Engineering Standards: Security, Error Handling.
 */

import { getApiErrorMessage, unwrapApiData } from "./api-response";

/**
 * Get the API base URL.
 * In browser: Use empty string to leverage Next.js rewrites (avoids CORS).
 * On server: Use the full backend URL.
 */
function getApiBaseUrl(): string {
  // Browser: use relative URLs to go through Next.js proxy
  if (typeof window !== "undefined") {
    return "";
  }
  // Server: use direct backend URL
  return (
    process.env.NEXT_PUBLIC_API_URL || "https://services.infield.co.in"
  );
}

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

interface ApiErrorResponse {
  errorCode: string;
  message: string;
  requestId?: string;
}

class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly errorCode: string,
    public readonly requestId?: string,
    message?: string,
  ) {
    super(message || errorCode || "Request failed");
    this.name = "ApiError";
  }
}

class ApiClient {
  private accessToken: string | null = null;

  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  clearAccessToken(): void {
    this.accessToken = null;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {},
    config: { authToken?: string } = {},
  ): Promise<T> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    // Per-request bearer override (e.g. short-lived passkey registration token)
    // takes precedence over the stored session token without clobbering it.
    const token = config.authToken ?? this.accessToken;
    if (token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
      ...options,
      headers,
      credentials: "include",
    });

    if (!response.ok) {
      const errorBody: ApiErrorResponse = await response.json().catch(() => ({
        errorCode: "UNKNOWN_ERROR",
        message: response.statusText,
      }));

      throw new ApiError(
        response.status,
        errorBody.errorCode || "UNKNOWN_ERROR",
        errorBody.requestId,
        getApiErrorMessage(errorBody, response.statusText),
      );
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    const body = await response.json();
    return unwrapApiData<T>(body);
  }

  get<T>(endpoint: string, config?: { authToken?: string }): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" }, config);
  }

  post<T>(
    endpoint: string,
    data?: unknown,
    config?: { authToken?: string },
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: "POST",
        body: data ? JSON.stringify(data) : undefined,
      },
      config,
    );
  }

  put<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  patch<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }

  async getBlob(endpoint: string): Promise<Blob> {
    const headers: HeadersInit = {};
    if (this.accessToken) {
      (headers as Record<string, string>)["Authorization"] =
        `Bearer ${this.accessToken}`;
    }
    const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
      method: "GET",
      headers,
      credentials: "include",
    });
    if (!response.ok) {
      throw new ApiError(response.status, "DOWNLOAD_FAILED", undefined, response.statusText);
    }
    return response.blob();
  }
}

export const apiClient = new ApiClient();
export { ApiError, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE };
export type { ApiErrorResponse };

