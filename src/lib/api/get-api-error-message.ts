import { ApiError } from "./api-client";
import { getApiErrorMessage } from "./api-response";

/** User-facing message from API or generic Error. */
export function formatApiError(err: unknown, fallback = "Something went wrong"): string {
  if (err instanceof ApiError) {
    return err.message || fallback;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return fallback;
}

export { getApiErrorMessage };
