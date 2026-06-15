"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/project-admin/shared/modal";
import { UDFFormFields } from "@/components/project-admin/udf/udf-form-fields";
import { designationService } from "@/lib/api/designation-service";
import {
  getRuntimeStaticField,
  projectUsersService,
} from "@/lib/api/project-users-service";
import type {
  UDFField,
  UDFValue,
  UserStaticField,
} from "@/types/project-admin";

interface AddUserModalProps {
  open: boolean;
  onClose: () => void;
  udfFields: UDFField[];
  staticFields: UserStaticField[];
  projectId: string;
  onSuccess: () => void;
}

export function AddUserModal({
  open,
  onClose,
  udfFields,
  staticFields,
  projectId,
  onSuccess,
}: AddUserModalProps) {
  const [form, setForm] = useState({
    id: "",
    firstName: "",
    lastName: "",
    mobile: "",
    email: "",
    designation: "",
    doj: "",
  });
  const [designations, setDesignations] = useState<
    { id: string; name: string }[]
  >([]);
  const [udfValues, setUdfValues] = useState<Record<string, UDFValue>>({});
  const [reportees, setReportees] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const reporteesField = useMemo(
    () => getRuntimeStaticField(staticFields, "reportees"),
    [staticFields],
  );

  useEffect(() => {
    if (!open || !projectId) return;
    designationService
      .listByProject(projectId)
      .then((list) =>
        setDesignations(list.map((d) => ({ id: d.id, name: d.name }))),
      )
      .catch(() => setDesignations([]));
  }, [open, projectId]);

  useEffect(() => {
    if (!open) {
      setForm({
        id: "",
        firstName: "",
        lastName: "",
        mobile: "",
        email: "",
        designation: "",
        doj: "",
      });
      setUdfValues({});
      setReportees([]);
      setErrors([]);
      setSubmitError(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    const errs: string[] = [];
    if (!form.id) errs.push("id");
    if (!form.firstName) errs.push("firstName");
    if (!form.lastName) errs.push("lastName");
    if (!form.mobile) errs.push("mobile");
    if (!form.email) errs.push("email");
    if (!form.designation) errs.push("designation");
    if (reporteesField?.mandatory && reportees.length === 0) {
      errs.push(String(reporteesField.id));
    }
    udfFields.forEach((f) => {
      const value = udfValues[f.fieldKey];
      const missing =
        value == null ||
        value === "" ||
        (Array.isArray(value) && value.length === 0);
      if (f.mandatory && missing) errs.push(`udf_${f.id}`);
    });
    if (errs.length) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      await projectUsersService.create({
        projectId,
        employeeId: form.id,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phoneNumber: form.mobile,
        designationId: form.designation,
        ...(reporteesField ? { reportees } : {}),
        dateOfJoining: form.doj || undefined,
        udfs: udfValues,
      });
      onSuccess();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Failed to create user");
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
      title="Add New User"
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
            {submitting ? "Creating…" : "Create User"}
          </button>
        </>
      }
    >
      <div className="pa-info-banner">
        A temporary password will be sent to the user&apos;s email address.
      </div>

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
            Login ID <span className="req">*</span>
          </label>
          <input {...field("id")} placeholder="EMP005000" />
        </div>
        <div className="form-group">
          <label className="form-label">
            First Name <span className="req">*</span>
          </label>
          <input {...field("firstName")} placeholder="First name" />
        </div>
        <div className="form-group">
          <label className="form-label">
            Last Name <span className="req">*</span>
          </label>
          <input {...field("lastName")} placeholder="Last name" />
        </div>
        <div className="form-group">
          <label className="form-label">
            Mobile <span className="req">*</span>
          </label>
          <input {...field("mobile")} placeholder="+91 98765 43210" />
        </div>
        <div className="form-group">
          <label className="form-label">
            Email <span className="req">*</span>
          </label>
          <input {...field("email")} type="email" placeholder="user@email.com" />
        </div>
        <div className="form-group">
          <label className="form-label">
            Designation <span className="req">*</span>
          </label>
          <select {...field("designation")}>
            <option value="">Select</option>
            {designations.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Date of Joining</label>
          <input type="date" {...field("doj")} />
        </div>
      </div>

      {reporteesField && (
        <UDFFormFields
          fields={[reporteesField]}
          values={{ reportees }}
          onChange={(values) =>
            setReportees(
              Array.isArray(values.reportees)
                ? values.reportees.map(String)
                : [],
            )
          }
          errors={errors}
          projectId={projectId}
          prefix=""
        />
      )}

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
