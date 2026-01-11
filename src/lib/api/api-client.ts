/**
 * HTTP API client with authentication handling.
 * Follows Engineering Standards: Security, Error Handling.
 */

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
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3005";
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
  ) {
    super(`API Error: ${errorCode}`);
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

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (this.accessToken) {
      (headers as Record<string, string>)["Authorization"] =
        `Bearer ${this.accessToken}`;
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
        errorBody.errorCode,
        errorBody.requestId,
      );
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  put<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

export const apiClient = new ApiClient();
export { ApiError, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE };
export type { ApiErrorResponse };

