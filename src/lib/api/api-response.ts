/**
 * Helpers for the live Infield API envelope:
 * { statusCode, message, data } on success and error payloads with `message`.
 */

export type ApiEnvelope<T> = {
  statusCode: number;
  message: string;
  data: T;
};

export function isApiEnvelope(value: unknown): value is ApiEnvelope<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "statusCode" in value &&
    "data" in value
  );
}

/** Check for { success, data } envelope (used by some services like form-builder). */
function isSuccessEnvelope(value: unknown): value is { success: boolean; data: unknown } {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    "data" in value
  );
}

/** Unwrap `data` when the body uses the standard live API envelope. */
export function unwrapApiData<T>(body: unknown): T {
  if (isApiEnvelope(body)) {
    return body.data as T;
  }
  if (isSuccessEnvelope(body)) {
    return body.data as T;
  }
  return body as T;
}

export function getApiErrorMessage(
  body: unknown,
  fallback = "Request failed",
): string {
  if (typeof body === "object" && body !== null) {
    const record = body as Record<string, unknown>;
    // NestJS validation errors return `message` as a string array.
    if (Array.isArray(record.message)) {
      const joined = record.message
        .filter((m): m is string => typeof m === "string")
        .join(". ");
      if (joined.trim()) return joined;
    }
    if (typeof record.message === "string" && record.message.trim()) {
      return record.message;
    }
    if (typeof record.error === "string" && record.error.trim()) {
      return record.error;
    }
    if (typeof record.errorCode === "string" && record.errorCode.trim()) {
      return record.errorCode;
    }
  }
  return fallback;
}
