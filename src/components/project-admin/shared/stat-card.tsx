"use client";

interface StatCardProps {
  value: number;
  label: string;
  color: "blue" | "teal" | "red";
  icon: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  /** Unfiltered total, shown as "642 of 1049" when `filtered`. */
  ofTotal?: number;
  /** Show the FILTERED tag and the "of" total. */
  filtered?: boolean;
}

const COLOR_MAP = {
  blue: { bg: "var(--blue-pale)", stroke: "var(--blue)" },
  teal: { bg: "var(--teal-light)", stroke: "var(--teal)" },
  red: { bg: "var(--red-light)", stroke: "var(--red)" },
};

export function StatCard({
  value,
  label,
  color,
  icon,
  selected,
  onClick,
  ofTotal,
  filtered,
}: StatCardProps) {
  const c = COLOR_MAP[color];
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onClick();
            }
          : undefined
      }
      style={{
        border: `2px solid ${selected ? "var(--blue)" : "var(--border)"}`,
        borderRadius: 12,
        padding: 20,
        display: "flex",
        alignItems: "flex-start",
        gap: 16,
        boxShadow: selected ? "var(--shadow-md)" : "var(--shadow-sm)",
        background: selected ? "var(--blue-pale)" : "var(--surface)",
        cursor: onClick ? "pointer" : "default",
        transition: "all .15s",
        userSelect: "none",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          background: c.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color: c.stroke,
        }}
      >
        {icon}
      </div>
      <div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: "var(--navy)",
            letterSpacing: "-.5px",
            lineHeight: 1,
          }}
        >
          {value}
          {filtered && ofTotal !== undefined && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-muted)",
                letterSpacing: 0,
                marginLeft: 6,
              }}
            >
              of {ofTotal}
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-muted)",
            marginTop: 4,
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 6,
          }}
        >
          {label}
          {filtered && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "1px",
                color: "var(--blue)",
                background: "var(--blue-pale)",
                border: "1px solid var(--blue-light)",
                borderRadius: 999,
                padding: "1px 7px",
              }}
            >
              FILTERED
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
