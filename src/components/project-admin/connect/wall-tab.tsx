"use client";

import React from "react";
import {
  Plus,
  Eye,
  Trash2,
  Users,
  Image as ImageIcon,
  Video,
} from "lucide-react";
import type { WallPost } from "./types";

interface WallTabProps {
  posts: WallPost[];
  userCount: number;
  onNewPost: () => void;
  onDeletePost: (id: string) => void;
  onViewUnseen: (post: WallPost) => void;
}

function getProgressWidthClass(seenCount: number, total: number): string {
  const pct = Math.round((seenCount / total) * 100);
  if (pct <= 5) return "w-[3%]";
  if (pct <= 30) return "w-[28%]";
  if (pct <= 70) return "w-[67%]";
  if (pct <= 80) return "w-[78%]";
  if (pct <= 95) return "w-[92%]";
  return "w-full";
}

export function WallTab({
  posts,
  userCount,
  onNewPost,
  onDeletePost,
  onViewUnseen,
}: WallTabProps) {
  return (
    <div>
      {/* Section Subheader */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Wall</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Every post goes to all {userCount} active users in the project, with a push notification.
          </p>
        </div>
        <button
          type="button"
          onClick={onNewPost}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0b4ea2] hover:bg-[#093e82] text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New post</span>
        </button>
      </div>

      {/* Wall Posts Feed */}
      <div className="space-y-3">
        {posts.map((post) => {
          const unseenCount = Math.max(0, post.totalUsers - post.seenCount);

          return (
            <div
              key={post.id}
              className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs hover:border-slate-300 transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                {/* Post Content (Left) */}
                <div className="flex-1 pr-0 md:pr-6">
                  <div className="text-xs font-semibold text-slate-400">
                    {post.timestamp}
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-1 leading-snug">
                    {post.content}
                  </div>

                  {/* Metadata row */}
                  <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-3">
                    {post.hasImages && (
                      <span className="inline-flex items-center gap-1">
                        <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span>{post.imageCount} images</span>
                      </span>
                    )}
                    {post.hasVideo && (
                      <span className="inline-flex items-center gap-1">
                        <Video className="w-3.5 h-3.5 text-slate-400" />
                        <span>Video · {post.videoDuration}</span>
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{post.audience}</span>
                    </span>
                  </div>
                </div>

                {/* Stats & Actions (Right) */}
                <div className="w-full md:w-80 flex-shrink-0">
                  {/* Seen & Reaction columns */}
                  <div className="grid grid-cols-5 gap-2 text-center">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        SEEN BY
                      </div>
                      <div className="text-xs font-extrabold text-slate-800 mt-1">
                        {post.seenCount} <span className="text-slate-400 font-medium">of {post.totalUsers}</span>
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        LIKE
                      </div>
                      <div className="text-xs font-extrabold text-slate-800 mt-1">
                        {post.likes}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        CLAP
                      </div>
                      <div className="text-xs font-extrabold text-slate-800 mt-1">
                        {post.claps}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        CELEBRATE
                      </div>
                      <div className="text-xs font-extrabold text-slate-800 mt-1">
                        {post.celebrates}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        USEFUL
                      </div>
                      <div className="text-xs font-extrabold text-slate-800 mt-1">
                        {post.usefuls}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="connect-progress-track mt-2.5">
                    <div
                      className={`connect-progress-bar ${getProgressWidthClass(post.seenCount, post.totalUsers)}`}
                    />
                  </div>

                  {/* Not Seen Button & Delete Action */}
                  <div className="flex items-center justify-end gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => onViewUnseen(post)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span>Not seen · {unseenCount}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeletePost(post.id)}
                      className="p-1 text-slate-400 hover:text-red-600 transition-colors rounded-md hover:bg-slate-50 cursor-pointer"
                      title="Delete post"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
