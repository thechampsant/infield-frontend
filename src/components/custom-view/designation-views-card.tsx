"use client";

import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { useState } from "react";
import type { CustomViewConfiguration, Designation } from "@/lib/api";
import { ViewEditor, isViewConfigured, type DraftView } from "./view-editor";

interface Props {
  designation: Designation;
  views: DraftView[];
  projectId: string;
  expandedViewId: string | null;
  onToggleView: (localId: string) => void;
  onChangeView: (localId: string, view: DraftView) => void;
  onAddView: () => void;
  onSaved: (saved: CustomViewConfiguration, localId: string) => void;
  onError: (message: string) => void;
}

export function DesignationViewsCard({
  designation,
  views,
  projectId,
  expandedViewId,
  onToggleView,
  onChangeView,
  onAddView,
  onSaved,
  onError,
}: Props) {
  const [open, setOpen] = useState(true);
  const code = designation.externalCode || designation.name.slice(0, 3).toUpperCase();

  return (
    <div className="cv-card">
      <div className="cv-card-header" onClick={() => setOpen((prev) => !prev)}>
        <div>
          <h3 className="cv-card-title">
            <span className="cv-code">{code}</span> {designation.name}
          </h3>
          <div className="cv-muted">{views.length} view{views.length === 1 ? "" : "s"}</div>
        </div>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>
      {open && (
        <>
          {views.map((view) => {
            const configured = isViewConfigured(view);
            const expanded = expandedViewId === view.localId;
            return (
              <div key={view.localId}>
                <div className="cv-view-row">
                  <button type="button" className="cv-btn cv-btn-secondary" onClick={() => onToggleView(view.localId)}>
                    {view.name || "Untitled view"}
                  </button>
                  <span className={`cv-badge ${configured ? "cv-badge-ready" : "cv-badge-incomplete"}`}>
                    {configured ? "Configured" : "Incomplete"}
                  </span>
                </div>
                {expanded && (
                  <ViewEditor
                    projectId={projectId}
                    designationId={designation.id}
                    view={view}
                    onChange={(next) => onChangeView(view.localId, next)}
                    onSaved={onSaved}
                    onError={onError}
                  />
                )}
              </div>
            );
          })}
          <button type="button" className="cv-btn cv-add-view" onClick={onAddView}>
            <Plus size={14} />
            Add view for {code}
          </button>
        </>
      )}
    </div>
  );
}
