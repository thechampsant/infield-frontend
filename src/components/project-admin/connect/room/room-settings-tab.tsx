"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { renameRoomSchema, type RenameRoomFormValues } from "./room-schema";
import { RoomDeleteModal } from "../modals/room-delete-modal";
import type { ChatRoom } from "@/components/project-admin/connect/types";

export interface RoomSettingsTabProps {
  room: ChatRoom;
  onRenameRoom: (name: string) => Promise<void> | void;
  onDeleteRoom: (roomId: string) => Promise<void> | void;
}

export function RoomSettingsTab({
  room,
  onRenameRoom,
  onDeleteRoom,
}: RoomSettingsTabProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<RenameRoomFormValues>({
    resolver: zodResolver(renameRoomSchema),
    defaultValues: {
      name: room.name,
    },
  });

  const currentName = watch("name") || "";
  const isUnchanged = currentName.trim() === room.name;

  useEffect(() => {
    reset({ name: room.name });
    setFeedback(null);
  }, [room.name, reset]);

  async function onFormSubmit(values: RenameRoomFormValues) {
    if (isUnchanged) return;
    try {
      setIsSaving(true);
      setFeedback(null);
      await onRenameRoom(values.name);
      setFeedback({ type: "success", message: "Room name saved successfully." });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to rename room.";
      setFeedback({ type: "error", message: msg });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConfirmDelete() {
    try {
      setIsDeleting(true);
      await onDeleteRoom(room.id);
      setShowDeleteModal(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete room.";
      setFeedback({ type: "error", message: msg });
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="border border-slate-200 rounded-xl bg-white p-6 shadow-xs max-w-xl">
      <h3 className="text-base font-bold text-slate-900">Room settings</h3>
      <p className="text-xs text-slate-500 mt-1">
        Update the name or delete this chat room.
      </p>

      {feedback && (
        <div
          role="alert"
          className={`mt-4 p-3 rounded-lg border text-xs font-medium flex items-center gap-2 ${feedback.type === "success"
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-red-50 border-red-200 text-red-800"
            }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onFormSubmit)} className="mt-5 space-y-5">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="room-settings-name"
              className="text-xs font-bold text-slate-700"
            >
              Room name
            </label>
            <span className="text-[11px] text-slate-400 font-medium">
              {currentName.length} / 50
            </span>
          </div>

          <input
            id="room-settings-name"
            type="text"
            maxLength={50}
            defaultValue={room.name}
            {...register("name")}
            disabled={isSaving || isDeleting}
            className={`w-full border rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden transition-colors ${errors.name
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

        <div className="pt-2 flex items-center justify-between gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            disabled={isSaving || isDeleting}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50/60 border border-red-400 rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete room</span>
          </button>

          <button
            type="submit"
            disabled={isSaving || isDeleting || isUnchanged || !currentName.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0b4ea2] hover:bg-[#093e82] disabled:bg-slate-200 disabled:text-slate-400 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Save name</span>
          </button>
        </div>
      </form>

      {/* Delete confirmation modal */}
      <RoomDeleteModal
        isOpen={showDeleteModal}
        room={room}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
