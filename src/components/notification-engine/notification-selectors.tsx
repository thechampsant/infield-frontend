"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";
import type { Designation } from "@/lib/api/designation-service";
import type { Campaign } from "@/lib/api/notification-engine-service";

export const notificationDesignationCode = (designation: Designation) =>
  (designation.externalCode?.trim() || designation.name).trim().toUpperCase();

export function NotificationDesignationPicker({
  options,
  selected,
  onChange,
  disabled,
  invalid,
}: {
  options: Designation[];
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled: boolean;
  invalid: boolean;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  useEffect(() => {
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  function remove(id: string) {
    onChange(selected.filter((value) => value !== id));
  }
  return (
    <div
      ref={root}
      className="ne-multiselect"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setOpen(false);
          toggle.current?.focus();
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setOpen(false);
      }}
    >
      <div
        className={`ne-select-control ${open && !disabled ? "open" : ""} ${invalid ? "invalid" : ""}`}
      >
        <div className="ne-chips">
          {selected.map((id) => {
            const option = options.find((item) => item.id === id);
            const code = option
              ? notificationDesignationCode(option)
              : "Unknown";
            return (
              <span key={id} className={`ne-tag ne-${code.toLowerCase()}`}>
                {code}
                <button
                  type="button"
                  disabled={disabled}
                  aria-label={`Remove ${code}`}
                  onClick={() => remove(id)}
                >
                  <X size={12} />
                </button>
              </span>
            );
          })}
        </div>
        <button
          ref={toggle}
          id="ne-designation-control"
          className="ne-select-toggle"
          type="button"
          disabled={disabled}
          aria-labelledby="ne-designation-label"
          aria-expanded={open && !disabled}
          aria-controls={panelId}
          aria-describedby={invalid ? "ne-designationIds-error" : undefined}
          onClick={() => setOpen((value) => !value)}
        >
          {!selected.length && (
            <span className="ne-placeholder">Select designations…</span>
          )}
          <ChevronDown size={16} />
        </button>
      </div>
      {open && !disabled && (
        <div
          id={panelId}
          className="ne-options"
          role="group"
          aria-labelledby="ne-designation-label"
        >
          {options.map((option) => {
            const code = notificationDesignationCode(option);
            return (
              <label
                key={option.id}
                className={selected.includes(option.id) ? "selected" : ""}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(option.id)}
                  onChange={(event) =>
                    event.target.checked
                      ? onChange([...selected, option.id])
                      : remove(option.id)
                  }
                />
                <span>
                  {code}
                  {option.name.toUpperCase() !== code
                    ? ` — ${option.name}`
                    : ""}
                </span>
              </label>
            );
          })}
          {!options.length && (
            <p>No designations are configured for this project.</p>
          )}
        </div>
      )}
    </div>
  );
}

export function NotificationActionMenu({
  campaign,
  disabled,
  busy,
  onChoose,
}: {
  campaign: Campaign;
  disabled: boolean;
  busy: boolean;
  onChoose: (action: "pause" | "resume" | "delete") => void;
}) {
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    checkedAt: number;
  } | null>(null);
  const anchor = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const open = !!position && !disabled;
  useEffect(() => {
    if (!open) return;
    panel.current
      ?.querySelector<HTMLButtonElement>("button:not(:disabled)")
      ?.focus();
    function outside(event: PointerEvent) {
      const target = event.target as Node;
      if (!panel.current?.contains(target) && !anchor.current?.contains(target))
        setPosition(null);
    }
    function closeOnMove() {
      setPosition(null);
    }
    document.addEventListener("pointerdown", outside);
    window.addEventListener("scroll", closeOnMove, true);
    window.addEventListener("resize", closeOnMove);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("scroll", closeOnMove, true);
      window.removeEventListener("resize", closeOnMove);
    };
  }, [open]);
  function show() {
    if (open) {
      setPosition(null);
      return;
    }
    const rect = anchor.current!.getBoundingClientRect();
    setPosition({
      checkedAt: Date.now(),
      top: Math.max(
        8,
        rect.bottom + 140 > window.innerHeight
          ? rect.top - 136
          : rect.bottom + 4,
      ),
      left: Math.max(8, Math.min(rect.right - 170, window.innerWidth - 178)),
    });
  }
  const expired =
    campaign.isExpired ||
    (!!campaign.endsAt &&
      Date.parse(campaign.endsAt) <= (position?.checkedAt ?? 0));
  return (
    <>
      <button
        ref={anchor}
        type="button"
        className="ne-btn ne-action"
        aria-label={`Action for ${campaign.title}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={disabled}
        onClick={show}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            show();
          }
        }}
      >
        {busy ? "Updating…" : "Select Action"}
        <ChevronDown size={13} />
      </button>
      {open &&
        createPortal(
          <div
            ref={panel}
            id={menuId}
            className="ne-action-menu"
            role="menu"
            aria-label={`Actions for ${campaign.title}`}
            style={{ top: position.top, left: position.left }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                setPosition(null);
                anchor.current?.focus();
              }
              if (event.key === "Tab") {
                setPosition(null);
                anchor.current?.focus();
              }
              if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
                event.preventDefault();
                const buttons = Array.from(
                  event.currentTarget.querySelectorAll<HTMLButtonElement>(
                    "button:not(:disabled)",
                  ),
                );
                const current = buttons.indexOf(
                  document.activeElement as HTMLButtonElement,
                );
                const next =
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? buttons.length - 1
                      : (current +
                          (event.key === "ArrowUp" ? -1 : 1) +
                          buttons.length) %
                        buttons.length;
                buttons[next]?.focus();
              }
            }}
          >
            {(["pause", "resume", "delete"] as const).map((action) => (
              <button
                key={action}
                type="button"
                role="menuitem"
                className={action === "delete" ? "danger" : ""}
                disabled={
                  action === "pause"
                    ? campaign.status !== "ACTIVE"
                    : action === "resume"
                      ? campaign.status !== "INACTIVE" || expired
                      : false
                }
                onClick={() => {
                  setPosition(null);
                  anchor.current?.focus();
                  onChoose(action);
                }}
              >
                <span className={`ne-action-dot ${action}`} />
                {action === "pause"
                  ? "Pause"
                  : action === "resume"
                    ? `Resume${expired ? " (expired)" : ""}`
                    : "Delete"}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
