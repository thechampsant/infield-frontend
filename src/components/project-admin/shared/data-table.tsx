"use client";

interface Column {
  key: string;
  label: string;
  width?: string | number;
  align?: "left" | "right" | "center";
}

interface DataTableProps {
  columns: Column[];
  rows: React.ReactNode[];
  total: number;
  filtered: number;
  entityLabel: string;
  searchValue: string;
  onSearchChange: (v: string) => void;
  toolbarLeft?: React.ReactNode;
  toolbarRight?: React.ReactNode;
  loading?: boolean;
  emptyMessage?: string;
}

export function DataTable({
  columns,
  rows,
  total,
  filtered,
  entityLabel,
  searchValue,
  onSearchChange,
  toolbarLeft,
  toolbarRight,
  loading,
  emptyMessage,
}: DataTableProps) {
  const gridCols = columns
    .map((c) =>
      typeof c.width === "number" ? `${c.width}px` : (c.width ?? "1fr"),
    )
    .join(" ");

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid var(--border)",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "0 12px",
              minHeight: 40,
              flex: 1,
              maxWidth: 320,
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-muted)"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={`Search ${entityLabel}…`}
              style={{
                border: "none",
                background: "transparent",
                fontSize: 12,
                color: "var(--text)",
                width: "100%",
                outline: "none",
              }}
            />
          </div>

          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-muted)",
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              padding: "4px 12px",
              borderRadius: 999,
            }}
          >
            {filtered} {entityLabel}
          </span>

          {toolbarLeft}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {toolbarRight}
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: gridCols,
            gap: 12,
            padding: "12px 20px",
            background: "var(--surface2)",
            borderBottom: "1px solid var(--border)",
            alignItems: "center",
            minWidth: 720,
          }}
        >
          {columns.map((col) => (
            <span
              key={col.key}
              style={{
                display: "block",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                textAlign: col.align ?? "left",
                whiteSpace: "nowrap",
                wordBreak: "normal",
                overflowWrap: "normal",
                writingMode: "horizontal-tb",
                textOrientation: "mixed",
              }}
            >
              {col.label}
            </span>
          ))}
        </div>

        {loading ? (
          <div className="pa-loading">Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "var(--text-muted)",
                marginBottom: 4,
              }}
            >
              {emptyMessage ?? `No ${entityLabel} found`}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Adjust your search or filter.
            </div>
          </div>
        ) : (
          rows
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 20px",
          borderTop: "1px solid var(--border)",
          background: "var(--surface2)",
        }}
      >
        <span
          style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}
        >
          Showing {filtered} of {total}
        </span>
      </div>
    </div>
  );
}
