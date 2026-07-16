"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/project-admin/shared/modal";
import { UDFFormFields } from "@/components/project-admin/udf/udf-form-fields";
import { productService } from "@/lib/api/product-service";
import { formatApiError } from "@/lib/api";
import type { UDFField, UDFValue } from "@/types/project-admin";

interface AddProductModalProps {
  open: boolean;
  onClose: () => void;
  udfFields: UDFField[];
  projectId: string;
  onSuccess: () => void;
}

const EMPTY_FORM = {
  productCode: "",
  productName: "",
  category: "",
  isFocusProduct: false,
};

export function AddProductModal({
  open,
  onClose,
  udfFields,
  projectId,
  onSuccess,
}: AddProductModalProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [udfValues, setUdfValues] = useState<Record<string, UDFValue>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_FORM);
      setUdfValues({});
      setErrors([]);
      setSubmitError(null);
    }
  }, [open]);

  const field = (name: "productCode" | "productName" | "category") => ({
    value: form[name],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((p) => ({ ...p, [name]: e.target.value })),
    className: `form-input${errors.includes(name) ? " err" : ""}`,
  });

  const handleSubmit = async () => {
    const errs: string[] = [];
    if (!form.productCode.trim()) errs.push("productCode");
    if (!form.productName.trim()) errs.push("productName");
    if (!form.category.trim()) errs.push("category");

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
      await productService.create({
        projectId,
        productCode: form.productCode.trim(),
        productName: form.productName.trim(),
        category: form.category.trim(),
        isFocusProduct: form.isFocusProduct,
        udfs: udfValues as Record<string, string | string[]>,
      });
      onSuccess();
    } catch (e) {
      setSubmitError(formatApiError(e, "Failed to create product"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add New Product"
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
            {submitting ? "Creating..." : "Create Product"}
          </button>
        </>
      }
    >
      {submitError && (
        <div className="pa-info-banner" style={{ color: "var(--red)", background: "var(--red-light)", borderColor: "var(--red-mid)", marginBottom: 16 }}>
          {submitError}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="form-group">
          <label className="form-label">
            Product Code <span className="req">*</span>
          </label>
          <input {...field("productCode")} placeholder="PROD-001" />
          <div className="form-hint">Unique active code within this project</div>
        </div>

        <div className="form-group">
          <label className="form-label">
            Product Name <span className="req">*</span>
          </label>
          <input {...field("productName")} placeholder="Premium Mixer 750W" />
        </div>

        <div className="form-group">
          <label className="form-label">
            Category <span className="req">*</span>
          </label>
          <input {...field("category")} placeholder="Mixer" />
        </div>

        <div className="form-group">
          <label className="form-label">Focus Product</label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 40, fontSize: 12, color: "var(--text-mid)" }}>
            <input
              type="checkbox"
              checked={form.isFocusProduct}
              onChange={(e) => setForm((p) => ({ ...p, isFocusProduct: e.target.checked }))}
            />
            Yes
          </label>
        </div>
      </div>

      {udfFields.length > 0 && (
        <>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--text-muted)", margin: "20px 0 12px", paddingTop: 16, borderTop: "1px solid var(--border)" }}>
            Product Defined Fields
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
