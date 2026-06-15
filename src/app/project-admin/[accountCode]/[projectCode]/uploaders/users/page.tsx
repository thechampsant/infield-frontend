"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatApiError } from "@/lib/api";
import { designationService } from "@/lib/api/designation-service";
import { projectUsersService } from "@/lib/api/project-users-service";
import { useProjectContext } from "@/lib/project-admin/project-context";
import { DesignationsRequiredBanner } from "@/components/project-admin/uploaders/designations-required-banner";
import { UserTable } from "@/components/project-admin/uploaders/users/user-table";
import { AddUserModal } from "@/components/project-admin/uploaders/users/add-user-modal";
import { UDFConfigModal } from "@/components/project-admin/udf/udf-config-modal";
import type {
  ProjectUser,
  UDFField,
  UserStaticFields,
} from "@/types/project-admin";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function UsersMasterPage() {
  const { projectId, accountCode, projectCode } = useProjectContext();
  const [addOpen, setAddOpen] = useState(false);
  const [udfOpen, setUdfOpen] = useState(false);
  const [users, setUsers] = useState<ProjectUser[]>([]);
  const [udfFields, setUdfFields] = useState<UDFField[]>([]);
  const [staticFields, setStaticFields] = useState<UserStaticFields>({
    create: [],
    update: [],
  });
  const [designationCount, setDesignationCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<{
    total: number;
    successCount: number;
    invalidCount: number;
    errors: { row?: string | number; data?: unknown; errors: string[] }[];
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const [userList, formConfig, designations] = await Promise.all([
        projectUsersService.listByProject(projectId),
        projectUsersService.getFormFieldsConfig(projectId),
        designationService.listByProject(projectId).catch(() => []),
      ]);
      setUsers(userList);
      if (formConfig) {
        setUdfFields(formConfig.runtimeUdfFields);
        setStaticFields(formConfig.runtimeStaticFields);
      } else {
        setUdfFields(await projectUsersService.getFormFields(projectId));
        setStaticFields({ create: [], update: [] });
      }
      setDesignationCount(designations.length);
    } catch (err) {
      setError(formatApiError(err, "Failed to load users"));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleTemplate = async () => {
    if (!projectId) return;
    try {
      const blob = await projectUsersService.downloadTemplate(projectId);
      downloadBlob(blob, "User_Bulk_Upload_Template.xlsx");
    } catch {
      setError("Template download failed. Please try again.");
    }
  };

  const handleExport = async () => {
    if (!projectId) return;
    try {
      const blob = await projectUsersService.exportUsers(projectId);
      downloadBlob(blob, "Users_Export.xlsx");
    } catch {
      setError("Export failed. Please try again.");
    }
  };

  const handleBulkUpload = async (file: File) => {
    if (!projectId) return;
    setUploading(true);
    setError(null);
    setUploadResult(null);
    try {
      const result = await projectUsersService.bulkUpload(projectId, file);
      setUploadResult(result);
      if (result.successCount > 0) {
        load(); // Refresh the user list
      }
      if (result.invalidCount > 0) {
        setError(
          `Upload completed: ${result.successCount} users added, ${result.invalidCount} rows had errors.`,
        );
      }
    } catch (err) {
      setError(formatApiError(err, "Bulk upload failed"));
    } finally {
      setUploading(false);
      // Reset file input so same file can be re-uploaded if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (!validTypes.includes(file.type) && !file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      setError("Please upload an Excel file (.xlsx or .xls)");
      return;
    }
    handleBulkUpload(file);
  };

  return (
    <>
      <div className="pa-page-header">
        <div>
          <div className="pa-page-title">Users Master</div>
          <div className="pa-page-desc">
            Manage field team users — add individually or bulk upload with UDF
            support
          </div>
        </div>
        <div className="pa-actions">
          <button type="button" className="btn btn-secondary" onClick={handleTemplate}>
            ↓ Template
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? "Uploading..." : "↑ Bulk Upload"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: "none" }}
            onChange={handleFileChange}
            aria-label="Upload Excel file for bulk user import"
          />
          <button type="button" className="btn btn-secondary" onClick={handleExport}>
            ↓ Export
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setAddOpen(true)}>
            + Add User
          </button>
        </div>
      </div>

      {designationCount === 0 && (
        <DesignationsRequiredBanner
          accountCode={accountCode}
          projectCode={projectCode}
        />
      )}

      {error && (
        <div
          className="pa-info-banner"
          style={{
            color: "var(--red)",
            background: "var(--red-light)",
            borderColor: "var(--red-mid)",
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {uploadResult && uploadResult.successCount > 0 && !error && (
        <div
          className="pa-info-banner"
          style={{
            color: "var(--green, #16a34a)",
            background: "var(--green-light, #f0fdf4)",
            borderColor: "var(--green-mid, #86efac)",
            marginBottom: 16,
          }}
        >
          Successfully imported {uploadResult.successCount} of {uploadResult.total} users.
        </div>
      )}

      {uploadResult && uploadResult.errors.length > 0 && (
        <div
          className="pa-info-banner"
          style={{
            color: "var(--orange, #d97706)",
            background: "var(--orange-light, #fffbeb)",
            borderColor: "var(--orange-mid, #fcd34d)",
            marginBottom: 16,
            maxHeight: 200,
            overflow: "auto",
          }}
        >
          <strong>Upload Errors ({uploadResult.errors.length} rows):</strong>
          <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            {uploadResult.errors.slice(0, 10).map((err, i) => (
              <li key={i}>
                Row {err.row ?? i + 1}: {err.errors.join(", ")}
              </li>
            ))}
            {uploadResult.errors.length > 10 && (
              <li>...and {uploadResult.errors.length - 10} more errors</li>
            )}
          </ul>
        </div>
      )}

      <UserTable
        users={users}
        udfFields={udfFields}
        updateStaticFields={staticFields.update}
        loading={loading}
        projectId={projectId}
        onOpenUDFConfig={() => setUdfOpen(true)}
        onRefresh={load}
        onExport={handleExport}
      />

      <AddUserModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        udfFields={udfFields}
        staticFields={staticFields.create}
        projectId={projectId}
        onSuccess={() => {
          setAddOpen(false);
          load();
        }}
      />

      <UDFConfigModal
        open={udfOpen}
        onClose={() => setUdfOpen(false)}
        scope="user"
        projectId={projectId}
        onSuccess={load}
      />
    </>
  );
}
