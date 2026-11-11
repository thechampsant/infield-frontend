"use client";

import type { Designation } from "@/lib/api";

interface Props {
  designations: Designation[];
  ownDesignationId: string;
  assignedIds: string[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function AlsoAssignTo({ designations, ownDesignationId, assignedIds, selectedIds, onChange }: Props) {
  const others = designations.filter((designation) => designation.id !== ownDesignationId);
  return (
    <fieldset className="doc-assignment-fieldset">
      <legend className="doc-label">Also Assign To</legend>
      <p className="doc-edit-help">Each selected designation gets an independent copy. Use Make Inactive to stop an existing assignment.</p>
      {others.length === 0 && <p className="doc-edit-help">No other project designations.</p>}
      <div className="doc-assignment-list">
        {others.map((designation) => {
          const assigned = assignedIds.includes(designation.id);
          return (
            <label key={designation.id} className="doc-assignment-option">
              <input
                type="checkbox"
                disabled={assigned}
                checked={assigned || selectedIds.includes(designation.id)}
                onChange={(event) => onChange(event.target.checked
                  ? [...selectedIds, designation.id]
                  : selectedIds.filter((id) => id !== designation.id))}
              />
              <span>{designation.name}</span>
              {assigned && <span className="doc-edit-help">Already assigned</span>}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
