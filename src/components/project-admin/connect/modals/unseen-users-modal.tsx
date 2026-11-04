"use client";

import React from "react";
import { X } from "lucide-react";
import type { WallPost } from "../types";

interface UnseenUsersModalProps {
  post: WallPost | null;
  onClose: () => void;
}

const SAMPLE_UNSEEN_USERS = [
  "Amitabh Joshi (Field Rep · Thane)",
  "Priya Kulkarni (Promoter · Malad)",
  "Suresh Nair (BA · Bandra)",
  "Kavita Verma (Promoter · CP)",
  "Manish Rao (Merchandiser · Indiranagar)",
  "Deepak Sen (Promoter · Koramangala)",
  "Rohan Mehra (Promoter · Gurgaon)",
  "Anil Gupta (Field Staff · Noida)",
];

export function UnseenUsersModal({ post, onClose }: UnseenUsersModalProps) {
  if (!post) return null;

  const unseenCount = Math.max(0, post.totalUsers - post.seenCount);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">
            Not Seen Yet ({unseenCount})
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-2 max-h-60 overflow-y-auto pr-1">
          {SAMPLE_UNSEEN_USERS.slice(0, Math.min(SAMPLE_UNSEEN_USERS.length, unseenCount)).map(
            (name, i) => (
              <div
                key={i}
                className="text-xs text-slate-700 py-1.5 px-2.5 rounded-lg bg-slate-50 border border-slate-100"
              >
                {name}
              </div>
            ),
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
