"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { Designation } from "@/lib/api";

interface SectionReportDetailsProps {
  reportName: string;
  description: string;
  accessRoles: string[];
  designations: Designation[];
  onReportNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onAccessRolesChange: (value: string[]) => void;
  errors?: Record<string, string>;
}

export function SectionReportDetails({
  reportName,
  description,
  accessRoles,
  designations,
  onReportNameChange,
  onDescriptionChange,
  onAccessRolesChange,
  errors = {},
}: SectionReportDetailsProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  const toggleRole = useCallback(
    (designationId: string) => {
      if (accessRoles.includes(designationId)) {
        onAccessRolesChange(accessRoles.filter((r) => r !== designationId));
      } else {
        onAccessRolesChange([...accessRoles, designationId]);
      }
    },
    [accessRoles, onAccessRolesChange],
  );

  const removeRole = useCallback(
    (designationId: string) => {
      onAccessRolesChange(accessRoles.filter((r) => r !== designationId));
    },
    [accessRoles, onAccessRolesChange],
  );

  const getDesignationLabel = (id: string) => {
    const d = designations.find((des) => des.id === id);
    return d?.name || id;
  };

  return (
    <div className="space-y-4">
      {/* Report Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Report Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={reportName}
          onChange={(e) => onReportNameChange(e.target.value)}
          maxLength={100}
          placeholder="Enter report name"
          className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
            errors.reportName ? "border-red-500" : "border-gray-300"
          }`}
        />
        {errors.reportName && (
          <p className="text-xs text-red-500 mt-1">{errors.reportName}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">{reportName.length}/100</p>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          maxLength={500}
          placeholder="Enter report description (optional)"
          rows={3}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
        />
        <p className="text-xs text-gray-400 mt-1">{description.length}/500</p>
      </div>

      {/* Role/Designation Access */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Role/Designation Access <span className="text-red-500">*</span>
        </label>

        {designations.length === 0 ? (
          <div className="border border-gray-200 rounded-md px-3 py-2 bg-gray-50 text-sm text-gray-500">
            No roles or designations are available for selection.
          </div>
        ) : (
          <div className="relative" ref={dropdownRef}>
            {/* Selected chips */}
            <div
              className={`min-h-[42px] border rounded-md px-2 py-1.5 flex flex-wrap gap-1 cursor-pointer ${
                errors.accessRoles ? "border-red-500" : "border-gray-300"
              }`}
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              {accessRoles.map((roleId) => (
                <span
                  key={roleId}
                  className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full"
                >
                  {getDesignationLabel(roleId)}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeRole(roleId);
                    }}
                    className="hover:bg-blue-100 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {accessRoles.length === 0 && (
                <span className="text-sm text-gray-400 py-0.5">
                  Select roles/designations...
                </span>
              )}
            </div>

            {/* Dropdown */}
            {dropdownOpen && (
              <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                {designations.map((designation) => (
                  <label
                    key={designation.id}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={accessRoles.includes(designation.id)}
                      onChange={() => toggleRole(designation.id)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{designation.name}</span>
                  </label>
                ))}
                <div className="sticky bottom-0 bg-white border-t border-gray-100 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(false)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {errors.accessRoles && (
          <p className="text-xs text-red-500 mt-1">{errors.accessRoles}</p>
        )}
      </div>
    </div>
  );
}
