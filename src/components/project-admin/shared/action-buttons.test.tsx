import { Children, type ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/api-client";
import { reactivateProjectUser } from "@/lib/project-admin/user-reactivation";
import { ActionButtons } from "./action-buttons";

function reactivationAction(
  onReactivate: () => Promise<void | boolean>,
  onRefresh: () => void,
) {
  const buttons = ActionButtons({
    status: "inactive",
    entityType: "users",
    entityId: "inactive-user",
    projectId: "project-1",
    onEdit: vi.fn(),
    onAudit: vi.fn(),
    onRefresh,
    onReactivate,
  });
  const button = Children.toArray(buttons.props.children).find(
    (child) => (child as ReactElement<{ title: string }>).props.title === "Re-activate",
  ) as ReactElement<{ onClick: () => Promise<void> }>;
  return button.props.onClick;
}

describe("user reactivation", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("displays the contact conflict and skips refresh for the backend's 409 payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json(
        {
          statusCode: 409,
          message: "User active in product",
          code: "USER_ACTIVE_IN_PRODUCT",
        },
        { status: 409 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const onConflict = vi.fn();
    const onRefresh = vi.fn();
    const reactivate = reactivationAction(
      () => reactivateProjectUser("inactive-user", onConflict),
      onRefresh,
    );

    await reactivate();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/users/inactive-user/restore"),
      expect.objectContaining({ method: "POST" }),
    );
    expect(onConflict).toHaveBeenCalledExactlyOnceWith(
      "Cannot reactivate this user because their email or phone number is already used by another active user.",
    );
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it.each([
    [409, "OTHER_CONFLICT"],
    [409, undefined],
    [400, "USER_ACTIVE_IN_PRODUCT"],
    [500, "USER_ACTIVE_IN_PRODUCT"],
  ])("preserves other API errors (HTTP %s, code %s)", async (status, code) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({ message: "Original backend error", code }, { status }),
      ),
    );
    const onConflict = vi.fn();
    const onRefresh = vi.fn();
    const reactivate = reactivationAction(
      () => reactivateProjectUser("inactive-user", onConflict),
      onRefresh,
    );

    await expect(reactivate()).rejects.toMatchObject({
      name: "ApiError",
      status,
      message: "Original backend error",
    });
    expect(onConflict).not.toHaveBeenCalled();
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("preserves network errors unchanged", async () => {
    const error = new TypeError("Failed to fetch");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(error));
    const onConflict = vi.fn();

    await expect(reactivateProjectUser("inactive-user", onConflict)).rejects.toBe(error);
    expect(onConflict).not.toHaveBeenCalled();
  });

  it("refreshes the table after a successful user restore", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    const onConflict = vi.fn();
    const onRefresh = vi.fn();

    await reactivationAction(
      () => reactivateProjectUser("inactive-user", onConflict),
      onRefresh,
    )();

    expect(onConflict).not.toHaveBeenCalled();
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it("keeps refreshing for existing callbacks that return void", async () => {
    const onRefresh = vi.fn();
    await reactivationAction(async () => {}, onRefresh)();
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it("also handles a conflict exposed through ApiError.errorCode", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(
      new ApiError(409, "USER_ACTIVE_IN_PRODUCT"),
    ));
    const onConflict = vi.fn();

    await expect(reactivateProjectUser("inactive-user", onConflict)).resolves.toBe(false);
    expect(onConflict).toHaveBeenCalledOnce();
  });
});
