"use client";

import { useEffect, useRef, useState } from "react";

const ONVO_SCRIPT_ID = "onvo-web-components";
const ONVO_SCRIPT_SRC =
  "https://cdn.jsdelivr.net/npm/@onvo-ai/web-components@0.18.0/build/static/js/main.js";

let onvoLoader: Promise<void> | null = null;

function loadOnvoWebComponents(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Onvo is browser-only"));
  }
  if (window.customElements?.get("onvo-dashboard")) {
    return Promise.resolve();
  }
  if (onvoLoader) return onvoLoader;

  onvoLoader = new Promise((resolve, reject) => {
    const finish = () => {
      if (window.customElements?.get("onvo-dashboard")) {
        resolve();
        return;
      }
      reject(new Error("Onvo dashboard component did not register"));
    };
    let script = document.getElementById(ONVO_SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = ONVO_SCRIPT_ID;
      script.src = ONVO_SCRIPT_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", finish);
    script.addEventListener("error", () => {
      onvoLoader = null;
      reject(new Error("Failed to load Onvo dashboard"));
    });
  });

  return onvoLoader;
}

export function OnvoDashboardEmbed({
  baseUrl,
  token,
  dashboardId,
}: {
  baseUrl: string;
  token: string;
  dashboardId: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadOnvoWebComponents()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load Onvo dashboard");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!ready || !host) return;
    const el = document.createElement("onvo-dashboard") as HTMLElement & {
      baseUrl: string;
      userToken: string;
      dashboardId: string;
    };
    el.setAttribute("base-url", baseUrl);
    el.setAttribute("user-token", token);
    el.setAttribute("dashboard-id", dashboardId);
    el.baseUrl = baseUrl;
    el.userToken = token;
    el.dashboardId = dashboardId;
    el.style.display = "block";
    el.style.width = "100%";
    el.style.height = "100%";
    host.replaceChildren(el);
    return () => {
      host.replaceChildren();
    };
  }, [ready, baseUrl, token, dashboardId]);

  if (error) {
    return (
      <div
        className="pa-info-banner"
        style={{
          color: "var(--red)",
          background: "var(--red-light)",
          borderColor: "var(--red-mid)",
          margin: 16,
        }}
      >
        {error}. Use Open to view this dashboard.
      </div>
    );
  }

  if (!ready) {
    return <div className="pa-loading">Loading dashboard…</div>;
  }

  return <div ref={hostRef} className="pa-dashboard-embed__host" />;
}
