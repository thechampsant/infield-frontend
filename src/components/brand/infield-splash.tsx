import { BRAND_ASSETS } from "@/lib/brand/assets";

export interface InfieldSplashProps {
  message?: string;
  className?: string;
}

/**
 * Full-screen loading splash — centered splash.svg with animation.
 */
export function InfieldSplash({
  message = "Loading",
  className = "",
}: InfieldSplashProps) {
  return (
    <div
      className={`infield-splash-screen ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="infield-splash-screen__center">
        <div className="infield-splash-screen__frame">
          <div className="infield-splash-screen__glow" aria-hidden />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={BRAND_ASSETS.splash}
            alt="InField"
            className="infield-splash-screen__logo"
          />
        </div>
        <p className="infield-splash-screen__msg">
          {message}
          <span className="infield-splash-screen__dots" aria-hidden>
            <span />
            <span />
            <span />
          </span>
        </p>
      </div>
    </div>
  );
}
