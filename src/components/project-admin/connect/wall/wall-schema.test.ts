import { describe, it, expect } from "vitest";
import {
  wallPostFormSchema,
  MAX_POST_TEXT_LENGTH,
  MAX_POST_IMAGES,
  MAX_VIDEO_DURATION_SECONDS,
  MAX_VIDEO_SIZE_BYTES,
} from "./wall-schema";

describe("wallPostFormSchema Zod Validation", () => {
  it("passes for valid text-only post", () => {
    const result = wallPostFormSchema.safeParse({
      text: "Important announcement for the team.",
      mediaType: "NONE",
      images: [],
      video: null,
    });

    expect(result.success).toBe(true);
  });

  it("fails when text is empty and mediaType is NONE", () => {
    const result = wallPostFormSchema.safeParse({
      text: "   ",
      mediaType: "NONE",
      images: [],
      video: null,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("text"))).toBe(true);
    }
  });

  it("fails when text exceeds MAX_POST_TEXT_LENGTH (2,000 chars)", () => {
    const longText = "a".repeat(MAX_POST_TEXT_LENGTH + 1);
    const result = wallPostFormSchema.safeParse({
      text: longText,
      mediaType: "NONE",
      images: [],
      video: null,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("2,000 characters"))).toBe(true);
    }
  });

  it("passes for valid images post (1 to 10 images)", () => {
    const result = wallPostFormSchema.safeParse({
      text: "Check out these campaign guidelines",
      mediaType: "IMAGES",
      images: [
        { url: "https://example.com/img1.png", name: "guide-1.png", sizeBytes: 50000 },
        { url: "https://example.com/img2.png", name: "guide-2.png", sizeBytes: 60000 },
      ],
      video: null,
    });

    expect(result.success).toBe(true);
  });

  it("fails when mediaType is IMAGES but images array is empty", () => {
    const result = wallPostFormSchema.safeParse({
      text: "No images attached",
      mediaType: "IMAGES",
      images: [],
      video: null,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("at least one image"))).toBe(true);
    }
  });

  it("fails when images count exceeds MAX_POST_IMAGES (10 images)", () => {
    const images = Array.from({ length: MAX_POST_IMAGES + 1 }).map((_, i) => ({
      url: `https://example.com/img${i}.png`,
      name: `img-${i}.png`,
    }));

    const result = wallPostFormSchema.safeParse({
      text: "Too many images",
      mediaType: "IMAGES",
      images,
      video: null,
    });

    expect(result.success).toBe(false);
  });

  it("passes for valid video post (<= 180s, <= 200MB)", () => {
    const result = wallPostFormSchema.safeParse({
      text: "Peak-hour demo flow video",
      mediaType: "VIDEO",
      images: [],
      video: {
        url: "https://example.com/video.mp4",
        title: "Peak-hour demo flow",
        duration: "2:14",
        durationSeconds: 134,
        sizeBytes: 50 * 1024 * 1024,
      },
    });

    expect(result.success).toBe(true);
  });

  it("fails when video duration exceeds MAX_VIDEO_DURATION_SECONDS (180s / 3 min)", () => {
    const result = wallPostFormSchema.safeParse({
      text: "Too long video",
      mediaType: "VIDEO",
      images: [],
      video: {
        url: "https://example.com/video.mp4",
        title: "Long video",
        duration: "3:30",
        durationSeconds: MAX_VIDEO_DURATION_SECONDS + 30,
        sizeBytes: 50 * 1024 * 1024,
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("cannot exceed 3 minutes"))).toBe(true);
    }
  });

  it("fails when video size exceeds MAX_VIDEO_SIZE_BYTES (200MB)", () => {
    const result = wallPostFormSchema.safeParse({
      text: "Heavy video",
      mediaType: "VIDEO",
      images: [],
      video: {
        url: "https://example.com/video.mp4",
        title: "Heavy video",
        duration: "1:30",
        durationSeconds: 90,
        sizeBytes: MAX_VIDEO_SIZE_BYTES + 1024,
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("cannot exceed 200 MB"))).toBe(true);
    }
  });

  it("fails when both images and video are provided (mutually exclusive)", () => {
    const result = wallPostFormSchema.safeParse({
      text: "Mixed media post",
      mediaType: "IMAGES",
      images: [{ url: "https://example.com/img.png", name: "img.png" }],
      video: {
        url: "https://example.com/video.mp4",
        title: "Video",
        duration: "1:00",
        durationSeconds: 60,
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("not both"))).toBe(true);
    }
  });
});

