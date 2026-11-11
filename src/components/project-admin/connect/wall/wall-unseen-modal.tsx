"use client";

import React from "react";
import { X, Download } from "lucide-react";
import type { WallPost } from "../types";
import { exportUnseenUsersToCsv, type UnseenUserRow } from "./wall-service";

export interface WallUnseenModalProps {
  post: WallPost | null;
  onClose: () => void;
  unseenUsers?: UnseenUserRow[];
  onDownload?: (post: WallPost, users: UnseenUserRow[]) => void | Promise<void>;
}

// Exact seed people from prototype matching the screenshot
const PROTOTYPE_SAMPLE_UNSEEN_USERS: UnseenUserRow[] = [
  { id: "u29", name: "Priya Venkatesh", desig: "Brand Ambassador", store: "Chennai – T. Nagar" },
  { id: "u30", name: "Arun Kumar", desig: "Brand Ambassador", store: "Chennai – Velachery" },
  { id: "am1", name: "Arjun Mehta", desig: "Area Manager", store: "West area office" },
  { id: "am2", name: "Kavya Rao", desig: "Area Manager", store: "South area office" },
  { id: "am3", name: "Rohit Bansal", desig: "Area Manager", store: "North area office" },
  { id: "am4", name: "Lakshmi Iyer", desig: "Area Manager", store: "South-East area office" },
  { id: "cm1", name: "Sameer Kapoor", desig: "Cluster Manager", store: "Cluster office" },
  { id: "t1", name: "Neha Joshi", desig: "Trainer", store: "Training hub, Mumbai" },
];

// Color mapping for avatar initials matching the screenshot
const AV_COLORS = [
  "#5b5bd6", // Purple / Indigo (PV)
  "#1d4ed8", // Deep blue (AK)
  "#1e293b", // Dark navy (AM)
  "#0284c7", // Sky blue (KR)
  "#b45309", // Amber brown (RB)
  "#0d9488", // Teal
  "#c2410c", // Rust orange
];

function getAvatarColor(idOrName: string): string {
  if (idOrName === "u29" || idOrName.includes("Priya")) return "#5b5bd6";
  if (idOrName === "u30" || idOrName.includes("Arun")) return "#1d4ed8";
  if (idOrName === "am1" || idOrName.includes("Arjun")) return "#1e293b";
  if (idOrName === "am2" || idOrName.includes("Kavya")) return "#0284c7";
  if (idOrName === "am3" || idOrName.includes("Rohit")) return "#b45309";

  let h = 0;
  for (const c of idOrName) {
    h = (h * 31 + c.charCodeAt(0)) >>> 0;
  }
  return AV_COLORS[h % AV_COLORS.length];
}

function getInitials(name: string): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function WallUnseenModal({
  post,
  onClose,
  unseenUsers,
  onDownload,
}: WallUnseenModalProps) {
  if (!post) return null;

  const totalUsers = post.totalUsers ?? 36;
  const unseenCount = Math.max(0, totalUsers - post.seenCount);

  // Use dynamic project users list when available, falling back to prototype seed list
  const rawList =
    unseenUsers && unseenUsers.length > 0
      ? unseenUsers.slice(0, unseenCount)
      : PROTOTYPE_SAMPLE_UNSEEN_USERS.slice(0, Math.min(PROTOTYPE_SAMPLE_UNSEEN_USERS.length, unseenCount));

  function handleDownload() {
    if (!post) return;
    if (onDownload) {
      onDownload(post, rawList);
    } else {
      exportUnseenUsersToCsv(post, rawList);
    }
  }

  // Subtitle excerpt matching the screenshot
  const excerpt =
    post.content && post.content.length > 70
      ? `${post.content.slice(0, 67)}...`
      : post.content || (post.video?.title ? post.video.title : "Media post");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="unseen-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 flex items-start justify-between">
          <div className="min-w-0 pr-4">
            <h3
              id="unseen-modal-title"
              className="text-lg font-bold text-slate-900 leading-snug"
            >
              Not seen · {unseenCount} of {totalUsers}
            </h3>
            <p
              className="text-xs text-slate-500 mt-1 truncate max-w-md"
              title={post.content}
            >
              {excerpt}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body: Pick list container with rounded border and scroll */}
        <div className="px-6 pb-5">
          <div className="border border-slate-200/90 rounded-2xl overflow-hidden bg-white max-h-[300px] overflow-y-auto">
            {rawList.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {rawList.map((user) => (
                  <div
                    key={user.id}
                    className="py-3 px-4 flex items-center gap-3.5 hover:bg-slate-50/70 transition-colors"
                  >
                    {/* Circle avatar with bold white initials */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-2xs"
                      style={{ backgroundColor: getAvatarColor(user.id || user.name) }}
                      aria-hidden="true"
                    >
                      {getInitials(user.name)}
                    </div>

                    {/* Name & Subtitle */}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-slate-900 truncate">
                        {user.name}
                      </div>
                      <div className="text-xs text-slate-500 font-medium truncate mt-0.5">
                        {[user.desig || user.role, user.store || user.location]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-xs text-slate-500">
                Everyone active in the project has seen this post.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50/70 border-t border-slate-100 px-6 py-4 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-normal">
            Seen = half the post on screen for one second
          </span>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer shadow-2xs"
            >
              Close
            </button>
            <button
              type="button"
              disabled={unseenCount === 0}
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0b4ea2] hover:bg-[#093e82] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download list</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
export default WallUnseenModal;
