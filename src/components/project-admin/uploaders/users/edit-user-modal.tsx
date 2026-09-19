"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/project-admin/shared/modal";
import { UDFFormFields } from "@/components/project-admin/udf/udf-form-fields";
import { ConfirmManagerChangeModal } from "@/components/project-admin/uploaders/users/confirm-manager-change-modal";
import { UserManagerPicker } from "@/components/project-admin/uploaders/users/user-manager-picker";
import { designationService, type Designation } from "@/lib/api/designation-service";
import {
  getRuntimeStaticField,
  projectUsersService,
} from "@/lib/api/project-users-service";
import {
  userReporteeMappingService,
  type DirectManagerDisplay,
} from "@/lib/api/user-reportee-mapping-service";
import { formatUserNameWithCode } from "@/lib/project-admin/user-display";
import { validateUserShiftTimes } from "@/lib/project-admin/user-shift-times";
import type {
  UDFField,
  UDFValue,
  ProjectUser,
  UserStaticField,
} from "@/types/project-admin";

export function EditUserModal({
  user,
  backendUserId,
  open,
  onClose,
  udfFields,
  staticFields,
  projectId,
  onSuccess,
}: {
  user: ProjectUser;
  backendUserId: string;
  open: boolean;
  onClose: () => void;
  udfFields: UDFField[];
  staticFields: UserStaticField[];
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
    doj: user.doj,
  });
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [udfValues, setUdfValues] = useState<Record<string, UDFValue>>(user.udfs);
  const [reportees, setReportees] = useState<string[]>(user.reporteeIds);
  const [managerId, setManagerId] = useState("");
  const [managerLabel, setManagerLabel] = useState("");
  const [initialManagerId, setInitialManagerId] = useState("");
  const [currentManager, setCurrentManager] = useState<DirectManagerDisplay | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
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
      .then((list) => {
        setDesignations(list);
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
        doj: user.doj,
      });
      setUdfValues(user.udfs);
      setReportees(user.reporteeIds);
      setManagerId("");
      setManagerLabel("");
      setInitialManagerId("");
      setCurrentManager(null);
      setConfirmOpen(false);
      setErrors([]);
      setSubmitError(null);
    }
  }, [open, user]);

  useEffect(() => {
    if (!open || !projectId || !backendUserId) return;
    let cancelled = false;
    userReporteeMappingService
      .getManager(projectId, backendUserId)
      .then((manager) => {
        if (cancelled) return;
        const nextId = manager?.userId ?? "";
        setManagerId(nextId);
        setInitialManagerId(nextId);
        setCurrentManager(manager);
        setManagerLabel(
          manager
            ? formatUserNameWithCode(manager.name, manager.employeeId)
            : "",
        );
      })
      .catch(() => {
        if (cancelled) return;
        setManagerId("");
        setInitialManagerId("");
        setCurrentManager(null);
        setManagerLabel("");
      });
    return () => {
      cancelled = true;
    };
  }, [open, projectId, backendUserId]);

  const persistUser = async () => {
    await projectUsersService.update(backendUserId, {
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phoneNumber: form.mobile,
      designationId: form.designation || undefined,
      doj: form.doj || undefined,
      ...(reporteesField ? { reportees } : {}),
      udfs: udfValues,
    });
    if (managerId !== initialManagerId) {
      await userReporteeMappingService.assignManager(
        projectId,
        backendUserId,
        managerId || null,
      );
    }
    onSuccess();
  };

  const handleSubmit = async () => {
    const errs: string[] = [];
    setSubmitError(null);
    if (!form.firstName) errs.push("firstName");
    if (!form.lastName) errs.push("lastName");
    if (!form.mobile) errs.push("mobile");
    if (!form.email) errs.push("email");
    if (reporteesField?.mandatory && reportees.length === 0) {
      errs.push(String(reporteesField.id));
    }
    const shiftValidation = validateUserShiftTimes(udfFields, udfValues);
    if (shiftValidation) {
      errs.push(...shiftValidation.errorKeys);
      setSubmitError(shiftValidation.message);
    }
    if (errs.length) {
      setErrors(errs);
      return;
    }

    const managerChanged = managerId !== initialManagerId;
    if (managerChanged && initialManagerId) {
      setConfirmOpen(true);
      return;
    }

    setSubmitting(true);
    try {
      await persistUser();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Failed to update user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmManagerChange = async () => {
    setSubmitting(true);
    try {
      await persistUser();
      setConfirmOpen(false);
    } catch (e) {
      setConfirmOpen(false);
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
    <>
      <Modal
        open={open}
        onClose={confirmOpen ? () => undefined : onClose}
        title="Edit User"
        width={560}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={confirmOpen}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={submitting || confirmOpen}
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
            excludedOptionValues={[backendUserId]}
          />
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          <UserManagerPicker
            projectId={projectId}
            value={managerId}
            onChange={(id, label) => {
              setManagerId(id);
              setManagerLabel(label ?? "");
            }}
            selfId={backendUserId}
            reporteeIds={reportees}
            formDesignationId={form.designation}
            designations={designations}
            selectedLabel={managerLabel}
          />
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

      <ConfirmManagerChangeModal
        open={confirmOpen}
        kind={managerId ? "reassign" : "unassign"}
        userName={user.name}
        userCode={user.id}
        currentManager={currentManager}
        nextManagerLabel={managerLabel}
        submitting={submitting}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmManagerChange}
      />
    </>
  );
}
