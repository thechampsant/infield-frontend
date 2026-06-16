"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/project-admin/shared/modal";
import { userStoreMappingService, type MappedUser } from "@/lib/api/user-store-mapping-service";
import { formatApiError } from "@/lib/api";
import type { StoreRecord } from "@/lib/api/store-service";

interface AssignStoresModalProps {
  user: MappedUser;
  stores: StoreRecord[];
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AssignStoresModal({
  user,
  stores,
  open,
  onClose,
  onSuccess,
}: AssignStoresModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-populate with current mapping on open
  useEffect(() => {
    if (open) {
      setSelected(new Set(user.mappedStoreIds));
      setSearch("");
      setError(null);
    }
  }, [open, user.mappedStoreIds]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return stores;
    return stores.filter(
      (s) =>
        s.storeName.toLowerCase().includes(q) ||
        s.storeCode.toLowerCase().includes(q),
    );
  }, [stores, search]);

  const toggleStore = (storeId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(storeId)) {
        next.delete(storeId);
      } else {
        next.add(storeId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(filtered.map((s) => s.backendId)));
  };

  const clearAll = () => {
    setSelected(new Set());
  };

  const handleSave = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await userStoreMappingService.updateMapping(user.backendId, Array.from(selected));
      onSuccess();
    } catch (e) {
      setError(formatApiError(e, "Failed to update store mapping"));
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCount = selected.size;
  const totalCount = stores.length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Assign Stores — ${user.name}`}
      width={600}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={submitting}
          >
            {submitting ? "Saving…" : `Save Mapping (${selectedCount} stores)`}
          </button>
        </>
      }
    >
      {/* User info */}
      <div
        style={{
          padding: "10px 14px",
          borderRadius: 10,
          background: "var(--surface2)",
          border: "1px solid var(--border)",
          marginBottom: 16,
          display: "flex",
          gap: 16,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--navy)" }}>{user.name}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{user.email}</div>
        </div>
        {user.designation && (
          <div
            style={{
              fontSize: 11,
              padding: "3px 10px",
              borderRadius: 20,
              background: "var(--blue-pale)",
              color: "var(--blue)",
              fontWeight: 600,
            }}
          >
            {user.designation}
          </div>
        )}
        <div style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-muted)" }}>
          {selectedCount} / {totalCount} stores selected
        </div>
      </div>

      {error && (
        <div
          className="pa-info-banner"
          style={{
            color: "var(--red)",
            background: "var(--red-light)",
            borderColor: "var(--red-mid)",
            marginBottom: 12,
          }}
        >
          {error}
        </div>
      )}

      {/* Search + bulk actions */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
        <input
          className="form-input"
          style={{ flex: 1 }}
          placeholder="Search stores by name or code…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={selectAll}
          disabled={filtered.length === 0}
        >
          Select All
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={clearAll}
          disabled={selected.size === 0}
        >
          Clear
        </button>
      </div>

      {/* Store list */}
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: 10,
          overflow: "hidden",
          maxHeight: 340,
          overflowY: "auto",
        }}
      >
        {stores.length === 0 ? (
          <div
            style={{
              padding: 24,
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: 13,
            }}
          >
            No stores found for this project. Add stores first.
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              padding: 24,
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: 13,
            }}
          >
            No stores match &quot;{search}&quot;
          </div>
        ) : (
          filtered.map((store, idx) => {
            const isChecked = selected.has(store.backendId);
            return (
              <label
                key={store.backendId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "11px 16px",
                  borderBottom:
                    idx < filtered.length - 1 ? "1px solid var(--border)" : "none",
                  cursor: "pointer",
                  background: isChecked ? "var(--blue-pale)" : "var(--surface)",
                  transition: "background .1s",
                  userSelect: "none",
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleStore(store.backendId)}
                  style={{ width: 16, height: 16, flexShrink: 0, accentColor: "var(--blue)" }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--navy)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {store.storeName}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {store.storeCode}
                  </div>
                </div>
                {isChecked && (
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 20,
                      background: "var(--blue)",
                      color: "#fff",
                      flexShrink: 0,
                    }}
                  >
                    Assigned
                  </div>
                )}
              </label>
            );
          })
        )}
      </div>
    </Modal>
  );
}
