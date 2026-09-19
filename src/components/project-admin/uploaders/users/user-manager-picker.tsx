"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { projectUsersService } from "@/lib/api/project-users-service";
import { formatUserNameWithCode } from "@/lib/project-admin/user-display";
import type { Designation } from "@/lib/api/designation-service";
import type { ProjectUser } from "@/types/project-admin";

export interface ManagerPickerOption {
  value: string;
  label: string;
}

export function buildManagerPickerOptions(params: {
  users: ProjectUser[];
  designations: Pick<Designation, "id" | "name" | "roleLevel">[];
  selfId?: string | null;
  reporteeIds: string[];
  formDesignationId: string;
}): ManagerPickerOption[] {
  const formLevel = params.designations.find(
    (designation) => designation.id === params.formDesignationId,
  )?.roleLevel;
  const levelById = new Map(
    params.designations.map((designation) => [designation.id, designation.roleLevel]),
  );
  const levelByName = new Map(
    params.designations.map((designation) => [designation.name, designation.roleLevel]),
  );
  const reporteeIds = new Set(params.reporteeIds);

  return params.users
    .filter((user) => {
      if (!user.backendId) return false;
      if (params.selfId && user.backendId === params.selfId) return false;
      if (reporteeIds.has(user.backendId)) return false;
      if (typeof formLevel === "number") {
        const candidateLevel =
          (user.designationId ? levelById.get(user.designationId) : undefined) ??
          levelByName.get(user.designation);
        if (typeof candidateLevel === "number" && candidateLevel <= formLevel) {
          return false;
        }
      }
      return true;
    })
    .map((user) => ({
      value: user.backendId,
      label: formatUserNameWithCode(user.name, user.id),
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function UserManagerPicker({
  projectId,
  value,
  onChange,
  selfId,
  reporteeIds,
  formDesignationId,
  designations,
  selectedLabel,
}: {
  projectId: string;
  value: string;
  onChange: (managerId: string, label?: string) => void;
  selfId?: string | null;
  reporteeIds: string[];
  formDesignationId: string;
  designations: Pick<Designation, "id" | "name" | "roleLevel">[];
  selectedLabel?: string;
}) {
  const [users, setUsers] = useState<ProjectUser[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    projectUsersService
      .listAllByProject(projectId)
      .then((list) => {
        if (!cancelled) setUsers(list);
      })
      .catch(() => {
        if (!cancelled) setUsers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    if (value && reporteeIds.includes(value)) {
      onChangeRef.current("");
    }
  }, [value, reporteeIds]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const options = useMemo(
    () =>
      buildManagerPickerOptions({
        users,
        designations,
        selfId,
        reporteeIds,
        formDesignationId,
      }),
    [users, designations, selfId, reporteeIds, formDesignationId],
  );

  const selectedFromUsers = users.find((user) => user.backendId === value);
  const selected =
    options.find((option) => option.value === value) ??
    (value
      ? {
          value,
          label:
            selectedLabel ||
            (selectedFromUsers
              ? formatUserNameWithCode(selectedFromUsers.name, selectedFromUsers.id)
              : "Selected manager"),
        }
      : undefined);
  const query = search.trim().toLowerCase();
  const filtered = query
    ? options.filter((option) => option.label.toLowerCase().includes(query))
    : options;

  return (
    <div className="form-group" style={{ gridColumn: "1 / -1" }}>
      <label className="form-label">Manager</label>
      <div className="udf-multiSelect" ref={rootRef}>
        <div
          className="udf-multiSelect__trigger"
          onClick={() => setOpen((current) => !current)}
        >
          <div className="udf-multiSelect__value">
            {selected ? (
              <span>{selected.label}</span>
            ) : (
              <span className="udf-multiSelect__placeholder">No manager</span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {value ? (
              <button
                type="button"
                className="udf-multiSelect__chipRemove"
                aria-label="Clear manager"
                        onClick={(event) => {
                          event.stopPropagation();
                          onChange("");
                        }}
              >
                <X size={12} aria-hidden="true" />
              </button>
            ) : null}
            <button
              type="button"
              className="udf-multiSelect__toggle"
              aria-label={`${open ? "Close" : "Open"} manager options`}
              aria-expanded={open}
              aria-haspopup="listbox"
              onClick={(event) => {
                event.stopPropagation();
                setOpen((current) => !current);
              }}
            >
              <ChevronDown
                className={`udf-multiSelect__chevron${open ? " open" : ""}`}
                size={16}
              />
            </button>
          </div>
        </div>

        {open && (
          <div className="udf-multiSelect__panel">
            <div className="udf-multiSelect__search">
              <Search size={15} aria-hidden="true" />
              <input
                autoFocus
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setOpen(false);
                    setSearch("");
                  }
                }}
                placeholder="Search manager"
                aria-label="Search manager"
              />
            </div>
            <div className="udf-multiSelect__options" role="listbox">
              <button
                type="button"
                className={`udf-multiSelect__option${!value ? " selected" : ""}`}
                onClick={() => {
                  onChange("");
                  setOpen(false);
                  setSearch("");
                }}
              >
                <span className="udf-multiSelect__check">
                  {!value ? <Check size={14} /> : null}
                </span>
                <span className="udf-multiSelect__optionLabel">No manager</span>
              </button>
              {filtered.length > 0 ? (
                filtered.map((option) => {
                  const selectedOption = option.value === value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={`udf-multiSelect__option${
                        selectedOption ? " selected" : ""
                      }`}
                      onClick={() => {
                        onChange(option.value, option.label);
                        setOpen(false);
                        setSearch("");
                      }}
                    >
                      <span className="udf-multiSelect__check">
                        {selectedOption ? <Check size={14} /> : null}
                      </span>
                      <span className="udf-multiSelect__optionLabel">
                        {option.label}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="udf-multiSelect__empty">
                  {options.length > 0 ? "No matching options" : "No managers available"}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
