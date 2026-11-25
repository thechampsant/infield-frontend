import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { WallTab } from "../wall/wall-tab";
import { WallPostCard } from "../wall/wall-post-card";
import { WallUnseenModal } from "../modals/wall-unseen-modal";
import { WallDeleteModal } from "../modals/wall-delete-modal";
import type { WallPost } from "../types";
import { WallComposerModal } from "../modals/wall-composer-modal";
import {
  mapWallPostsWithFallbackTotal,
  resolveProjectUserEmployeeCode,
} from "../wall/wall-page";
import type { ProjectUser } from "@/types/project-admin";

describe("WallTab Component Suite", () => {
  const defaultPosts: WallPost[] = [
    {
      id: "post-1",
      timestamp: "Today, 2:40 PM",
      content: "hello all users",
      audience: "Everyone",
      seenCount: 1,
      totalUsers: 36,
      likes: 0,
      claps: 1,
      celebrates: 0,
      usefuls: 0,
    },
    {
      id: "post-2",
      timestamp: "Yesterday, 6:10 PM",
      content:
        "Trade-in documentation update. From 5 Nov, every trade-in needs the customer ID photo and the signed device declaration before the voucher is issued. Trade-ins missing either document will be rejected at audit. The one-page checklist is in the images below.",
      hasImages: true,
      imageCount: 2,
      audience: "Everyone",
      seenCount: 28,
      totalUsers: 36,
      likes: 6,
      claps: 0,
      celebrates: 0,
      usefuls: 12,
    },
    {
      id: "post-3",
      timestamp: "Yesterday, 11:30 AM",
      content:
        "The 2-minute demo flow our top stores use during peak hours. Watch it before your Saturday shift.",
      hasVideo: true,
      videoDuration: "2:14",
      audience: "Everyone",
      seenCount: 24,
      totalUsers: 36,
      likes: 14,
      claps: 6,
      celebrates: 2,
      usefuls: 9,
    },
  ];
  const userCount = 36;

  it("renders Wall subheader with total active user count and push notice", () => {
    const html = renderToStaticMarkup(
      <WallTab
        posts={defaultPosts}
        userCount={userCount}
        wallEnabled={true}
        onDeletePost={vi.fn()}
      />,
    );

    expect(html).toContain("Wall");
    expect(html).toContain(
      "Every post goes to all 36 active users in the project, with a push notification.",
    );
    expect(html).toContain("New post");
  });

  it("disables 'New post' button and shows warning banner when Wall is switched off", () => {
    const html = renderToStaticMarkup(
      <WallTab
        posts={defaultPosts}
        userCount={userCount}
        wallEnabled={false}
        onDeletePost={vi.fn()}
      />,
    );

    expect(html).toContain("The Wall is switched off in Settings. Existing posts are hidden from field users.");
    expect(html).toContain("disabled");
  });

  it("renders post card with content, timestamp, audience, and media metadata", () => {
    const postWithImages = defaultPosts.find((p) => p.hasImages)!;
    const postWithVideo = defaultPosts.find((p) => p.hasVideo)!;

    const htmlImages = renderToStaticMarkup(
      <WallPostCard post={postWithImages} onViewUnseen={vi.fn()} onDelete={vi.fn()} />,
    );
    expect(htmlImages).toContain("Trade-in documentation update");
    expect(htmlImages).toContain("2 images");
    expect(htmlImages).toContain("Everyone");
    expect(htmlImages).toContain("SEEN BY");
    expect(htmlImages).toContain("28");
    expect(htmlImages).toContain("of 36");
    expect(htmlImages).toContain("Not seen · 8");

    const htmlVideo = renderToStaticMarkup(
      <WallPostCard post={postWithVideo} onViewUnseen={vi.fn()} onDelete={vi.fn()} />,
    );
    expect(htmlVideo).toContain("The 2-minute demo flow");
    expect(htmlVideo).toContain("Video · 2:14");
    expect(htmlVideo).toContain("LIKE");
    expect(htmlVideo).toContain("CLAP");
    expect(htmlVideo).toContain("CELEBRATE");
    expect(htmlVideo).toContain("USEFUL");
  });

  it("renders empty state when posts list is empty", () => {
    const html = renderToStaticMarkup(
      <WallTab
        posts={[]}
        userCount={userCount}
        wallEnabled={true}
        onDeletePost={vi.fn()}
      />,
    );

    expect(html).toContain("No Wall posts yet");
    expect(html).toContain("Create an announcement to broadcast updates to the entire project.");
  });

  it("renders WallComposerModal with react-hook-form controls, media buttons and character limit", () => {
    const html = renderToStaticMarkup(
      <WallComposerModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        userCount={userCount}
      />,
    );

    expect(html).toContain("New Wall post");
    expect(html).toContain("Goes live at once for everyone active in the project");
    expect(html).toContain("Message");
    expect(html).toContain("0 / 2,000 characters");
    expect(html).toContain("Add image");
    expect(html).toContain("Add video");
    expect(html).toContain("Audience: <strong class=\"text-slate-800\">everyone</strong> · 36 active users in the project.");
    expect(html).toContain("Shown as Program Team · logged under your name");
    expect(html).toContain("Post to 36 users");
  });

  it("renders WallComposerModal in confirmation state when confirmation is toggled", () => {
    const html = renderToStaticMarkup(
      <WallComposerModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        userCount={userCount}
        initialConfirmation={true}
      />,
    );

    expect(html).toContain("A push goes to 36 persons now.");
    expect(html).toContain("It can&#x27;t be recalled or edited; a wrong post is deleted and posted again.");
    expect(html).toContain("Back");
    expect(html).toContain("Post now");
  });

  it("renders WallUnseenModal with unseen user count, user details, and download button", () => {
    const testPost = defaultPosts[1]; // 28 seen of 36 => 8 unseen
    const mockUnseen = [
      { id: "u-1", name: "Priya Venkatesh", desig: "Brand Ambassador", store: "Mumbai – Bandra" },
    ];
    const html = renderToStaticMarkup(
      <WallUnseenModal
        post={testPost}
        onClose={vi.fn()}
        unseenUsers={mockUnseen}
      />,
    );

    expect(html).toContain("Not seen · 8 of 36");
    expect(html).toContain("Seen = half the post on screen for one second");
    expect(html).toContain("Download list");
    expect(html).toContain("Priya Venkatesh");
    expect(html).toContain("PV");
  });

  it("renders WallDeleteModal with audit log warning and delete confirmation CTA", () => {
    const html = renderToStaticMarkup(
      <WallDeleteModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(html).toContain("Delete this post?");
    expect(html).toContain(
      "It disappears from the Wall for everyone. The deletion is recorded in the audit log.",
    );
    expect(html).toContain("Cancel");
    expect(html).toContain("Delete post");
  });

  it("disables 'New post' button when isAdmin is false", () => {
    const html = renderToStaticMarkup(
      <WallTab
        posts={defaultPosts}
        userCount={userCount}
        wallEnabled={true}
        isAdmin={false}
        onDeletePost={vi.fn()}
      />,
    );

    expect(html).toContain("Only project admins can publish posts to the Wall");
    expect(html).toContain("disabled");
  });

  it("disables 'Not seen' and 'Delete post' buttons on WallPostCard when isAdmin is false", () => {
    const post = defaultPosts[0];
    const html = renderToStaticMarkup(
      <WallPostCard
        post={post}
        onViewUnseen={vi.fn()}
        onDelete={vi.fn()}
        isAdmin={false}
      />,
    );

    expect(html).toContain("Only project admins can view unseen users");
    expect(html).toContain("Only project admins can delete posts");
  });

  it("preserves API totalUsers on posts and does not fall back to 36 when userCount is 0", () => {
    const posts: WallPost[] = [
      { ...defaultPosts[0], totalUsers: 50 },
      { ...defaultPosts[1], totalUsers: 0 },
    ];

    const mappedWhenUsersFailed = mapWallPostsWithFallbackTotal(posts, 0);
    expect(mappedWhenUsersFailed[0].totalUsers).toBe(50);
    expect(mappedWhenUsersFailed[1].totalUsers).toBe(0);

    const mappedWithFetchedCount = mapWallPostsWithFallbackTotal(posts, 14);
    expect(mappedWithFetchedCount[0].totalUsers).toBe(50);
    expect(mappedWithFetchedCount[1].totalUsers).toBe(14);
  });

  it("maps employeeCode from employee-code fields and avoids falling back to backendId-backed projectUser.id", () => {
    const baseUser: ProjectUser = {
      id: "65f1a2b3c4d5e6f7a8b9c0d1",
      backendId: "65f1a2b3c4d5e6f7a8b9c0d1",
      name: "Asha Rao",
      mobile: "9999999999",
      email: "asha@example.com",
      designation: "Promoter",
      role: "Promoter",
      doj: "2026-01-01",
      doe: "",
      status: "active",
      udfs: {},
      reporteeIds: [],
    };

    expect(resolveProjectUserEmployeeCode(baseUser)).toBe("");

    expect(
      resolveProjectUserEmployeeCode({
        ...baseUser,
        udfs: { "employee-code": "EMP-778" },
      }),
    ).toBe("EMP-778");

    expect(
      resolveProjectUserEmployeeCode({
        ...baseUser,
        employeeCode: "EMP-901",
      }),
    ).toBe("EMP-901");
  });
});
