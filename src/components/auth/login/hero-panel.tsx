import type { ReactNode } from "react";
import { InfieldBrandLogo } from "@/components/brand/infield-brand-logo";

interface HeroPanelProps {
  eyebrow: string;
  title: ReactNode;
  /** Emphasised second line rendered in teal below the title. */
  titleEm?: string;
  subtitle: string;
  showStats?: boolean;
  links?: { label: string; href: string }[];
}

const DEFAULT_LINKS = [
  { label: "Privacy", href: "#" },
  { label: "Terms", href: "#" },
  { label: "Help", href: "#" },
];

export function HeroPanel({
  eyebrow,
  title,
  titleEm,
  subtitle,
  showStats = false,
  links = DEFAULT_LINKS,
}: HeroPanelProps) {
  return (
    <aside className="hero">
      <div className="hero-brand" aria-label="InField">
        <InfieldBrandLogo
          variant="splash"
          className="infield-brand-splash--hero"
        />
      </div>

      <div className="hero-body">
        <div className="hero-eyebrow">{eyebrow}</div>
        <h1 className="hero-h1">
          {title}
          {titleEm ? <em>{titleEm}</em> : null}
        </h1>
        <p className="hero-p">{subtitle}</p>

        {showStats ? (
          <div className="hero-stats">
            <div className="h-stat">
              <div className="sv">40K+</div>
              <div className="sl">Devices</div>
            </div>
            <div className="h-stat">
              <div className="sv">20L+</div>
              <div className="sl">Stores</div>
            </div>
            <div className="h-stat">
              <div className="sv">75+</div>
              <div className="sl">Brands</div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="hero-bottom">
        <div className="hero-foot">© 2026 V5 Global Services</div>
        <div className="hero-links">
          {links.map((l) => (
            <a key={l.label} href={l.href}>
              {l.label}
            </a>
          ))}
        </div>
      </div>
    </aside>
  );
}
