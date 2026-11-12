"use client";

import React, { useState } from "react";
import { Plus, Info, Loader2, AlertCircle } from "lucide-react";
import type { WallPost } from "../types";
import {
  WallPostCard,
  type WallPostFormValues,
} from "./";
import { connectWallService } from "@/lib/api/connect-wall-service";
import { WallComposerModal } from "../modals/wall-composer-modal";
import { exportUnseenUsersToCsv, UnseenUserRow } from "../utils";
import WallUnseenModal from "../modals/wall-unseen-modal";
import { WallDeleteModal } from "../modals/wall-delete-modal";

export interface WallTabProps {
  posts: WallPost[];
  userCount: number;
  wallEnabled?: boolean;
  projectName?: string;
  isLoading?: boolean;
  error?: string | null;
  unseenUsers?: UnseenUserRow[];
  onNewPost?: () => void;
  onCreatePost?: (data: WallPostFormValues) => void | Promise<void>;
  onDeletePost: (id: string) => void | Promise<void>;
  onViewUnseen?: (post: WallPost) => void;
  onDownloadUnseen?: (post: WallPost, users: UnseenUserRow[]) => void | Promise<void>;
}

export function WallTab({
  posts,
  userCount,
  wallEnabled = true,
  isLoading = false,
  error = null,
  unseenUsers,
  onNewPost,
  onCreatePost,
  onDeletePost,
  onViewUnseen,
  onDownloadUnseen,
}: WallTabProps) {
  // Modal visibility states
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [selectedUnseenPost, setSelectedUnseenPost] = useState<WallPost | null>(null);
  const [postToDeleteId, setPostToDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function handleOpenComposer() {
    if (onNewPost && !onCreatePost) {
      onNewPost();
    } else {
      setIsComposerOpen(true);
    }
  }

  function handleViewUnseen(post: WallPost) {
    if (onViewUnseen) {
      onViewUnseen(post);
    }
    setSelectedUnseenPost(post);
  }

  async function handleConfirmDelete() {
    if (!postToDeleteId) return;
    try {
      setIsDeleting(true);
      await onDeletePost(postToDeleteId);
    } finally {
      setIsDeleting(false);
      setPostToDeleteId(null);
    }
  }

  async function handleCreatePostSubmit(values: WallPostFormValues) {
    if (onCreatePost) {
      await onCreatePost(values);
    }
    setIsComposerOpen(false);
  }

  async function handleDownloadUnseenList(post: WallPost, users: UnseenUserRow[]) {
    if (onDownloadUnseen) {
      await onDownloadUnseen(post, users);
      return;
    }
    try {
      await connectWallService.downloadUnseenXlsx(post.id);
    } catch {
      exportUnseenUsersToCsv(post, users);
    }
  }

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
          onClick={handleOpenComposer}
          disabled={!wallEnabled}
          aria-label="New post"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0b4ea2] hover:bg-[#093e82] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New post</span>
        </button>
      </div>

      {/* Wall Disabled Notice */}
      {!wallEnabled && (
        <div
          role="alert"
          className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-2 text-xs"
        >
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span>The Wall is switched off in Settings. Existing posts are hidden from field users.</span>
        </div>
      )}

      {/* Error alert if any */}
      {error && (
        <div
          role="alert"
          className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-center gap-2 text-xs"
        >
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Wall Posts Feed */}
      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center flex flex-col items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#0b4ea2] mb-2" />
          <p className="text-xs text-slate-500">Loading Wall feed...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <p className="text-sm font-semibold text-slate-700">No Wall posts yet</p>
          <p className="text-xs text-slate-400 mt-1">
            Create an announcement to broadcast updates to the entire project.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <WallPostCard
              key={post.id}
              post={{
                ...post,
                totalUsers: post.totalUsers > 0 ? post.totalUsers : userCount,
              }}
              onViewUnseen={handleViewUnseen}
              onDelete={(id) => setPostToDeleteId(id)}
            />
          ))}
        </div>
      )}

      {/* Composer Modal with React-Hook-Form & Zod validation */}
      <WallComposerModal
        isOpen={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        onSubmit={handleCreatePostSubmit}
        userCount={userCount}
      />

      {/* Unseen Users Modal with XLSX/CSV download */}
      <WallUnseenModal
        post={selectedUnseenPost ? {
          ...selectedUnseenPost,
          totalUsers: selectedUnseenPost.totalUsers > 0 ? selectedUnseenPost.totalUsers : userCount,
        } : null}
        unseenUsers={unseenUsers}
        onDownload={handleDownloadUnseenList}
        onClose={() => setSelectedUnseenPost(null)}
      />

      {/* Delete Confirmation Modal */}
      <WallDeleteModal
        isOpen={!!postToDeleteId}
        onClose={() => setPostToDeleteId(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
export default WallTab;
