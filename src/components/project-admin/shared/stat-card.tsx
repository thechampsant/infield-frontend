"use client";

interface StatCardProps {
  value: number;
  label: string;
  color: "blue" | "teal" | "red";
  icon: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
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
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-muted)",
            marginTop: 4,
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}
