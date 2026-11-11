"use client";

import React from "react";
import { Eye, Trash2, Users, Image as ImageIcon, Video } from "lucide-react";
import type { WallPost } from "../types";
import { calculateReachPercentage, plural } from "./wall-service";

interface WallPostCardProps {
  post: WallPost;
  onViewUnseen: (post: WallPost) => void;
  onDelete: (id: string) => void;
}

const REACTIONS: Array<{ key: keyof Pick<WallPost, "likes" | "claps" | "celebrates" | "usefuls">; label: string }> = [
  { key: "likes", label: "LIKE" },
  { key: "claps", label: "CLAP" },
  { key: "celebrates", label: "CELEBRATE" },
  { key: "usefuls", label: "USEFUL" },
];

export function WallPostCard({ post, onViewUnseen, onDelete }: WallPostCardProps) {
  const imageCount = post.images?.length ?? post.imageCount ?? 0;
  const hasImages = (post.hasImages || imageCount > 0) && (post.mediaType !== "VIDEO");
  const videoDuration = post.video?.duration ?? post.videoDuration ?? "";
  const hasVideo = (post.hasVideo || !!post.video) && (post.mediaType !== "IMAGES");
  const unseenCount = Math.max(0, post.totalUsers - post.seenCount);
  const reachPercentage = calculateReachPercentage(post.seenCount, post.totalUsers);

  return (
    <article
      data-testid={`wall-post-card-${post.id}`}
      className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs hover:border-slate-300 transition-colors"
    >
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        {/* Post Content (Left) */}
        <div className="flex-1 pr-0 md:pr-6 min-w-0">
          <div className="text-xs font-semibold text-slate-400">
            {post.timestamp}
          </div>

          <p className="text-sm font-bold text-slate-900 mt-1 leading-snug whitespace-pre-wrap break-words">
            {post.content || (post.video?.title ? post.video.title : "Media post")}
          </p>

          {/* Metadata badges row */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium mt-3">
            {hasImages && (
              <span className="inline-flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                <span>{plural(imageCount, "image")}</span>
              </span>
            )}
            {hasVideo && (
              <span className="inline-flex items-center gap-1">
                <Video className="w-3.5 h-3.5 text-slate-400" />
                <span>Video{videoDuration ? ` · ${videoDuration}` : ""}</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>{post.audience || "Everyone"}</span>
            </span>
          </div>
        </div>

        {/* Stats & Actions (Right) */}
        <div className="w-full md:w-80 shrink-0">
          {/* Seen & Reaction columns */}
          <div className="grid grid-cols-5 gap-2 text-center">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                SEEN BY
              </div>
              <div className="text-xs font-extrabold text-slate-800 mt-1">
                {post.seenCount}{" "}
                <span className="text-slate-400 font-medium">of {post.totalUsers}</span>
              </div>
            </div>

            {REACTIONS.map(({ key, label }) => (
              <div key={key}>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {label}
                </div>
                <div className="text-xs font-extrabold text-slate-800 mt-1">
                  {post[key]}
                </div>
              </div>
            ))}
          </div>

          {/* Progress Bar */}
          <div
            className="connect-progress-track mt-2.5"
            role="progressbar"
            aria-valuenow={reachPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Seen by ${post.seenCount} of ${post.totalUsers}`}
          >
            <div
              className="connect-progress-bar"
              style={{ width: `${reachPercentage}%` }}
            />
          </div>

          {/* Actions: Not seen & Delete */}
          <div className="flex items-center justify-end gap-2 mt-3">
            <button
              type="button"
              disabled={post.seenCount >= post.totalUsers}
              onClick={() => onViewUnseen(post)}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              <span>Not seen · {unseenCount}</span>
            </button>

            <button
              type="button"
              onClick={() => onDelete(post.id)}
              className="p-1 text-slate-400 hover:text-red-600 transition-colors rounded-md hover:bg-slate-50 cursor-pointer"
              title="Delete post"
              aria-label="Delete post"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

