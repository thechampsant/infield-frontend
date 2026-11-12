"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useProjectContext } from "@/lib/project-admin/project-context";
import { useAuth } from "@/lib/auth/auth-context";
import { useConnectSettings } from "@/hooks/use-connect-settings";
import { connectWallService } from "@/lib/api/connect-wall-service";
import type { ProjectUser } from "@/types/project-admin";
import type {
  WallPost,
  WallImageMetadata,
  WallVideoMetadata,
  ConnectTab,
} from "./types";
import { WallTab } from "./wall/wall-tab";
import type { WallPostFormValues, UnseenUserRow } from "./wall";
import { ChatRoomsTab } from "./room";
import { SettingsTab } from "./settings/settings-tab";
import { NewPostModal } from "./modals/new-post-modal";
import { projectAdminBase } from "@/lib/nav/nav";
import { AlertCircle, SlidersHorizontal } from "lucide-react";

export function ConnectPage({ tab }: { tab: "wall" | "room" | "setting" }) {
  const { projectName, projectId, accountCode, projectCode } = useProjectContext();
  const { user } = useAuth();
  const currentUserName =
    user
      ? [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.email ||
      "Project Admin"
      : "Project Admin";

  const effectiveProjectName = projectName || "Sample Retail Program";
  const base = projectAdminBase(accountCode, projectCode);
  const activeTab: ConnectTab =
    tab === "room" ? "chat" : tab === "setting" ? "settings" : "wall";

  // Dynamic active user count & project user list from /api/v1/users?projectId=...
  const [userCount, setUserCount] = useState<number>(() => (projectId ? 0 : 36));
  const [projectUsers, setProjectUsers] = useState<ProjectUser[]>([]);

  // Dynamic Wall state from /api/v1/connect/wall/posts
  const [wallPosts, setWallPosts] = useState<WallPost[]>([]);
  const [loadingWall, setLoadingWall] = useState<boolean>(() => activeTab === "wall" && Boolean(projectId));
  const [wallError] = useState<string | null>(null);

  // Unified helper hook for Connect module switches and audit history
  const {
    settings,
    auditHistory,
    saving: savingSettings,
    error: settingsError,
    toggleConnect,
    toggleWall,
    toggleChatRooms,
  } = useConnectSettings(projectId, currentUserName);

  // Modal dialog states
  const [showNewPostModal, setShowNewPostModal] = useState(false);

  // 1. Dynamic fetch of project users & active user count (cached & deduplicated)
  useEffect(() => {
    let cancelled = false;

    // Users list not needed on Settings tab or if no projectId
    if (activeTab === "settings" || !projectId) {
      return;
    }

    async function loadProjectUsers() {
      try {
        const result = await connectWallService.getActiveProjectUsers(projectId!);
        if (cancelled) return;

        setUserCount(result.activeCount);
        setProjectUsers(result.data);
      } catch (err) {
        console.warn("Could not fetch project users, falling back to local users", err);
        if (cancelled) return;
        setUserCount(36);
      }
    }

    loadProjectUsers();
    return () => {
      cancelled = true;
    };
  }, [projectId, activeTab]);

  // 2. Dynamic fetch of Wall posts feed (cached & deduplicated)
  useEffect(() => {
    let cancelled = false;

    // Wall posts only needed when on the Wall tab!
    if (activeTab !== "wall" || !projectId) {
      return;
    }

    async function loadWall() {
      try {
        const res = await connectWallService.listPosts({ projectId });
        if (cancelled) return;
        setWallPosts(res.posts || []);
      } catch (err) {
        if (cancelled) return;
        console.warn("Could not fetch Wall posts from backend, using default feed", err);
        setWallPosts([]);
      } finally {
        if (!cancelled) setLoadingWall(false);
      }
    }

    loadWall();
    return () => {
      cancelled = true;
    };
  }, [projectId, activeTab]);

  // Derive effective user count and posts with synchronized reach denominators without cascading effects
  const effectiveUserCount = userCount > 0 ? userCount : 36;
  const displayedPosts = useMemo(() => {
    return wallPosts.map((p) => ({
      ...p,
      totalUsers: p.totalUsers > 0 ? p.totalUsers : effectiveUserCount,
    }));
  }, [wallPosts, effectiveUserCount]);

  // Transform projectUsers into UnseenUserRow format for modals
  const unseenUserRows: UnseenUserRow[] = useMemo(() => {
    if (!projectUsers.length) return [];
    return projectUsers.map((u) => ({
      id: u.id,
      name: u.name || "User",
      desig: u.designation || u.role || "Promoter",
      role: u.role || u.designation || "Promoter",
      store: (u.udfs && typeof u.udfs.store === "string" ? u.udfs.store : "") || "Default Store",
      location: (u.udfs && typeof u.udfs.location === "string" ? u.udfs.location : "") || "",
      email: u.email,
      phone: u.mobile,
      hasDemoPhone: false,
    }));
  }, [projectUsers]);

  // Handlers for Wall Posts (Dynamic CRUD)
  async function handleDeletePost(postId: string) {
    try {
      await connectWallService.deletePost(postId, projectId);
    } catch (err) {
      console.warn("Server delete post failed, removing locally", err);
    } finally {
      setWallPosts((prev) => prev.filter((p) => p.id !== postId));
    }
  }

  async function handleCreatePost(payload: string | WallPostFormValues) {
    let content = "";
    let mediaType: "NONE" | "IMAGES" | "VIDEO" = "NONE";
    let images: WallImageMetadata[] | undefined = undefined;
    let video: WallVideoMetadata | null | undefined = undefined;

    if (typeof payload === "string") {
      content = payload;
      mediaType = "NONE";
    } else {
      content = payload.text;
      mediaType = payload.mediaType;
      if (payload.mediaType === "IMAGES" && payload.images && payload.images.length > 0) {
        images = payload.images;
      } else if (payload.mediaType === "VIDEO" && payload.video) {
        video = payload.video;
      }
    }

    try {
      const created = await connectWallService.createPost({
        text: content,
        mediaType,
        images,
        video,
        authorDisplayName: "Program Team",
        projectId,
      });

      created.totalUsers = userCount;
      setWallPosts((prev) => [created, ...prev]);
    } catch (err) {
      console.warn("Backend Wall post creation failed, falling back to local creation", err);
    } finally {
      setShowNewPostModal(false);
    }
  }

  return (
    <div className="w-full pb-12 font-sans text-slate-800">
      {/* Informational Banner when Connect is Off */}
      {!settings.connect && activeTab !== "settings" && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold">Connect is off for this project.</div>
              <div className="text-xs text-amber-800 mt-0.5">
                Field users don&apos;t see the Connect tab in the app. All posts, rooms, and messages are kept safe and will reappear when switched back on.
              </div>
            </div>
          </div>
          <Link
            href={`${base}/connect/setting`}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shrink-0 transition-colors flex items-center gap-1"
          >
            <SlidersHorizontal size={12} />
            <span>Settings</span>
          </Link>
        </div>
      )}

      {/* Banner when Wall is disabled */}
      {settings.connect && !settings.wall && activeTab === "wall" && (
        <div className="mb-6 p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-slate-500" />
            <span>
              <strong>Wall is disabled in Settings.</strong> Field users cannot see the Wall section. Existing posts are kept.
            </span>
          </div>
          <Link
            href={`${base}/connect/setting`}
            className="text-blue-600 hover:underline font-bold"
          >
            Turn on in Settings
          </Link>
        </div>
      )}

      {/* Banner when Chat Rooms is disabled */}
      {settings.connect && !settings.rooms && activeTab === "chat" && (
        <div className="mb-6 p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-slate-500" />
            <span>
              <strong>Chat Rooms are disabled in Settings.</strong> Field users cannot see Chat Rooms. Existing rooms and messages are kept.
            </span>
          </div>
          <Link
            href={`${base}/connect/setting`}
            className="text-blue-600 hover:underline font-bold"
          >
            Turn on in Settings
          </Link>
        </div>
      )}

      {/* TAB 1: WALL */}
      {activeTab === "wall" && (
        <WallTab
          posts={displayedPosts}
          userCount={effectiveUserCount}
          wallEnabled={settings.wall}
          projectName={effectiveProjectName}
          isLoading={loadingWall}
          error={wallError}
          unseenUsers={unseenUserRows}
          onCreatePost={handleCreatePost}
          onDeletePost={handleDeletePost}
        />
      )}

      {/* TAB 2: CHAT ROOMS */}
      {activeTab === "chat" && (
        <ChatRoomsTab
          projectId={projectId}
          roomsEnabled={settings.rooms}
          eligibleUsers={projectUsers}
        />
      )}

      {/* TAB 3: SETTINGS */}
      {activeTab === "settings" && (
        <SettingsTab
          projectName={effectiveProjectName}
          connectEnabled={settings.connect}
          wallEnabled={settings.wall}
          chatRoomsEnabled={settings.rooms}
          onToggleConnect={toggleConnect}
          onToggleWall={toggleWall}
          onToggleChatRooms={toggleChatRooms}
          savingConnect={savingSettings}
          settingsError={settingsError}
          auditHistory={auditHistory}
        />
      )}

      {/* MODALS */}
      <NewPostModal
        isOpen={showNewPostModal}
        onClose={() => setShowNewPostModal(false)}
        onSubmit={handleCreatePost}
        projectName={effectiveProjectName}
        userCount={userCount}
      />
    </div>
  );
}

export default ConnectPage;
