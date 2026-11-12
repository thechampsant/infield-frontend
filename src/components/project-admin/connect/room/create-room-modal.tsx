"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Info, Loader2 } from "lucide-react";
import {
  createRoomSchema,
  type CreateRoomFormValues,
} from "./room-schema";
import { plural, initials } from "./room-service";
import type { ProjectUser } from "@/types/project-admin";
import { MemberUserPicker } from "./member-user-picker";

export interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: CreateRoomFormValues) => void | Promise<void>;
  eligibleUsers?: ProjectUser[];
  isSubmitting?: boolean;
}

export function CreateRoomModal({
  isOpen,
  onClose,
  onSubmit,
  eligibleUsers = [],
  isSubmitting = false,
}: CreateRoomModalProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateRoomFormValues>({
    resolver: zodResolver(createRoomSchema),
    defaultValues: {
      name: "",
      memberUserIds: [],
    },
  });

  const roomName = watch("name") || "";
  const selectedUserIds = watch("memberUserIds") || [];

  // Reset form whenever modal opens or closes
  useEffect(() => {
    if (isOpen) {
      reset({ name: "", memberUserIds: [] });
    }
  }, [isOpen, reset]);

  // Toggle user selection
  function handleRemoveChip(userId: string) {
    setValue(
      "memberUserIds",
      selectedUserIds.filter((id) => id !== userId),
      { shouldValidate: true },
    );
  }

  async function onFormSubmit(values: CreateRoomFormValues) {
    await onSubmit(values);
  }

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-room-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div className="bg-white rounded-2xl max-w-[720px] w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div>
            <h3
              id="create-room-modal-title"
              className="text-lg font-bold text-slate-900"
            >
              Create chat room
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              A discussion room: every member can message
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onFormSubmit)} className="mt-5 space-y-4">
          {/* Room Name Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="room-name-input"
                className="text-[10px] font-bold tracking-[0.18em] text-slate-700"
              >
                Room name
              </label>
              <span className="text-[11px] text-slate-400 font-medium">
                {roomName.length} / 50
              </span>
            </div>
            <input
              id="room-name-input"
              type="text"
              maxLength={50}
              placeholder="e.g. Hyderabad Weekend Squad"
              {...register("name")}
              disabled={isSubmitting}
              className={`w-full border rounded-xl bg-slate-50/70 px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-hidden transition-colors ${errors.name
                ? "border-red-400 bg-red-50/20 focus:border-red-500"
                : "border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                }`}
            />
            {errors.name && (
              <p className="text-xs text-red-600 font-medium mt-1">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Members Field */}
          <div>
            <label className="block text-[10px] font-bold tracking-[0.18em] text-slate-700 mb-2">
              Members
            </label>
            <MemberUserPicker
              users={eligibleUsers}
              selectedUserIds={selectedUserIds}
              onSelectionChange={(ids) => setValue("memberUserIds", ids, { shouldValidate: true })}
              disabled={isSubmitting}
            />

            {/* Selected Count & Chips */}
            <div className="mt-2.5 space-y-2">
              <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
                <span>
                  {plural(selectedUserIds.length, "member")} selected · 2 to 250
                  per room
                </span>
                {selectedUserIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setValue("memberUserIds", [], { shouldValidate: true })
                    }
                    className="text-[11px] text-blue-600 hover:underline cursor-pointer"
                  >
                    Clear selection
                  </button>
                )}
              </div>

              {selectedUserIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1">
                  {selectedUserIds.slice(0, 14).map((id) => {
                    const u = eligibleUsers.find((x) => (x.backendId || x.id) === id);
                    const displayName = u ? u.name : id;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 rounded-lg pl-2 pr-1 py-0.5 transition-colors"
                      >
                        <span className="truncate max-w-[120px]">
                          {displayName}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveChip(id)}
                          disabled={isSubmitting}
                          className="hover:text-red-600 p-0.5 rounded cursor-pointer"
                          aria-label={`Remove ${displayName}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                  {selectedUserIds.length > 14 && (
                    <span className="inline-flex items-center text-[11px] font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5">
                      +{selectedUserIds.length - 14} more
                    </span>
                  )}
                </div>
              )}

              {errors.memberUserIds && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-700 font-medium">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  <span>{errors.memberUserIds.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
              Members get a push and see the room in their Rooms tab
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  !roomName.trim() ||
                  selectedUserIds.length < 2 ||
                  selectedUserIds.length > 250
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0b4ea2] hover:bg-[#093e82] disabled:bg-slate-200 disabled:text-slate-400 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                {isSubmitting && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                <span>Create room</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
