import { z } from "zod";

export const MAX_POST_TEXT_LENGTH = 2000;
export const MAX_POST_IMAGES = 10;
export const MAX_VIDEO_DURATION_SECONDS = 180; // 3 minutes
export const MAX_VIDEO_SIZE_BYTES = 200 * 1024 * 1024; // 200 MiB (209,715,200 bytes)

export const wallImageSchema = z.object({
  url: z.string().min(1, "Image URL or data is required"),
  name: z.string().min(1, "Image filename is required"),
  originalName: z.string().optional(),
  sizeBytes: z.number().nonnegative().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
});

export const wallVideoSchema = z.object({
  url: z.string().min(1, "Video URL or data is required"),
  title: z.string().min(1, "Video title is required"),
  duration: z.string().min(1, "Video duration is required"),
  durationSeconds: z
    .number()
    .nonnegative()
    .max(MAX_VIDEO_DURATION_SECONDS, "Video duration cannot exceed 3 minutes (180 seconds)")
    .optional(),
  sizeBytes: z
    .number()
    .nonnegative()
    .max(MAX_VIDEO_SIZE_BYTES, "Video size cannot exceed 200 MB")
    .optional(),
  originalName: z.string().optional(),
});

export const wallPostFormSchema = z
  .object({
    text: z
      .string()
      .max(MAX_POST_TEXT_LENGTH, `Message cannot exceed ${MAX_POST_TEXT_LENGTH.toLocaleString()} characters`),
    mediaType: z.enum(["NONE", "IMAGES", "VIDEO"]),
    images: z.array(wallImageSchema).max(MAX_POST_IMAGES, `Up to ${MAX_POST_IMAGES} images allowed`),
    video: wallVideoSchema.nullable().optional(),
  })
  .superRefine((data, ctx) => {
    const hasText = data.text.trim().length > 0;
    const hasImages = (data.images?.length ?? 0) > 0;
    const hasVideo = !!data.video;

    // Mutually exclusive media check
    if (hasImages && hasVideo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A post holds images or a video, not both.",
        path: ["mediaType"],
      });
    }

    // Media type NONE check: text is required
    if (data.mediaType === "NONE") {
      if (!hasText) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Add text, images or a video before posting.",
          path: ["text"],
        });
      }
      if (hasImages || hasVideo) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Media type is set to NONE but media was attached.",
          path: ["mediaType"],
        });
      }
    }

    // Media type IMAGES check
    if (data.mediaType === "IMAGES") {
      if (!hasImages) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please attach at least one image.",
          path: ["images"],
        });
      }
      if (hasVideo) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Video cannot be attached when image mode is selected.",
          path: ["video"],
        });
      }
    }

    // Media type VIDEO check
    if (data.mediaType === "VIDEO") {
      if (!hasVideo) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please attach a video file.",
          path: ["video"],
        });
      }
      if (hasImages) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Images cannot be attached when video mode is selected.",
          path: ["images"],
        });
      }
    }
  });

export type WallPostFormValues = z.infer<typeof wallPostFormSchema>;
export type WallImageFormValues = z.infer<typeof wallImageSchema>;
export type WallVideoFormValues = z.infer<typeof wallVideoSchema>;

