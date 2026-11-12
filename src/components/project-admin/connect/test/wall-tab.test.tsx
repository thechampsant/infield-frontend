import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { WallTab } from "../wall/wall-tab";
import { WallPostCard } from "../wall/wall-post-card";
import { WallUnseenModal } from "../modals/wall-unseen-modal";
import { WallDeleteModal } from "../modals/wall-delete-modal";
import type { WallPost } from "../types";
import { WallComposerModal } from "../modals/wall-composer-modal";

describe("WallTab Component Suite", () => {
  const defaultPosts: WallPost[] = [];
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

  it("renders WallUnseenModal with unseen user count, user details, and download button", () => {
    const testPost = defaultPosts[1]; // 28 seen of 36 => 8 unseen
    const html = renderToStaticMarkup(
      <WallUnseenModal
        post={testPost}
        onClose={vi.fn()}
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
});
