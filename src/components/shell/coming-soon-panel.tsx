import type { LucideIcon } from "lucide-react";

export interface ComingSoonPanelProps {
  moduleName: string;
  description: string;
  icon: LucideIcon;
}

/**
 * INF2-1948 development placeholder for modules not yet built.
 */
export function ComingSoonPanel({
  moduleName,
  description,
  icon: Icon,
}: ComingSoonPanelProps) {
  return (
    <div className="coming-soon">
      <div className="cs-illus" aria-hidden="true">
        <Icon />
      </div>
      <div className="cs-tag">Coming Soon</div>
      <div className="cs-title">
        <span>{moduleName}</span> is on the way
      </div>
      <div className="cs-desc">{description}</div>
    </div>
  );
}
