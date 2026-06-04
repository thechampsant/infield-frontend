"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/project-admin/shared/modal";
import { UDFFormFields } from "@/components/project-admin/udf/udf-form-fields";
import { designationService } from "@/lib/api/designation-service";
import { projectUsersService } from "@/lib/api/project-users-service";
import type { UDFField, UDFValue, User } from "@/types/project-admin";

export function EditUserModal({
  user,
  backendUserId,
  open,
  onClose,
  udfFields,
  projectId,
  onSuccess,
}: {
  user: User;
  backendUserId: string;
  open: boolean;
  onClose: () => void;
  udfFields: UDFField[];
  projectId: string;
  onSuccess: () => void;
}) {
  const parts = user.name.split(" ");
  const [form, setForm] = useState({
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" ") ?? "",
    mobile: user.mobile,
    email: user.email,
    designation: "",
  });
  const [designations, setDesignations] = useState<
    { id: string; name: string }[]
  >([]);
  const [udfValues, setUdfValues] = useState<Record<string, UDFValue>>(user.udfs);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !projectId) return;
    designationService
      .listByProject(projectId)
      .then((list) => {
        setDesignations(list.map((d) => ({ id: d.id, name: d.name })));
        const match = list.find((d) => d.name === user.designation);
        if (match) {
          setForm((f) => ({ ...f, designation: match.id }));
        }
      })
      .catch(() => setDesignations([]));
  }, [open, projectId, user.designation]);

  useEffect(() => {
    if (open) {
      const nameParts = user.name.split(" ");
      setForm({
        firstName: nameParts[0] ?? "",
        lastName: nameParts.slice(1).join(" ") ?? "",
        mobile: user.mobile,
        email: user.email,
        designation: "",
      });
      setUdfValues(user.udfs);
      setErrors([]);
      setSubmitError(null);
    }
  }, [open, user]);

  const handleSubmit = async () => {
    const errs: string[] = [];
    if (!form.firstName) errs.push("firstName");
    if (!form.lastName) errs.push("lastName");
    if (!form.mobile) errs.push("mobile");
    if (!form.email) errs.push("email");
    if (errs.length) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      await projectUsersService.update(backendUserId, {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phoneNumber: form.mobile,
        designationId: form.designation || undefined,
        udfs: udfValues,
      });
      onSuccess();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Failed to update user");
    } finally {
      setSubmitting(false);
    }
  };

  const field = (name: keyof typeof form) => ({
    value: form[name],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [name]: e.target.value })),
    className: `form-input${errors.includes(name) ? " err" : ""}`,
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit User"
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
          <label className="form-label">Login ID</label>
          <input className="form-input" value={user.id} disabled />
        </div>
        <div className="form-group">
          <label className="form-label">
            First Name <span className="req">*</span>
          </label>
          <input {...field("firstName")} />
        </div>
        <div className="form-group">
          <label className="form-label">
            Last Name <span className="req">*</span>
          </label>
          <input {...field("lastName")} />
        </div>
        <div className="form-group">
          <label className="form-label">
            Mobile <span className="req">*</span>
          </label>
          <input {...field("mobile")} />
        </div>
        <div className="form-group">
          <label className="form-label">
            Email <span className="req">*</span>
          </label>
          <input {...field("email")} type="email" />
        </div>
        <div className="form-group">
          <label className="form-label">Designation</label>
          <select {...field("designation")}>
            <option value="">Select</option>
            {designations.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
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
            User Defined Fields
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
