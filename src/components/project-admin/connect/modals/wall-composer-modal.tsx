"use client";

import React, { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Image as ImageIcon, Video, Users, Play, AlertCircle, Loader2 } from "lucide-react";
import { plural } from "../utils";
import { MAX_POST_IMAGES, MAX_POST_TEXT_LENGTH, MAX_VIDEO_SIZE_BYTES, wallPostFormSchema, WallPostFormValues } from "../wall";
import { BaseModal } from "./base-modal";

interface WallComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: WallPostFormValues) => void | Promise<void>;
  userCount: number;
  initialConfirmation?: boolean;
}

export function WallComposerModal({
  isOpen,
  onClose,
  onSubmit,
  userCount,
  initialConfirmation = false,
}: WallComposerModalProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const wasOpenRef = useRef(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(initialConfirmation);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    trigger,
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

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setShowConfirmation(initialConfirmation);
      setSubmitError(null);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, initialConfirmation]);

  if (!isOpen) return null;

  function handleClose() {
    setShowConfirmation(false);
    reset();
    onClose();
  }

  async function handleInitiatePost(event?: React.MouseEvent) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    setSubmitError(null);
    const isValid = await trigger();
    if (isValid) {
      setShowConfirmation(true);
    }
  }

  async function onFormSubmit(data: WallPostFormValues) {
    if (!showConfirmation) {
      setShowConfirmation(true);
      return;
    }
    setSubmitError(null);
    try {
      await onSubmit(data);
      setShowConfirmation(false);
      reset();
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Could not upload media and publish this post.");
    }
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
    submitError || errors.text?.message ||
    errors.mediaType?.message ||
    errors.images?.message ||
    errors.video?.message;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      maxWidth="xl"
      ariaLabelledBy="modal-title"
      rawContent={true}
    >
      {/* Header */}
      <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100 shrink-0">
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

        {/* Form Container */}
        <form onSubmit={handleSubmit(onFormSubmit)} className="flex flex-col flex-1 min-h-0">
          {/* Scrollable Body */}
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
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
          </div>

          {/* Fixed Footer */}
          {showConfirmation ? (
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 bg-slate-50 shrink-0 gap-4 animate-in fade-in duration-150">
              <p className="text-xs text-slate-600 leading-snug">
                <strong className="font-bold text-slate-900">
                  A push goes to {userCount} {userCount === 1 ? "person" : "persons"} now.
                </strong>{" "}
                It can&apos;t be recalled or edited; a wrong post is deleted and posted again.
              </p>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowConfirmation(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer shadow-2xs"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0b4ea2] hover:bg-[#093e82] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Post now</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 bg-slate-50 shrink-0">
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
                  type="button"
                  onClick={handleInitiatePost}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#0b4ea2] hover:bg-[#093e82] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  Post to {plural(userCount, "user")}
                </button>
              </div>
            </div>
          )}
        </form>
    </BaseModal>
  );
}
