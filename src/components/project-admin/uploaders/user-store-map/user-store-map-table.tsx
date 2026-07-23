"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link2, Link2Off } from "lucide-react";
import { AssignStoresModal } from "./assign-stores-modal";
import type { MappedUser } from "@/lib/api/user-store-mapping-service";
import type { StoreRecord } from "@/lib/api/store-service";

const PAGE_SIZE = 50;

interface UserStoreMapTableProps {
  users: MappedUser[];
  stores: StoreRecord[];
  loading: boolean;
  onRefresh: () => void;
}

export function UserStoreMapTable({
  users,
  stores,
  loading,
  onRefresh,
}: UserStoreMapTableProps) {
  const [search, setSearch] = useState("");
  const [filterMapped, setFilterMapped] = useState<"all" | "mapped" | "unmapped">("all");
  const [assignUser, setAssignUser] = useState<MappedUser | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Build a lookup: storeId → StoreRecord for fast name resolution
  const storeById = useMemo(
    () => new Map(stores.map((s) => [s.backendId, s])),
    [stores],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users
      .filter((u) => {
        if (filterMapped === "mapped") return u.mappedStoreIds.length > 0;
        if (filterMapped === "unmapped") return u.mappedStoreIds.length === 0;
        return true;
      })
      .filter((u) => {
        if (!q) return true;
        return (
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.employeeId.toLowerCase().includes(q) ||
          u.designation.toLowerCase().includes(q)
        );
      });
  }, [users, search, filterMapped]);

  // Reset visible count when filters/search change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, filterMapped]);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      setVisibleCount((prev) => {
        const next = prev + PAGE_SIZE;
        return next > filtered.length ? filtered.length : next;
      });
    }
  }, [filtered.length]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const displayedUsers = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const mappedCount = users.filter((u) => u.mappedStoreIds.length > 0).length;
  const unmappedCount = users.length - mappedCount;

  const cellTruncate: React.CSSProperties = {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  return (
    <>
      {/* Stat pills */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        {(
          [
            { key: "all", label: "All Users", count: users.length },
            { key: "mapped", label: "Mapped", count: mappedCount },
            { key: "unmapped", label: "Unmapped", count: unmappedCount },
          ] as const
        ).map(({ key, label, count }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilterMapped(key)}
            style={{
              padding: "7px 16px",
              borderRadius: 20,
              border: `2px solid ${filterMapped === key ? "var(--blue)" : "var(--border)"}`,
              background: filterMapped === key ? "var(--blue-pale)" : "var(--surface)",
              fontWeight: 700,
              fontSize: 12,
              color: filterMapped === key ? "var(--blue)" : "var(--text-mid)",
              cursor: "pointer",
              transition: "all .15s",
            }}
          >
            {label}{" "}
            <span
              style={{
                marginLeft: 6,
                background: filterMapped === key ? "var(--blue)" : "var(--surface2)",
                color: filterMapped === key ? "#fff" : "var(--text-muted)",
                borderRadius: 10,
                padding: "1px 7px",
                fontSize: 11,
              }}
            >
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Table card */}
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: 12,
          overflow: "hidden",
          background: "var(--surface)",
        }}
      >
        {/* Toolbar */}
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            padding: "12px 16px",
            borderBottom: "1px solid var(--border)",
            background: "var(--surface2)",
          }}
        >
          <input
            type="text"
            className="form-input"
            style={{ flex: 1, maxWidth: 320 }}
            placeholder="Search users by name, email, ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto" }}>
            {loading ? "Loading…" : `Showing ${displayedUsers.length} of ${filtered.length} users`}
          </div>
        </div>

        {/* Column header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.8fr 140px 1fr 90px",
            gap: 12,
            padding: "10px 20px",
            borderBottom: "1px solid var(--border)",
            background: "var(--surface2)",
            fontSize: 11,
            fontWeight: 700,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.6px",
            minWidth: 600,
          }}
        >
          <span>User</span>
          <span>Designation</span>
          <span>Mapped Stores</span>
          <span style={{ textAlign: "right" }}>Action</span>
        </div>

        {/* Rows */}
        <div ref={scrollContainerRef} style={{ overflowY: "auto", maxHeight: 640 }}>
        {loading ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            {search || filterMapped !== "all"
              ? "No users match the current filter."
              : "No users found for this project."}
          </div>
        ) : (
          <>
          {displayedUsers.map((user, idx) => {
            const mappedStores = user.mappedStoreIds
              .map((id) => storeById.get(id))
              .filter((s): s is StoreRecord => Boolean(s));
            const hasMapped = mappedStores.length > 0;
            const orphanCount = user.mappedStoreIds.length - mappedStores.length;

            return (
              <div
                key={`${user.backendId}-${idx}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.8fr 140px 1fr 90px",
                  gap: 12,
                  padding: "14px 20px",
                  borderBottom: "1px solid var(--border)",
                  alignItems: "center",
                  minWidth: 600,
                }}
              >
                {/* User info */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      background: hasMapped ? "var(--blue)" : "var(--surface2)",
                      border: hasMapped ? "none" : "1px solid var(--border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      color: hasMapped ? "#fff" : "var(--text-muted)",
                    }}
                  >
                    {hasMapped ? <Link2 size={14} /> : <Link2Off size={14} />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--navy)", ...cellTruncate }}>
                      {user.name}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", ...cellTruncate }}>
                      {user.email}
                    </div>
                  </div>
                </div>

                {/* Designation */}
                <div style={{ fontSize: 12, color: "var(--text-mid)", ...cellTruncate }}>
                  {user.designation || "—"}
                </div>

                {/* Mapped stores */}
                <div>
                  {hasMapped ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {mappedStores.slice(0, 3).map((s, sIdx) => (
                        <span
                          key={`${s.backendId}-${sIdx}`}
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: 20,
                            background: "var(--teal-light, #f0fdfa)",
                            color: "var(--teal, #0d9488)",
                            border: "1px solid var(--teal-mid, #99f6e4)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {s.storeName}
                        </span>
                      ))}
                      {mappedStores.length > 3 && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: 20,
                            background: "var(--surface2)",
                            color: "var(--text-muted)",
                            border: "1px solid var(--border)",
                          }}
                        >
                          +{mappedStores.length - 3} more
                        </span>
                      )}
                      {orphanCount > 0 && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: 20,
                            background: "var(--orange-light, #fff7ed)",
                            color: "var(--orange, #d97706)",
                            border: "1px solid var(--orange-mid, #fcd34d)",
                          }}
                        >
                          {orphanCount} invalid
                        </span>
                      )}
                    </div>
                  ) : (
                    <span style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>
                      No stores mapped
                    </span>
                  )}
                </div>

                {/* Action */}
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setAssignUser(user)}
                    style={{ fontSize: 11, whiteSpace: "nowrap" }}
                  >
                    {hasMapped ? "Edit" : "Assign"}
                  </button>
                </div>
              </div>
            );
          })}
          {hasMore && (
            <div
              style={{
                padding: "12px 20px",
                textAlign: "center",
                fontSize: 11,
                color: "var(--text-muted)",
                fontWeight: 500,
              }}
            >
              Scroll down for more…
            </div>
          )}
          </>
        )}
        </div>

        {/* Footer */}
        {!loading && filtered.length > 0 && (
          <div
            style={{
              padding: "10px 20px",
              fontSize: 11,
              color: "var(--text-muted)",
              borderTop: "1px solid var(--border)",
              background: "var(--surface2)",
            }}
          >
            {mappedCount} of {users.length} users have store mappings
          </div>
        )}
      </div>

      {/* Assign modal */}
      {assignUser && (
        <AssignStoresModal
          user={assignUser}
          stores={stores.filter((s) => s.isActive)}
          open={!!assignUser}
          onClose={() => setAssignUser(null)}
          onSuccess={() => {
            setAssignUser(null);
            onRefresh();
          }}
        />
      )}
    </>
  );
}
