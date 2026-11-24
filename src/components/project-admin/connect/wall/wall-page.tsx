"use client";

import { useEffect, useMemo, useState } from "react";
import { useProjectContext } from "@/lib/project-admin/project-context";
import { useConnectPermission } from "@/hooks/use-connect-permission";
import { useConnectSettings } from "@/hooks/use-connect-settings";
import { connectWallService } from "@/lib/api/connect-wall-service";
import type { ProjectUser } from "@/types/project-admin";
import type { WallImageMetadata, WallPost, WallVideoMetadata } from "../types";
import { WallTab } from "./wall-tab";
import { ConnectStatusBanner } from "../connect-status-banner";
import { projectAdminBase } from "@/lib/nav/nav";
import { exportUnseenUsersToCsv, type UnseenUserRow } from "../utils";
import { WallPostFormValues } from "./wall-schema";
import { storeService, type StoreRecord } from "@/lib/api/store-service";

export function ConnectWallPage() {
  const { projectName, projectId, accountCode, projectCode } = useProjectContext();
  const { isAdmin, currentUserName } = useConnectPermission();
  const projectTitle = projectName || "Sample Retail Program";
  const settingsHref = `${projectAdminBase(accountCode, projectCode)}/connect/setting`;
  const { settings } = useConnectSettings(projectId, currentUserName);

  const [userCount, setUserCount] = useState(() => projectId ? 0 : 36);
  const [projectUsers, setProjectUsers] = useState<ProjectUser[]>([]);
  const [stores, setStores] = useState<StoreRecord[]>([]);
  const [posts, setPosts] = useState<WallPost[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(projectId));

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    storeService.listAllByProject(projectId).then((data) => {
      if (!cancelled) setStores(data || []);
    }).catch(() => {
      if (!cancelled) setStores([]);
    });
    return () => { cancelled = true; };
  }, [projectId]);

  const storeMap = useMemo(
    () => new Map(stores.map((s) => [s.backendId, s.storeName || s.storeCode])),
    [stores],
  );

  const managerByReporteeId = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of projectUsers) {
      if (Array.isArray(u.reporteeIds)) {
        for (const reporteeId of u.reporteeIds) {
          map.set(String(reporteeId), u.name);
        }
      }
    }
    return map;
  }, [projectUsers]);

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
    totalUsers: effectiveUserCount,
  })), [posts, effectiveUserCount]);

  const unseenUsers: UnseenUserRow[] = useMemo(() => projectUsers.map((projectUser) => {
    const rawStoreIds = Array.isArray(projectUser.udfs?.storeIds)
      ? (projectUser.udfs.storeIds as string[])
      : [];
    const resolvedStore = rawStoreIds.map((id) => storeMap.get(id)).filter(Boolean).join(", ")
      || (typeof projectUser.udfs?.storeName === "string" ? projectUser.udfs.storeName : "")
      || (typeof projectUser.udfs?.store === "string" && projectUser.udfs.store !== "Default Store" ? projectUser.udfs.store : "");

    const resolvedManager = managerByReporteeId.get(projectUser.backendId)
      || managerByReporteeId.get(projectUser.id)
      || (typeof projectUser.udfs?.reportingManager === "string" ? projectUser.udfs.reportingManager : "")
      || (typeof projectUser.udfs?.manager === "string" ? projectUser.udfs.manager : "");

    return {
      id: projectUser.id,
      backendId: projectUser.backendId,
      employeeCode: projectUser.id,
      name: projectUser.name || "User",
      desig: projectUser.designation || projectUser.role || "Promoter",
      role: projectUser.role || projectUser.designation || "Promoter",
      store: resolvedStore,
      reportingManager: resolvedManager,
      location: typeof projectUser.udfs?.location === "string" ? projectUser.udfs.location : resolvedStore,
      email: projectUser.email,
      phone: projectUser.mobile,
      hasDemoPhone: false,
    };
  }), [projectUsers, storeMap, managerByReporteeId]);

  async function handleDeletePost(postId: string) {
    if (!isAdmin) return;
    try {
      await connectWallService.deletePost(postId, projectId);
    } catch (error) {
      console.warn("Server delete post failed, removing locally", error);
    } finally {
      setPosts((current) => current.filter((post) => post.id !== postId));
    }
  }

  async function handleCreatePost(payload: string | WallPostFormValues) {
    if (!isAdmin) return;
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
      if (mediaType === "IMAGES" && images?.length) {
        const localImages = images.filter((image) => image.url.startsWith("blob:"));
        if (localImages.length) {
          const files = await Promise.all(localImages.map(async (image) => {
            const response = await fetch(image.url);
            if (!response.ok) throw new Error(`Could not read selected image ${image.name}`);
            const blob = await response.blob();
            return new File([blob], image.originalName || image.name, {
              type: blob.type || "application/octet-stream",
            });
          }));
          const uploadedImages = await connectWallService.uploadImages(files);
          let uploadIndex = 0;
          images = images.map((image) =>
            image.url.startsWith("blob:") ? uploadedImages[uploadIndex++] : image,
          );
        }
      }

      if (mediaType === "VIDEO" && video?.url.startsWith("blob:")) {
        const response = await fetch(video.url);
        if (!response.ok) throw new Error(`Could not read selected video ${video.originalName || video.title}`);
        const blob = await response.blob();
        const file = new File([blob], video.originalName || `${video.title}.mp4`, {
          type: blob.type || "video/mp4",
        });
        video = await connectWallService.uploadVideo(file, video.durationSeconds || 108);
      }

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
      throw error;
    }
  }

  async function handleViewUnseen(post: WallPost) {
    if (!isAdmin || !post.id) return;
    try {
      const reach = await connectWallService.getReach(post.id, projectId);
      if (reach) {
        setPosts((current) =>
          current.map((p) =>
            p.id === post.id
              ? {
                ...p,
                seenCount: reach.seenCount,
                totalUsers: reach.totalEligibleUsers > 0 ? reach.totalEligibleUsers : effectiveUserCount,
                likes: reach.reactions?.like ?? p.likes,
                claps: reach.reactions?.clap ?? p.claps,
                celebrates: reach.reactions?.celebrate ?? p.celebrates,
                usefuls: reach.reactions?.useful ?? p.usefuls,
              }
              : p,
          ),
        );
      }
    } catch (err) {
      console.warn("Could not fetch fresh post reach", err);
    }
  }

  async function handleDownloadUnseen(post: WallPost, users: UnseenUserRow[]) {
    if (!isAdmin) return;
    try {
      await connectWallService.downloadUnseenXlsx(post.id, projectId);
    } catch (err) {
      console.warn("Failed to download unseen xlsx from server, falling back to CSV export", err);
      exportUnseenUsersToCsv(post, users);
    }
  }

  return (
    <div className="w-full pb-12 font-sans text-slate-800">
      {isAdmin && <ConnectStatusBanner surface="wall" settings={settings} settingsHref={settingsHref} />}
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
        onViewUnseen={handleViewUnseen}
        onDownloadUnseen={handleDownloadUnseen}
        isAdmin={isAdmin}
      />
    </div>
  );
}
