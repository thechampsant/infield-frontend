"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/project-admin/shared/modal";
import {
  userStoreMappingService,
  type UserStoreMappingSummary,
} from "@/lib/api/user-store-mapping-service";
import { formatApiError } from "@/lib/api";
import { MAX_LIST_PAGE_SIZE } from "@/lib/api/pagination";
import type { StoreRecord } from "@/lib/api/store-service";

const SEARCH_DEBOUNCE_MS = 300;

interface AssignStoresModalProps {
  user: UserStoreMappingSummary;
  projectId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AssignStoresModal({
  user,
  projectId,
  open,
  onClose,
  onSuccess,
}: AssignStoresModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [stores, setStores] = useState<StoreRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setDebouncedSearch("");
    setError(null);
    let cancelled = false;

    const loadMapped = async () => {
      setLoading(true);
      try {
        const storeIds = await userStoreMappingService.getMappedStoreIds(projectId, user.userId);
        if (!cancelled) setSelected(new Set(storeIds));
      } catch (e) {
        if (!cancelled) {
          setError(formatApiError(e, "Failed to load mapped stores"));
          setSelected(new Set());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadMapped();
    return () => {
      cancelled = true;
    };
  }, [open, projectId, user.userId]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const loadStores = async () => {
      try {
        const result = await userStoreMappingService.listStoresPage(
          projectId,
          1,
          MAX_LIST_PAGE_SIZE,
          debouncedSearch || undefined,
        );
        if (!cancelled) setStores(result.data);
      } catch (e) {
        if (!cancelled) {
          setError(formatApiError(e, "Failed to search stores"));
          setStores([]);
        }
      }
    };

    loadStores();
    return () => {
      cancelled = true;
    };
  }, [open, projectId, debouncedSearch]);

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
    setSelected((prev) => {
      const next = new Set(prev);
      stores.forEach((store) => next.add(store.backendId));
      return next;
    });
  };

  const clearPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      stores.forEach((store) => next.delete(store.backendId));
      return next;
    });
  };

  const handleSave = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await userStoreMappingService.updateMapping(user.userId, Array.from(selected));
      onSuccess();
    } catch (e) {
      setError(formatApiError(e, "Failed to update store mapping"));
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCount = selected.size;
  const pageSelectedCount = stores.filter((store) => selected.has(store.backendId)).length;

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
            disabled={submitting || loading}
          >
            {submitting ? "Saving…" : `Save Mapping (${selectedCount} stores)`}
          </button>
        </>
      }
    >
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
          {selectedCount} selected · {pageSelectedCount}/{stores.length} on this page
        </div>
      </div>

      <div className="pa-info-banner" style={{ marginBottom: 12 }}>
        Search loads up to {MAX_LIST_PAGE_SIZE} stores. Select All / Clear apply to this page only.
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
          disabled={stores.length === 0}
        >
          Select All
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={clearPage}
          disabled={pageSelectedCount === 0}
        >
          Clear
        </button>
      </div>

      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: 10,
          overflow: "hidden",
          maxHeight: 340,
          overflowY: "auto",
        }}
      >
        {loading ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            Loading mapped stores…
          </div>
        ) : stores.length === 0 ? (
          <div
            style={{
              padding: 24,
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: 13,
            }}
          >
            {debouncedSearch
              ? `No stores match "${debouncedSearch}"`
              : "No stores found for this project. Add stores first."}
          </div>
        ) : (
          stores.map((store, idx) => {
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
                    idx < stores.length - 1 ? "1px solid var(--border)" : "none",
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
