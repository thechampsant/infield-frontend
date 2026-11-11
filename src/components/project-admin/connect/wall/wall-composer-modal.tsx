"use client";

import React, { useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Image as ImageIcon, Video, Users, Play, AlertCircle } from "lucide-react";
import {
  wallPostFormSchema,
  MAX_POST_TEXT_LENGTH,
  MAX_POST_IMAGES,
  MAX_VIDEO_SIZE_BYTES,
  type WallPostFormValues,
} from "./wall-schema";
import { plural } from "./wall-service";

interface WallComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: WallPostFormValues) => void | Promise<void>;
  userCount: number;
}

export function WallComposerModal({
  isOpen,
  onClose,
  onSubmit,
  userCount,
}: WallComposerModalProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<WallPostFormValues>({
    resolver: zodResolver(wallPostFormSchema),
    defaultValues: {
      text: "",
      mediaType: "NONE",
      images: [],
      video: null,
    },
  });

  const textValue = useWatch({ control, name: "text", defaultValue: "" }) || "";
  const mediaType = useWatch({ control, name: "mediaType", defaultValue: "NONE" });
  const images = useWatch({ control, name: "images", defaultValue: [] }) || [];
  const video = useWatch({ control, name: "video", defaultValue: null });

  if (!isOpen) return null;

  function handleClose() {
    reset();
    onClose();
  }

  async function onFormSubmit(data: WallPostFormValues) {
    await onSubmit(data);
    reset();
    onClose();
  }

  function handleAddImageClick() {
    if (images.length >= MAX_POST_IMAGES || mediaType === "VIDEO") return;
    if (imageInputRef.current) {
      imageInputRef.current.click();
    }
  }

  function handleImageFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const availableSlots = MAX_POST_IMAGES - images.length;
    const filesToAdd = Array.from(files).slice(0, availableSlots);

    const newImageItems = filesToAdd.map((file, idx) => ({
      url: typeof URL !== "undefined" && URL.createObjectURL ? URL.createObjectURL(file) : `img-${Date.now()}-${idx}`,
      name: file.name,
      originalName: file.name,
      sizeBytes: file.size,
    }));

    const updatedImages = [...images, ...newImageItems];
    setValue("images", updatedImages, { shouldValidate: true });
    setValue("video", null);
    setValue("mediaType", "IMAGES", { shouldValidate: true });

    // reset input
    e.target.value = "";
  }

  function handleAddMockImage() {
    if (images.length >= MAX_POST_IMAGES || mediaType === "VIDEO") return;
    const nextIndex = images.length + 1;
    const updatedImages = [
      ...images,
      {
        url: `https://images.example/demo-${nextIndex}.webp`,
        name: `Image ${nextIndex}`,
        originalName: `image-${nextIndex}.jpg`,
      },
    ];
    setValue("images", updatedImages, { shouldValidate: true });
    setValue("video", null);
    setValue("mediaType", "IMAGES", { shouldValidate: true });
  }

  function handleRemoveImage(index: number) {
    const updated = images.filter((_, i) => i !== index);
    setValue("images", updated, { shouldValidate: true });
    if (updated.length === 0) {
      setValue("mediaType", "NONE", { shouldValidate: true });
    }
  }

  function handleAddVideoClick() {
    if (mediaType === "IMAGES" || !!video) return;
    if (videoInputRef.current) {
      videoInputRef.current.click();
    }
  }

  function handleVideoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      alert("Video file size exceeds the 200 MB limit.");
      e.target.value = "";
      return;
    }

    const videoItem = {
      url: typeof URL !== "undefined" && URL.createObjectURL ? URL.createObjectURL(file) : `vid-${Date.now()}`,
      title: file.name.replace(/\.[^/.]+$/, ""),
      duration: "1:48",
      durationSeconds: 108,
      sizeBytes: file.size,
      originalName: file.name,
    };

    setValue("video", videoItem, { shouldValidate: true });
    setValue("images", []);
    setValue("mediaType", "VIDEO", { shouldValidate: true });

    e.target.value = "";
  }

  function handleAddMockVideo() {
    if (mediaType === "IMAGES" || !!video) return;
    const videoItem = {
      url: "https://videos.example/store-walkthrough.mp4",
      title: "Store walkthrough",
      duration: "1:48",
      durationSeconds: 108,
      sizeBytes: 25 * 1024 * 1024,
    };

    setValue("video", videoItem, { shouldValidate: true });
    setValue("images", []);
    setValue("mediaType", "VIDEO", { shouldValidate: true });
  }

  function handleRemoveVideo() {
    setValue("video", null, { shouldValidate: true });
    setValue("mediaType", "NONE", { shouldValidate: true });
  }

  // Combined error message if any
  const formError =
    errors.text?.message ||
    errors.mediaType?.message ||
    errors.images?.message ||
    errors.video?.message;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 my-8">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 id="modal-title" className="text-base font-bold text-slate-900">
              New Wall post
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Goes live at once for everyone active in the project
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hidden native file inputs */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleImageFiles}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleVideoFile}
        />

        {/* Form Body */}
        <form onSubmit={handleSubmit(onFormSubmit)} className="mt-4 space-y-4">
          {/* Message Field */}
          <div>
            <label
              htmlFor="post-text"
              className="block text-xs font-bold text-slate-700 mb-1"
            >
              Message
            </label>
            <textarea
              id="post-text"
              rows={4}
              maxLength={MAX_POST_TEXT_LENGTH}
              placeholder="Write the update your field team needs to see"
              {...register("text")}
              className={`w-full border rounded-xl p-3 text-sm focus:outline-hidden transition-colors ${errors.text ? "border-red-400 focus:border-red-500" : "border-slate-200 focus:border-blue-500"
                }`}
            />
            <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
              <span>
                {textValue.length} / {MAX_POST_TEXT_LENGTH.toLocaleString()} characters · line breaks only, no formatting
              </span>
            </div>
            {errors.text && (
              <p className="mt-1 text-xs text-red-600 font-medium">{errors.text.message}</p>
            )}
          </div>

          {/* Media Section */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Media
            </label>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleAddImageClick}
                disabled={images.length >= MAX_POST_IMAGES || !!video}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
              >
                <ImageIcon className="w-3.5 h-3.5 text-slate-600" />
                <span>Add image</span>
              </button>

              <button
                type="button"
                onClick={handleAddVideoClick}
                disabled={!!video || images.length > 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
              >
                <Video className="w-3.5 h-3.5 text-slate-600" />
                <span>Add video</span>
              </button>

              {/* Quick simulation buttons for testing environments */}
              <button
                type="button"
                onClick={handleAddMockImage}
                disabled={images.length >= MAX_POST_IMAGES || !!video}
                className="text-[11px] text-blue-600 hover:underline px-1 py-0.5"
                title="Quick demo image"
              >
                + Demo image
              </button>
              <button
                type="button"
                onClick={handleAddMockVideo}
                disabled={!!video || images.length > 0}
                className="text-[11px] text-blue-600 hover:underline px-1 py-0.5"
                title="Quick demo video"
              >
                + Demo video
              </button>
            </div>

            {/* Attached media display */}
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2.5">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-700"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                    <span className="max-w-[120px] truncate">{img.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      aria-label={`Remove ${img.name}`}
                      className="p-0.5 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {video && (
              <div className="mt-2.5">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 font-medium">
                  <Play className="w-3.5 h-3.5 fill-blue-700 text-blue-700" />
                  <span>
                    {video.title} · {video.duration}
                  </span>
                  <button
                    type="button"
                    onClick={handleRemoveVideo}
                    aria-label="Remove video"
                    className="p-0.5 text-blue-400 hover:text-blue-700 rounded-md cursor-pointer ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            <p className="text-[11px] text-slate-400 mt-1.5">
              Up to 10 images, or one video of up to 3 minutes and 200 MB. A post holds images or a video, not both.
            </p>
          </div>

          {/* Audience reach banner */}
          <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-600">
            <Users className="w-4 h-4 text-slate-500 shrink-0" />
            <span>
              Audience: <strong className="text-slate-800">everyone</strong> · {userCount} active users in the project.
            </span>
          </div>

          {/* Error Banner */}
          {formError && (
            <div
              role="alert"
              className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700"
            >
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <span className="text-[11px] text-slate-400">
              Shown as Program Team · logged under your name
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-white bg-[#0b4ea2] hover:bg-[#093e82] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                Post to {plural(userCount, "user")}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
