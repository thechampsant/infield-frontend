"use client";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api/api-client";

/** Keyed results plus abort/cleanup prevent stale date, scope, page and detail responses. */
export function useOverviewResource<T>(url: string | null, revision = 0) {
  const key = `${url}:${revision}`;
  const [resource, setResource] = useState<{
    key: string;
    data: T | null;
    error: string | null;
  }>({ key: "", data: null, error: null });
  useEffect(() => {
    if (!url) return;
    const request = new AbortController();
    let active = true;
    apiClient
      .request<T>(url, { method: "GET", signal: request.signal })
      .then((data) => {
        if (active) setResource({ key, data, error: null });
      })
      .catch((error) => {
        if (active && !request.signal.aborted)
          setResource({
            key,
            data: null,
            error:
              error instanceof Error
                ? error.message
                : "Unable to load this view.",
          });
      });
    return () => {
      active = false;
      request.abort();
    };
  }, [url, key]);
  return {
    data: resource.key === key ? resource.data : null,
    error: resource.key === key ? resource.error : null,
    loading: !!url && resource.key !== key,
  };
}
