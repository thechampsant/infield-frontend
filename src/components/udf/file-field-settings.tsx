"use client";

import { useMemo, useState } from "react";
import {
  DEFAULT_MAX_FILE_COUNT,
  DEFAULT_MAX_FILE_SIZE_MB,
  FILE_EXTENSION_PRESETS,
  MAX_FILE_COUNT_LIMIT,
  MAX_FILE_SIZE_MB_LIMIT,
  fileFieldConfigToPatch,
  loadFileFieldConfig,
  normalizeFileExtensions,
} from "@/lib/udf/file-field-config";

type FileFieldSettingsProps = {
  config: Record<string, unknown> | undefined;
  onChange: (patch: Record<string, unknown>) => void;
  variant?: "claims" | "modal";
};

const helpTextStyle: React.CSSProperties = {
  marginTop: 6,
  fontSize: 12,
  color: "#64748b",
  lineHeight: 1.5,
};

const infoTextStyle: React.CSSProperties = {
  marginTop: 8,
  padding: "8px 10px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 6,
  fontSize: 12,
  color: "#475569",
  lineHeight: 1.5,
};

export function FileFieldSettings({
  config,
  onChange,
  variant = "claims",
}: FileFieldSettingsProps) {
  const loaded = useMemo(() => loadFileFieldConfig(config), [config]);
  const [customExtension, setCustomExtension] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(loaded.acceptMimeTypes.length > 0);

  const formGroupClass = variant === "claims" ? "claims-fb-formGroup" : "form-group";
  const togglesClass = variant === "claims" ? "claims-fb-toggles" : undefined;
  const labelClass = variant === "modal" ? "form-label" : undefined;
  const inputClass = "form-input";

  function applyPatch(patch: Partial<typeof loaded>) {
    onChange(fileFieldConfigToPatch(loaded, patch));
  }

  function toggleExtension(extension: string) {
    const normalized = normalizeFileExtensions([extension])[0];
    if (!normalized) return;

    const next = loaded.allowedExtensions.includes(normalized)
      ? loaded.allowedExtensions.filter((item) => item !== normalized)
      : [...loaded.allowedExtensions, normalized];

    applyPatch({ allowedExtensions: next });
  }

  function addCustomExtension() {
    const next = normalizeFileExtensions([
      ...loaded.allowedExtensions,
      ...customExtension.split(/[,\s]+/),
    ]);
    if (next.length === loaded.allowedExtensions.length && !customExtension.trim()) {
      return;
    }
    applyPatch({ allowedExtensions: next });
    setCustomExtension("");
  }

  return (
    <>
      <div className={formGroupClass}>
        <label className={labelClass}>Allowed extensions</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
          {FILE_EXTENSION_PRESETS.map((extension) => {
            const selected = loaded.allowedExtensions.includes(extension);
            return (
              <button
                key={extension}
                type="button"
                onClick={() => toggleExtension(extension)}
                style={{
                  borderRadius: 999,
                  border: selected ? "1px solid #2563eb" : "1px solid #cbd5e1",
                  background: selected ? "#eff6ff" : "#ffffff",
                  color: selected ? "#1d4ed8" : "#475569",
                  padding: "4px 10px",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                .{extension}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className={inputClass}
            placeholder="Add extension, e.g. csv"
            value={customExtension}
            onChange={(event) => setCustomExtension(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addCustomExtension();
              }
            }}
          />
          <button
            type="button"
            className={inputClass}
            style={{ width: 72, flexShrink: 0, cursor: "pointer" }}
            onClick={addCustomExtension}
          >
            Add
          </button>
        </div>
        {loaded.allowedExtensions.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {loaded.allowedExtensions.map((extension) => (
              <button
                key={extension}
                type="button"
                onClick={() =>
                  applyPatch({
                    allowedExtensions: loaded.allowedExtensions.filter((item) => item !== extension),
                  })
                }
                style={{
                  borderRadius: 999,
                  border: "1px solid #cbd5e1",
                  background: "#f8fafc",
                  color: "#0f172a",
                  padding: "4px 10px",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                .{extension} ×
              </button>
            ))}
          </div>
        )}
        <p style={helpTextStyle}>
          Leave empty to allow any file extension. The backend enforces this list at submit when
          configured.
        </p>
      </div>

      <div className={togglesClass}>
        <label>
          <input
            type="checkbox"
            checked={loaded.multiple}
            onChange={(event) =>
              applyPatch({
                multiple: event.target.checked,
                maxCount: event.target.checked
                  ? Math.max(loaded.maxCount, DEFAULT_MAX_FILE_COUNT)
                  : 1,
              })
            }
          />
          Allow multiple files
        </label>
      </div>

      {loaded.multiple && (
        <div className={formGroupClass}>
          <label className={labelClass}>Max files</label>
          <input
            type="number"
            min={1}
            max={MAX_FILE_COUNT_LIMIT}
            className={inputClass}
            value={loaded.maxCount}
            onChange={(event) =>
              applyPatch({
                maxCount: Math.min(
                  MAX_FILE_COUNT_LIMIT,
                  Math.max(1, Number(event.target.value) || 1),
                ),
              })
            }
          />
          <p style={helpTextStyle}>Maximum {MAX_FILE_COUNT_LIMIT} files when multiple uploads are enabled.</p>
        </div>
      )}

      <div className={formGroupClass}>
        <label className={labelClass}>Max file size (MB)</label>
        <input
          type="number"
          min={1}
          max={MAX_FILE_SIZE_MB_LIMIT}
          className={inputClass}
          value={loaded.maxFileSizeMB}
          onChange={(event) =>
            applyPatch({
              maxFileSizeMB: Math.min(
                MAX_FILE_SIZE_MB_LIMIT,
                Math.max(1, Number(event.target.value) || DEFAULT_MAX_FILE_SIZE_MB),
              ),
            })
          }
        />
        <p style={helpTextStyle}>
          Enforced on mobile before upload. The backend does not verify file size at submit today.
        </p>
      </div>

      <div className={formGroupClass}>
        <button
          type="button"
          className={inputClass}
          style={{ cursor: "pointer", textAlign: "left" }}
          onClick={() => setAdvancedOpen((open) => !open)}
        >
          {advancedOpen ? "Hide advanced MIME settings" : "Show advanced MIME settings"}
        </button>
        {advancedOpen && (
          <>
            <label className={labelClass} style={{ display: "block", marginTop: 8 }}>
              Accepted MIME types (optional)
            </label>
            <input
              className={inputClass}
              placeholder="application/pdf, image/jpeg"
              value={loaded.acceptMimeTypes.join(", ")}
              onChange={(event) =>
                applyPatch({
                  acceptMimeTypes: event.target.value
                    .split(",")
                    .map((value) => value.trim())
                    .filter(Boolean),
                })
              }
            />
            <p style={helpTextStyle}>
              Optional advanced hint for mobile clients. Prefer extension rules for new
              configurations. Not enforced by the backend at submit today.
            </p>
          </>
        )}
      </div>

      <p style={infoTextStyle}>
        Mobile uploads files to cloud storage first, then submits URL string(s). The backend
        validates file shape, count, allowed extensions, and project URL path on submit.
      </p>
    </>
  );
}
