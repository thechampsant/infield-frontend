/** Public URLs for brand assets (source files live in `/logo`). */
export const BRAND_ASSETS = {
  /** Diwali mark — square icon works on light and dark surfaces. */
  lightWordmark: "/brand/diwali-icon-512.png",
  darkWordmark: "/brand/diwali-icon-512.png",
  appIcon: "/brand/diwali-icon-512.png",
  splash: "/brand/diwali-icon-512.png",
  favicon48: "/brand/diwali-icon-48.png",
  favicon192: "/brand/diwali-icon-192.png",
  favicon512: "/brand/diwali-icon-512.png",
} as const;

export type BrandTheme = "light" | "dark" | "auto";

export function wordmarkSrc(theme: BrandTheme): string {
  if (theme === "dark") return BRAND_ASSETS.darkWordmark;
  if (theme === "light") return BRAND_ASSETS.lightWordmark;
  return BRAND_ASSETS.lightWordmark;
}
