"use client";

import React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, AlertCircle } from "lucide-react";
import { wallPostFormSchema, type WallPostFormValues, MAX_POST_TEXT_LENGTH } from "../wall/wall-schema";

interface NewPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (content: string) => void;
  projectName: string;
  userCount: number;
}

export function NewPostModal({
  isOpen,
  onClose,
  onSubmit,
  projectName,
  userCount,
}: NewPostModalProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<WallPostFormValues>({
    resolver: zodResolver(wallPostFormSchema),
    defaultValues: {
      text: "",
      mediaType: "NONE",
      images: [],
      video: null,
    },
  });

  const content = useWatch({ control, name: "text", defaultValue: "" }) || "";

  if (!isOpen) return null;

  function handleClose() {
    reset();
    onClose();
  }

  function onFormSubmit(data: WallPostFormValues) {
    onSubmit(data.text.trim());
    reset();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Create Wall Post</h3>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onFormSubmit)} className="mt-4 space-y-4">
          <div>
            <label htmlFor="modal-post-text" className="block text-xs font-bold text-slate-700 mb-1.5">
              Post Content
            </label>
            <textarea
              id="modal-post-text"
              rows={4}
              maxLength={MAX_POST_TEXT_LENGTH}
              placeholder="Share updates, guidelines, or announcements with the entire field team..."
              {...register("text")}
              className={`w-full border rounded-xl p-3 text-sm focus:outline-hidden transition-colors ${errors.text ? "border-red-400 focus:border-red-500" : "border-slate-200 focus:border-blue-500"
                }`}
            />
            <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
              <span>
                {content.length} / {MAX_POST_TEXT_LENGTH.toLocaleString()} characters · line breaks only, no formatting
              </span>
            </div>
            {errors.text && (
              <p className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errors.text.message}</span>
              </p>
            )}
          </div>

          <div className="text-xs text-slate-500 bg-blue-50/60 p-3 rounded-lg border border-blue-100">
            🔔 This post will be broadcast with instant push notification to all {userCount} active users in {projectName}.
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!content.trim()}
              className="px-4 py-2 text-xs font-bold text-white bg-[#0b4ea2] hover:bg-[#093e82] disabled:bg-slate-200 disabled:text-slate-400 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              Publish Post
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
