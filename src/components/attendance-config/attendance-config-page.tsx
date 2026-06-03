"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  attendanceConfigService,
  docToForm,
  type AttendanceConfigForm,
} from "@/lib/api/attendance-config";
import { formatApiError } from "@/lib/api";
import { If2Toast, type ToastState } from "@/components/accounts/if2-toast";
import { AttendanceConfigEdit } from "./attendance-config-edit";

interface Props {
  projectId: string;
  projectName: string;
}

export function AttendanceConfigPage({ projectId, projectName }: Props) {
  const [form, setForm] = useState<AttendanceConfigForm | null>(null);
  const [saved, setSaved] = useState<AttendanceConfigForm | null>(null);
  const [exists, setExists] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const doc = await attendanceConfigService.get(projectId);
      const next = docToForm(doc);
      setForm(next);
      setSaved(next);
      setExists(Boolean(doc));
    } catch (err) {
      setLoadError(formatApiError(err, "Failed to load attendance configuration"));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const dirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(saved),
    [form, saved],
  );

  const handleChange = useCallback(
    <K extends keyof AttendanceConfigForm>(key: K, value: AttendanceConfigForm[K]) => {
      setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
      setErrors((prev) => {
        if (Object.keys(prev).length === 0) return prev;
        return {};
      });
    },
    [],
  );

  const handleDiscard = useCallback(() => {
    setForm(saved);
    setErrors({});
  }, [saved]);

  const handleSave = useCallback(async () => {
    if (!form) return;
    const validation = validate(form);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      setToast({ message: "Please fix the highlighted fields", type: "error" });
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      if (exists) {
        await attendanceConfigService.update(projectId, form);
      } else {
        await attendanceConfigService.create(projectId, form);
        setExists(true);
      }

      if (form.isModuleEnabled) {
        try {
          await attendanceConfigService.activate(projectId);
        } catch (activateErr) {
          setSaved(form);
          setToast({
            message: formatApiError(
              activateErr,
              "Saved, but the module could not be activated",
            ),
            type: "error",
          });
          return;
        }
      }

      setSaved(form);
      setToast({ message: "Attendance configuration saved", type: "success" });
    } catch (err) {
      setToast({ message: formatApiError(err, "Failed to save"), type: "error" });
    } finally {
      setSaving(false);
    }
  }, [form, exists, projectId]);

  if (loading) {
    return (
      <div className="att-config-page">
        <div className="edit-skeleton">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton-section" />
          ))}
        </div>
      </div>
    );
  }

  if (loadError || !form) {
    return (
      <div className="att-config-page">
        <div className="config-load-error">
          <p>{loadError ?? "Configuration unavailable."}</p>
          <button className="btn btn-secondary btn-sm" onClick={load}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <AttendanceConfigEdit
        projectName={projectName}
        form={form}
        errors={errors}
        dirty={dirty}
        saving={saving}
        onChange={handleChange}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />
      <If2Toast toast={toast} onDismiss={() => setToast(null)} />
    </>
  );
}

function validate(form: AttendanceConfigForm): Record<string, string> {
  const errors: Record<string, string> = {};

  if (form.types.some((t) => t.geoFenced)) {
    if (form.geoFenceRadius < 10 || form.geoFenceRadius > 5000) {
      errors.geoFenceRadius = "Radius must be between 10 and 5000 metres.";
    }
  }

  if (form.workingHoursEnabled) {
    if (form.presentThresholdHrs <= 0 || form.presentThresholdHrs > 24) {
      errors.presentThresholdHrs = "Present hours must be between 0 and 24.";
    }
    if (form.absentThresholdHrs <= 0 || form.absentThresholdHrs > 24) {
      errors.absentThresholdHrs = "Absent hours must be between 0 and 24.";
    }
    if (
      form.halfDayMinHrs <= 0 ||
      form.halfDayMaxHrs > 24 ||
      form.halfDayMinHrs >= form.halfDayMaxHrs
    ) {
      errors.halfDay = "Half-day range must be valid (min < max, within 0\u201324).";
    }
  }

  if (form.regularizationEnabled) {
    if (form.regWindowType === "Days") {
      if (form.regTminusDays < 1 || form.regTminusDays > 90) {
        errors.regTminusDays = "Days must be between 1 and 90.";
      }
    } else {
      if (
        form.regDateFrom < 1 ||
        form.regDateFrom > 31 ||
        form.regDateTo < 1 ||
        form.regDateTo > 31
      ) {
        errors.regDateRange = "Day of month must be between 1 and 31.";
      }
    }

    if (form.regMaxRequestsEnabled && form.regMaxRequestCount < 1) {
      errors.regMaxRequestCount = "Max requests must be at least 1.";
    }

    if (
      form.regApprovalEnabled &&
      form.approvalLevels.filter((a) => a.role.trim()).length === 0
    ) {
      errors.approvalLevels = "Add at least one approval level.";
    }

    if (form.autoRejectEnabled && !form.autoRejectRules.trim()) {
      errors.autoRejectRules = "Describe the auto-reject rule.";
    }
  }

  return errors;
}
