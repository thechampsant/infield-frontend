import { BRAND_ASSETS, type BrandTheme } from "@/lib/brand/assets";

type WordmarkSize = "topbar" | "hero" | "auth-panel" | "default";

export interface InfieldBrandLogoProps {
  /** Wordmark, app icon tile, or splash brand lockup. */
  variant?: "wordmark" | "icon" | "splash";
  /**
   * `auto` swaps light/dark wordmark with `html.dark`.
   * Use `dark` on navy hero panels; `light` on white topbars.
   */
  theme?: BrandTheme;
  size?: WordmarkSize;
  className?: string;
  /** Accessible label; defaults to "InField" */
  alt?: string;
}

const SIZE_CLASS: Record<WordmarkSize, string> = {
  default: "",
  topbar: "infield-brand-wordmark--topbar",
  hero: "infield-brand-wordmark--hero",
  "auth-panel": "infield-brand-wordmark--auth-panel",
};

export function InfieldBrandLogo({
  variant = "wordmark",
  theme = "auto",
  size = "default",
  className = "",
  alt = "InField",
}: InfieldBrandLogoProps) {
  if (variant === "icon" || variant === "splash") {
    const src =
      variant === "splash" ? BRAND_ASSETS.splash : BRAND_ASSETS.appIcon;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={`infield-brand-icon ${className}`.trim()}
      />
    );
  }

  const sizeClass = SIZE_CLASS[size];
  const base = `infield-brand-wordmark ${sizeClass} ${className}`.trim();

  if (theme === "auto") {
    return (
      <span className="infield-brand-wordmark-wrap" aria-label={alt}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={BRAND_ASSETS.lightWordmark}
          alt=""
          role="presentation"
          className={`${base} infield-brand-wordmark--theme-auto infield-brand-wordmark--light`}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={BRAND_ASSETS.darkWordmark}
          alt=""
          role="presentation"
          className={`${base} infield-brand-wordmark--theme-auto infield-brand-wordmark--dark`}
        />
      </span>
    );
  }

  const src =
    theme === "dark" ? BRAND_ASSETS.darkWordmark : BRAND_ASSETS.lightWordmark;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={base} />
  );
}
