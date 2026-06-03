/** Public URLs for brand assets (source files live in `/logo`). */
export const BRAND_ASSETS = {
  lightWordmark: "/brand/light-web-logo.svg",
  darkWordmark: "/brand/dark-web-logo.svg",
  appIcon: "/brand/appicon.svg",
  splash: "/brand/splash.svg",
} as const;

export type BrandTheme = "light" | "dark" | "auto";

export function wordmarkSrc(theme: BrandTheme): string {
  if (theme === "dark") return BRAND_ASSETS.darkWordmark;
  if (theme === "light") return BRAND_ASSETS.lightWordmark;
  return BRAND_ASSETS.lightWordmark;
}
