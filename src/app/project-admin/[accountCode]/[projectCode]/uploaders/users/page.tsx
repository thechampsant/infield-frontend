"use client";

import { useCallback, useEffect, useState } from "react";
import { formatApiError } from "@/lib/api";
import { designationService } from "@/lib/api/designation-service";
import { projectUsersService } from "@/lib/api/project-users-service";
import { useProjectContext } from "@/lib/project-admin/project-context";
import { DesignationsRequiredBanner } from "@/components/project-admin/uploaders/designations-required-banner";
import { UserTable } from "@/components/project-admin/uploaders/users/user-table";
import { AddUserModal } from "@/components/project-admin/uploaders/users/add-user-modal";
import { UDFConfigModal } from "@/components/project-admin/udf/udf-config-modal";
import type { ProjectUser, UDFField } from "@/types/project-admin";

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
  const [designationCount, setDesignationCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const [userList, fields, designations] = await Promise.all([
        projectUsersService.listByProject(projectId),
        projectUsersService.getFormFields(projectId),
        designationService.listByProject(projectId).catch(() => []),
      ]);
      setUsers(userList);
      setUdfFields(fields);
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
    try {
      const blob = await projectUsersService.downloadTemplate();
      downloadBlob(blob, "users-bulk-template.xlsx");
    } catch {
      setError("Template download is not available yet.");
    }
  };

  const handleExport = async () => {
    if (!projectId) return;
    try {
      const blob = await projectUsersService.exportUsers(projectId);
      downloadBlob(blob, "users-export.xlsx");
    } catch {
      setError("Export is not available yet.");
    }
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
            onClick={() => setError("Bulk upload UI coming soon.")}
          >
            ↑ Bulk Upload
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

      <UserTable
        users={users}
        udfFields={udfFields}
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
