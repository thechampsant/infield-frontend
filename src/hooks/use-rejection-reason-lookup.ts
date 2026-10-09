"use client";

import { useCallback, useEffect, useState } from "react";
import { inboxService } from "@/lib/api/inbox-service";
import { formatApiError } from "@/lib/api/get-api-error-message";
import { LEGACY_REJECTION_LOOKUP, type RejectionReasonLookup } from "@/lib/approval/rejection-reasons";

export type RejectionReasonLookupStatus = "idle" | "loading" | "ready" | "error";

interface LookupResult {
  key: string;
  attempt: number;
  lookup?: RejectionReasonLookup;
  error?: string;
}

/**
 * Loads the reject-dialog rules for the given inbox items. Pass null while no dialog is
 * open. The status is derived from the stored result, so nothing is set synchronously
 * inside the effect.
 */
export function useRejectionReasonLookup(inboxItemIds: string[] | null) {
  const requestKey = inboxItemIds && inboxItemIds.length ? [...inboxItemIds].sort().join(",") : null;
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<LookupResult | null>(null);

  useEffect(() => {
    if (!requestKey) return;
    let cancelled = false;
    const currentAttempt = attempt;
    inboxService
      .getRejectionReasons(requestKey.split(","))
      .then((lookup) => {
        if (!cancelled) setResult({ key: requestKey, attempt: currentAttempt, lookup });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setResult({
            key: requestKey,
            attempt: currentAttempt,
            error: formatApiError(error, "Couldn't load rejection reasons"),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [requestKey, attempt]);

  const current = result && result.key === requestKey && result.attempt === attempt ? result : null;
  const status: RejectionReasonLookupStatus = !requestKey
    ? "idle"
    : !current
      ? "loading"
      : current.error
        ? "error"
        : "ready";
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  return {
    status,
    lookup: current?.lookup ?? LEGACY_REJECTION_LOOKUP,
    error: current?.error ?? null,
    retry,
  };
}
