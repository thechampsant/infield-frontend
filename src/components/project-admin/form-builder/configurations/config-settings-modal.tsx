"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "@/components/project-admin/shared/modal";
import { formBuilderService } from "@/lib/form-builder/form-builder-service";
import { designationService, type Designation } from "@/lib/api/designation-service";
import { useProjectContext } from "@/lib/project-admin/project-context";
import type {
  FormConfiguration,
  EditPermission,
  EditWindow,
} from "@/lib/form-builder/types";

interface ConfigSettingsModalProps {
  config: FormConfiguration;
  open: boolean;
  onClose: () => void;
  onSave: (updated: FormConfiguration) => void;
}

export function ConfigSettingsModal({
  config,
  open,
  onClose,
  onSave,
}: ConfigSettingsModalProps) {
  const { projectId } = useProjectContext();

  const [name, setName] = useState(config.name);
  // designations stores IDs (sent as applicableDesignation to API)
  const [selectedDesignationIds, setSelectedDesignationIds] = useState<string[]>(
    config.designations
  );
  const [editPermission, setEditPermission] = useState<EditPermission>(
    config.editPermission
  );
  const [editWindow, setEditWindow] = useState<EditWindow>(config.editWindow);
  const [editWindowHours, setEditWindowHours] = useState(
    config.editWindowHours
  );
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Designation picker state
  const [allDesignations, setAllDesignations] = useState<Designation[]>([]);
  const [designationsLoading, setDesignationsLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch designations when modal opens
  const fetchDesignations = useCallback(async () => {
    if (!projectId) return;
    setDesignationsLoading(true);
    try {
      const list = await designationService.listByProject(projectId);
      setAllDesignations(list);
    } catch {
      // Silently fail – user can still type manually if needed
      setAllDesignations([]);
    } finally {
      setDesignationsLoading(false);
    }
  }, [projectId]);

  // Reset form state when modal opens or config changes
  useEffect(() => {
    if (open) {
      setName(config.name);
      setSelectedDesignationIds(config.designations);
      setEditPermission(config.editPermission);
      setEditWindow(config.editWindow);
      setEditWindowHours(config.editWindowHours);
      setNameError(null);
      setSubmitError(null);
      setSearchQuery("");
      setDropdownOpen(false);
      fetchDesignations();
    }
  }, [open, config, fetchDesignations]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  const toggleDesignation = (designationId: string) => {
    setSelectedDesignationIds((prev) =>
      prev.includes(designationId)
        ? prev.filter((d) => d !== designationId)
        : [...prev, designationId]
    );
  };

  const removeDesignation = (designationId: string) => {
    setSelectedDesignationIds((prev) => prev.filter((d) => d !== designationId));
  };

  // Helper to get a designation name by ID
  const getDesignationName = (id: string): string => {
    const found = allDesignations.find((d) => d.id === id);
    return found?.name ?? id;
  };

  const filteredDesignations = allDesignations.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = async () => {
    // Validate name
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError("Form name is required");
      return;
    }
    if (trimmedName.length > 100) {
      setNameError("Form name must be 100 characters or fewer");
      return;
    }
    setNameError(null);

    setSubmitting(true);
    setSubmitError(null);
    try {
      const updated = await formBuilderService.updateConfiguration(config.id, {
        name: trimmedName,
        designations: selectedDesignationIds,
        editPermission,
        editWindow,
        editWindowHours:
          editPermission === "editable" && editWindow === "custom-hours"
            ? editWindowHours
            : config.editWindowHours,
      });
      onSave(updated);
      onClose();
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e.message : "Failed to update configuration"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Configuration Settings"
      width={520}
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
            {submitting ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      {submitError && (
        <div
          className="pa-info-banner"
          style={{
            color: "var(--red)",
            background: "var(--red-light)",
            borderColor: "var(--red-mid)",
            marginBottom: 16,
          }}
        >
          {submitError}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Form Name */}
        <div className="form-group">
          <label className="form-label">
            Form Name <span className="req">*</span>
          </label>
          <input
            className={`form-input${nameError ? " err" : ""}`}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError(null);
            }}
            maxLength={100}
            placeholder="Enter form name"
          />
          {nameError && (
            <span
              style={{
                fontSize: 12,
                color: "var(--red, #dc2626)",
                marginTop: 4,
                display: "block",
              }}
            >
              {nameError}
            </span>
          )}
        </div>

        {/* Designations Multi-Select */}
        <div className="form-group">
          <label className="form-label">Designations</label>
          <div ref={dropdownRef} style={{ position: "relative" }}>
            {/* Selected chips + trigger */}
            <div
              onClick={() => setDropdownOpen((prev) => !prev)}
              style={{
                border: "1px solid var(--border, #e2e8f0)",
                borderRadius: 6,
                padding: "6px 8px",
                minHeight: 38,
                display: "flex",
                flexWrap: "wrap",
                gap: 4,
                alignItems: "center",
                cursor: "pointer",
                background: "var(--bg-input, #fff)",
              }}
            >
              {selectedDesignationIds.length === 0 && (
                <span style={{ color: "var(--text-muted, #94a3b8)", fontSize: 13 }}>
                  Select designations…
                </span>
              )}
              {selectedDesignationIds.map((id) => (
                <span
                  key={id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    background: "var(--primary-light, #e0e7ff)",
                    color: "var(--primary, #4f46e5)",
                    borderRadius: 4,
                    padding: "2px 8px",
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  {getDesignationName(id)}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeDesignation(id);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      fontSize: 14,
                      lineHeight: 1,
                      color: "var(--primary, #4f46e5)",
                    }}
                    aria-label={`Remove ${getDesignationName(id)}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            {/* Dropdown */}
            {dropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  right: 0,
                  background: "var(--bg-surface, #fff)",
                  border: "1px solid var(--border, #e2e8f0)",
                  borderRadius: 6,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  zIndex: 50,
                  maxHeight: 220,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Search input */}
                <div style={{ padding: "8px 8px 4px" }}>
                  <input
                    className="form-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search designations…"
                    autoFocus
                    style={{ fontSize: 13 }}
                  />
                </div>

                {/* Options list */}
                <div style={{ overflowY: "auto", padding: "4px 0" }}>
                  {designationsLoading ? (
                    <div style={{ padding: "12px 16px", fontSize: 13, color: "var(--text-muted, #94a3b8)" }}>
                      Loading designations…
                    </div>
                  ) : filteredDesignations.length === 0 ? (
                    <div style={{ padding: "12px 16px", fontSize: 13, color: "var(--text-muted, #94a3b8)" }}>
                      {searchQuery ? "No designations match your search" : "No designations available"}
                    </div>
                  ) : (
                    filteredDesignations.map((d) => {
                      const isSelected = selectedDesignationIds.includes(d.id);
                      return (
                        <label
                          key={d.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "6px 12px",
                            cursor: "pointer",
                            fontSize: 13,
                            background: isSelected
                              ? "var(--primary-light, #e0e7ff)"
                              : "transparent",
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected)
                              (e.currentTarget as HTMLElement).style.background =
                                "var(--hover-bg, #f1f5f9)";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.background = isSelected
                              ? "var(--primary-light, #e0e7ff)"
                              : "transparent";
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleDesignation(d.id)}
                            style={{ accentColor: "var(--primary, #4f46e5)" }}
                          />
                          {d.name}
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
          <span
            style={{
              fontSize: 11,
              color: "var(--text-muted, #94a3b8)",
              marginTop: 4,
              display: "block",
            }}
          >
            Click to select one or more designations
          </span>
        </div>

        {/* Edit Permission */}
        <div className="form-group">
          <label className="form-label">Edit Permission</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="editPermission"
                value="editable"
                checked={editPermission === "editable"}
                onChange={() => setEditPermission("editable")}
              />
              Editable
            </label>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="editPermission"
                value="locked"
                checked={editPermission === "locked"}
                onChange={() => setEditPermission("locked")}
              />
              Locked after submit
            </label>
          </div>
        </div>

        {/* Edit Window (only when editable) */}
        {editPermission === "editable" && (
          <div className="form-group">
            <label className="form-label">Edit Window</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="editWindow"
                  value="until-checkout"
                  checked={editWindow === "until-checkout"}
                  onChange={() => setEditWindow("until-checkout")}
                />
                Until checkout
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="editWindow"
                  value="custom-hours"
                  checked={editWindow === "custom-hours"}
                  onChange={() => setEditWindow("custom-hours")}
                />
                Custom hours
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="editWindow"
                  value="manager-approval"
                  checked={editWindow === "manager-approval"}
                  onChange={() => setEditWindow("manager-approval")}
                />
                Manager approval
              </label>
            </div>
          </div>
        )}

        {/* Edit Window Hours (only when custom-hours) */}
        {editPermission === "editable" && editWindow === "custom-hours" && (
          <div className="form-group">
            <label className="form-label">Edit Window Hours</label>
            <input
              className="form-input"
              type="number"
              min={0}
              max={720}
              value={editWindowHours}
              onChange={(e) => {
                const val = Math.max(0, Math.min(720, Number(e.target.value)));
                setEditWindowHours(val);
              }}
              placeholder="0–720"
            />
            <span
              style={{
                fontSize: 11,
                color: "var(--text-muted, #94a3b8)",
                marginTop: 4,
                display: "block",
              }}
            >
              How many hours after submission the form can be edited (0–720)
            </span>
          </div>
        )}
      </div>
    </Modal>
  );
}
