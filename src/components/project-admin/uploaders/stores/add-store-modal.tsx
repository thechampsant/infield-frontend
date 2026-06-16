"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/project-admin/shared/modal";
import { UDFFormFields } from "@/components/project-admin/udf/udf-form-fields";
import { storeService } from "@/lib/api/store-service";
import { formatApiError } from "@/lib/api";
import type { UDFField, UDFValue } from "@/types/project-admin";

interface AddStoreModalProps {
  open: boolean;
  onClose: () => void;
  udfFields: UDFField[];
  projectId: string;
  onSuccess: () => void;
}

const EMPTY_FORM = {
  storeCode: "",
  storeName: "",
  latitude: "",
  longitude: "",
};

export function AddStoreModal({
  open,
  onClose,
  udfFields,
  projectId,
  onSuccess,
}: AddStoreModalProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [udfValues, setUdfValues] = useState<Record<string, UDFValue>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!open) {
      setForm(EMPTY_FORM);
      setUdfValues({});
      setErrors([]);
      setSubmitError(null);
    }
  }, [open]);

  const field = (name: keyof typeof form) => ({
    value: form[name],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((p) => ({ ...p, [name]: e.target.value })),
    className: `form-input${errors.includes(name) ? " err" : ""}`,
  });

  const handleSubmit = async () => {
    const errs: string[] = [];
    if (!form.storeCode.trim()) errs.push("storeCode");
    if (!form.storeName.trim()) errs.push("storeName");
    if (!form.latitude.trim() || isNaN(Number(form.latitude))) errs.push("latitude");
    if (!form.longitude.trim() || isNaN(Number(form.longitude))) errs.push("longitude");

    udfFields.forEach((f) => {
      const value = udfValues[f.fieldKey];
      const missing =
        value == null ||
        value === "" ||
        (Array.isArray(value) && value.length === 0);
      if (f.mandatory && missing) errs.push(`udf_${f.id}`);
    });

    if (errs.length > 0) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      await storeService.create({
        projectId,
        storeCode: form.storeCode.trim(),
        storeName: form.storeName.trim(),
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        udfs: udfValues as Record<string, string | string[]>,
      });
      onSuccess();
    } catch (e) {
      setSubmitError(formatApiError(e, "Failed to create store"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add New Store"
      width={560}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Creating…" : "Create Store"}
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
        }}
      >
        <div className="form-group">
          <label className="form-label">
            Store Code <span className="req">*</span>
          </label>
          <input {...field("storeCode")} placeholder="STR-001" />
          <div className="form-hint">Unique code within this project</div>
        </div>

        <div className="form-group">
          <label className="form-label">
            Store Name <span className="req">*</span>
          </label>
          <input {...field("storeName")} placeholder="Andheri West Store" />
        </div>

        <div className="form-group">
          <label className="form-label">
            Latitude <span className="req">*</span>
          </label>
          <input
            {...field("latitude")}
            type="number"
            step="any"
            placeholder="19.1197"
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            Longitude <span className="req">*</span>
          </label>
          <input
            {...field("longitude")}
            type="number"
            step="any"
            placeholder="72.8468"
          />
        </div>
      </div>

      {udfFields.length > 0 && (
        <>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              margin: "20px 0 12px",
              paddingTop: 16,
              borderTop: "1px solid var(--border)",
            }}
          >
            Store Defined Fields
          </div>
          <UDFFormFields
            fields={udfFields}
            values={udfValues}
            onChange={setUdfValues}
            errors={errors}
            projectId={projectId}
            prefix="udf_"
          />
        </>
      )}
    </Modal>
  );
}
