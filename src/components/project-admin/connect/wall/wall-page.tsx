"use client";

import { useEffect, useMemo, useState } from "react";
import { useProjectContext } from "@/lib/project-admin/project-context";
import { useAuth } from "@/lib/auth/auth-context";
import { useConnectSettings } from "@/hooks/use-connect-settings";
import { connectWallService } from "@/lib/api/connect-wall-service";
import type { ProjectUser } from "@/types/project-admin";
import type { WallImageMetadata, WallPost, WallVideoMetadata } from "../types";
import { WallTab } from "./wall-tab";
import type { WallPostFormValues, UnseenUserRow } from ".";
import { ConnectStatusBanner } from "../connect-status-banner";
import { projectAdminBase } from "@/lib/nav/nav";

export function ConnectWallPage() {
  const { projectName, projectId, accountCode, projectCode } = useProjectContext();
  const { user } = useAuth();
  const currentUserName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Project Admin"
    : "Project Admin";
  const projectTitle = projectName || "Sample Retail Program";
  const settingsHref = `${projectAdminBase(accountCode, projectCode)}/connect/setting`;
  const { settings } = useConnectSettings(projectId, currentUserName);

  const [userCount, setUserCount] = useState(() => projectId ? 0 : 36);
  const [projectUsers, setProjectUsers] = useState<ProjectUser[]>([]);
  const [posts, setPosts] = useState<WallPost[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(projectId));

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    connectWallService.getActiveProjectUsers(projectId).then((result) => {
      if (cancelled) return;
      setUserCount(result.activeCount);
      setProjectUsers(result.data);
    }).catch((error) => {
      console.warn("Could not fetch project users for the Wall", error);
      if (!cancelled) setUserCount(36);
    });
    return () => { cancelled = true; };
  }, [projectId]);

  useEffect(() => {
    if (!projectId) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    connectWallService.listPosts({ projectId }).then((result) => {
      if (!cancelled) setPosts(result.posts || []);
    }).catch((error) => {
      console.warn("Could not fetch Wall posts", error);
      if (!cancelled) setPosts([]);
    }).finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [projectId]);

  const effectiveUserCount = userCount > 0 ? userCount : 36;
  const displayedPosts = useMemo(() => posts.map((post) => ({
    ...post,
    totalUsers: post.totalUsers > 0 ? post.totalUsers : effectiveUserCount,
  })), [posts, effectiveUserCount]);

  const unseenUsers: UnseenUserRow[] = useMemo(() => projectUsers.map((projectUser) => ({
    id: projectUser.id,
    name: projectUser.name || "User",
    desig: projectUser.designation || projectUser.role || "Promoter",
    role: projectUser.role || projectUser.designation || "Promoter",
    store: typeof projectUser.udfs?.store === "string" ? projectUser.udfs.store : "Default Store",
    location: typeof projectUser.udfs?.location === "string" ? projectUser.udfs.location : "",
    email: projectUser.email,
    phone: projectUser.mobile,
    hasDemoPhone: false,
  })), [projectUsers]);

  async function handleDeletePost(postId: string) {
    try {
      await connectWallService.deletePost(postId, projectId);
    } catch (error) {
      console.warn("Server delete post failed, removing locally", error);
    } finally {
      setPosts((current) => current.filter((post) => post.id !== postId));
    }
  }

  async function handleCreatePost(payload: string | WallPostFormValues) {
    let text = "";
    let mediaType: "NONE" | "IMAGES" | "VIDEO" = "NONE";
    let images: WallImageMetadata[] | undefined;
    let video: WallVideoMetadata | null | undefined;

    if (typeof payload === "string") {
      text = payload;
    } else {
      text = payload.text;
      mediaType = payload.mediaType;
      if (payload.mediaType === "IMAGES" && payload.images?.length) images = payload.images;
      if (payload.mediaType === "VIDEO" && payload.video) video = payload.video;
    }

    try {
      const created = await connectWallService.createPost({
        text,
        mediaType,
        images,
        video,
        authorDisplayName: "Program Team",
        projectId,
      });
      setPosts((current) => [{ ...created, totalUsers: effectiveUserCount }, ...current]);
    } catch (error) {
      console.warn("Backend Wall post creation failed", error);
    }
  }

  return (
    <div className="w-full pb-12 font-sans text-slate-800">
      <ConnectStatusBanner surface="wall" settings={settings} settingsHref={settingsHref} />
      <WallTab
        posts={displayedPosts}
        userCount={effectiveUserCount}
        wallEnabled={settings.wall}
        projectName={projectTitle}
        isLoading={isLoading}
        error={null}
        unseenUsers={unseenUsers}
        onCreatePost={handleCreatePost}
        onDeletePost={handleDeletePost}
      />
    </div>
  );
}
