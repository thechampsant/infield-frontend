"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/project-admin/shared/modal";
import { UDFFormFields } from "@/components/project-admin/udf/udf-form-fields";
import { storeService, type StoreRecord } from "@/lib/api/store-service";
import { formatApiError } from "@/lib/api";
import type { UDFField, UDFValue } from "@/types/project-admin";

interface EditStoreModalProps {
  store: StoreRecord;
  open: boolean;
  onClose: () => void;
  udfFields: UDFField[];
  projectId: string;
  onSuccess: () => void;
}

export function EditStoreModal({
  store,
  open,
  onClose,
  udfFields,
  projectId,
  onSuccess,
}: EditStoreModalProps) {
  const [form, setForm] = useState({
    storeCode: store.storeCode,
    storeName: store.storeName,
    latitude: String(store.latitude),
    longitude: String(store.longitude),
  });
  const [udfValues, setUdfValues] = useState<Record<string, UDFValue>>(store.udfs);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Re-populate form when a different store is opened
  useEffect(() => {
    if (open) {
      setForm({
        storeCode: store.storeCode,
        storeName: store.storeName,
        latitude: String(store.latitude),
        longitude: String(store.longitude),
      });
      setUdfValues(store.udfs);
      setErrors([]);
      setSubmitError(null);
    }
  }, [open, store]);

  const field = (name: keyof typeof form) => ({
    value: form[name],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((p) => ({ ...p, [name]: e.target.value })),
    className: `form-input${errors.includes(name) ? " err" : ""}`,
  });

  const handleSubmit = async () => {
    const errs: string[] = [];
    if (!form.storeName.trim()) errs.push("storeName");
    if (form.latitude.trim() && isNaN(Number(form.latitude))) errs.push("latitude");
    if (form.longitude.trim() && isNaN(Number(form.longitude))) errs.push("longitude");

    if (errs.length > 0) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      await storeService.update(store.backendId, {
        storeCode: form.storeCode.trim() || undefined,
        storeName: form.storeName.trim() || undefined,
        latitude: form.latitude.trim() ? Number(form.latitude) : undefined,
        longitude: form.longitude.trim() ? Number(form.longitude) : undefined,
        udfs: udfValues as Record<string, string | string[]>,
      });
      onSuccess();
    } catch (e) {
      setSubmitError(formatApiError(e, "Failed to update store"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Store"
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
            {submitting ? "Saving…" : "Save Changes"}
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
          <label className="form-label">Store Code</label>
          <input {...field("storeCode")} placeholder="STR-001" />
        </div>

        <div className="form-group">
          <label className="form-label">
            Store Name <span className="req">*</span>
          </label>
          <input {...field("storeName")} />
        </div>

        <div className="form-group">
          <label className="form-label">Latitude</label>
          <input {...field("latitude")} type="number" step="any" />
        </div>

        <div className="form-group">
          <label className="form-label">Longitude</label>
          <input {...field("longitude")} type="number" step="any" />
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
