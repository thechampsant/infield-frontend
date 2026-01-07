"use client";

import * as React from "react";

export type ResolvedTheme = "light" | "dark";
export type ThemePreference = "light" | "dark" | "system";

type ThemeContextValue = {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (t: ThemePreference) => void;
  toggle: () => void; // toggles between light/dark (keeps it simple)
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "infield.theme";

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === "system") return getSystemTheme();
  return preference;
}

function applyTheme(preference: ThemePreference, resolved: ResolvedTheme) {
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.style.colorScheme = resolved;
  document.documentElement.dataset.theme = preference;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = React.useState<ThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] = React.useState<ResolvedTheme>("light");

  React.useEffect(() => {
    const savedRaw = localStorage.getItem(STORAGE_KEY);
    const saved =
      savedRaw === "light" || savedRaw === "dark" || savedRaw === "system" ? savedRaw : null;
    const initialPref = saved ?? "system";
    const initialResolved = resolveTheme(initialPref);
    setPreferenceState(initialPref);
    setResolvedTheme(initialResolved);
    applyTheme(initialPref, initialResolved);
  }, []);

  React.useEffect(() => {
    if (preference !== "system") return;
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) return;

    const handler = () => {
      const resolved = resolveTheme("system");
      setResolvedTheme(resolved);
      applyTheme("system", resolved);
    };

    handler();
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [preference]);

  const setPreference = React.useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    localStorage.setItem(STORAGE_KEY, pref);
    const resolved = resolveTheme(pref);
    setResolvedTheme(resolved);
    applyTheme(pref, resolved);
  }, []);

  const toggle = React.useCallback(() => {
    const next = resolvedTheme === "dark" ? "light" : "dark";
    setPreference(next);
  }, [resolvedTheme, setPreference]);

  const value = React.useMemo(
    () => ({ preference, resolvedTheme, setPreference, toggle }),
    [preference, resolvedTheme, setPreference, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}


