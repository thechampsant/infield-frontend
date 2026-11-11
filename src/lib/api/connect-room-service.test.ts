import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  connectRoomService,
  formatRoomDate,
  getRoomInitials,
  normalizeChatRoom,
  ROOMS_BASE,
  ROOMS_BASE_CONFIG,
  setRoomContext,
  clearRoomContext,
  type ApiRoom,
} from "./connect-room-service";
import { apiClient } from "./api-client";

describe("connectRoomService Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    connectRoomService.clearCache();
    clearRoomContext();
  });

  it("ROOMS_BASE and ROOMS_BASE_CONFIG provide standard base and headers", () => {
    expect(ROOMS_BASE).toBe("/api/v1/connect/rooms");
    expect(ROOMS_BASE_CONFIG.url).toBe("/api/v1/connect/rooms");
  });

  it("getRoomInitials generates uppercase 2-letter initials", () => {
    expect(getRoomInitials("Mumbai South")).toBe("MS");
    expect(getRoomInitials("Hyderabad")).toBe("HY");
    expect(getRoomInitials("")).toBe("RM");
  });

  it("formatRoomDate handles empty or invalid dates gracefully", () => {
    expect(formatRoomDate(undefined)).toBe("Just now");
    expect(formatRoomDate("invalid-date-string")).toBe("Just now");
  });

  it("formatRoomDate formats today timestamp", () => {
    const today = new Date().toISOString();
    const formatted = formatRoomDate(today);
    expect(formatted).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)?/i);
  });

  it("normalizeChatRoom correctly maps ApiRoom to ChatRoom model", () => {
    const raw: ApiRoom = {
      roomId: "room-abc",
      name: "Bengaluru Promoters",
      memberCount: 8,
      lastMessage: {
        messageId: "msg-1",
        text: "Morning brief",
        sentAt: "2026-11-05T08:00:00.000Z",
      },
      lastMessageAt: "2026-11-05T08:00:00.000Z",
      messageCount: 5,
    };

    const normalized = normalizeChatRoom(raw);
    expect(normalized.id).toBe("room-abc");
    expect(normalized.name).toBe("Bengaluru Promoters");
    expect(normalized.initials).toBe("BP");
    expect(normalized.memberCount).toBe(8);
    expect(normalized.messageCount).toBe(5);
  });

  it("listRooms queries /api/v1/connect/rooms and caches the result", async () => {
    const mockRoomsResponse = {
      rooms: [
        {
          roomId: "room-1",
          name: "Test Room 1",
          memberCount: 3,
        },
      ],
    };

    const getSpy = vi.spyOn(apiClient, "get").mockResolvedValue(mockRoomsResponse);

    const res1 = await connectRoomService.listRooms("proj-1");
    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(res1.length).toBe(1);
    expect(res1[0].name).toBe("Test Room 1");

    // Second call should return cached result without hitting network
    const res2 = await connectRoomService.listRooms("proj-1");
    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(res2.length).toBe(1);
  });

  it("createRoom sends POST to /api/v1/connect/rooms and invalidates cache", async () => {
    const mockCreated: ApiRoom = {
      roomId: "room-new",
      name: "New Group",
      memberCount: 2,
    };

    const getSpy = vi.spyOn(apiClient, "get").mockResolvedValue({ rooms: [] });
    const postSpy = vi.spyOn(apiClient, "post").mockResolvedValue(mockCreated);

    await connectRoomService.listRooms("proj-1");
    expect(getSpy).toHaveBeenCalledTimes(1);

    const created = await connectRoomService.createRoom({
      name: "New Group",
      memberUserIds: ["u1", "u2"],
      projectId: "proj-1",
    });

    expect(postSpy).toHaveBeenCalledWith(
      "/api/v1/connect/rooms",
      {
        name: "New Group",
        memberUserIds: ["u1", "u2"],
        projectId: "proj-1",
      },
      expect.objectContaining({
        headers: expect.objectContaining({
          projectid: "proj-1",
        }),
      }),
    );
    expect(created.id).toBe("room-new");

    // After create, cache is invalidated so listRooms refetches
    await connectRoomService.listRooms("proj-1");
    expect(getSpy).toHaveBeenCalledTimes(2);
  });

  it("renameRoom sends PATCH to /api/v1/connect/rooms/:roomId and invalidates cache", async () => {
    const patchSpy = vi.spyOn(apiClient, "patch").mockResolvedValue({
      roomId: "room-123",
      name: "Renamed Room",
    });

    const result = await connectRoomService.renameRoom("room-123", "Renamed Room", "proj-1");

    expect(patchSpy).toHaveBeenCalledWith(
      "/api/v1/connect/rooms/room-123",
      {
        name: "Renamed Room",
      },
      expect.objectContaining({
        headers: expect.objectContaining({
          projectid: "proj-1",
        }),
      }),
    );
    expect(result.name).toBe("Renamed Room");
  });

  it("deleteRoom sends DELETE to /api/v1/connect/rooms/:roomId and invalidates cache", async () => {
    const deleteSpy = vi.spyOn(apiClient, "delete").mockResolvedValue({
      roomId: "room-del",
      deleted: true,
    });

    const success = await connectRoomService.deleteRoom("room-del", "proj-1");

    expect(deleteSpy).toHaveBeenCalledWith(
      "/api/v1/connect/rooms/room-del",
      expect.objectContaining({
        headers: expect.objectContaining({
          projectid: "proj-1",
        }),
      }),
    );
    expect(success).toBe(true);
  });

  it("getRoomDetails queries /api/v1/connect/rooms/:roomId", async () => {
    const mockDetail = {
      roomId: "room-dtl",
      name: "Detail Room",
      memberCount: 1,
      isLegalHold: false,
      members: [
        {
          userId: "u-1",
          name: "Ritika Shah",
          designation: "Promoter",
          employeeCode: "EMP-101",
        },
      ],
    };

    const getSpy = vi.spyOn(apiClient, "get").mockResolvedValue(mockDetail);

    const result = await connectRoomService.getRoomDetails("room-dtl");

    expect(getSpy).toHaveBeenCalledWith("/api/v1/connect/rooms/room-dtl", undefined);
    expect(result.roomId).toBe("room-dtl");
    expect(result.members.length).toBe(1);
    expect(result.members[0].name).toBe("Ritika Shah");
  });

  it("sendMessage sends POST to /api/v1/connect/rooms/:roomId/messages", async () => {
    const mockMsg = {
      messageId: "msg-99",
      roomId: "room-1",
      text: "Broadcast update",
      senderDisplayName: "Program Team",
      sentAt: new Date().toISOString(),
    };

    const postSpy = vi.spyOn(apiClient, "post").mockResolvedValue(mockMsg);

    const sent = await connectRoomService.sendMessage("room-1", "Broadcast update", "cid-1");

    expect(postSpy).toHaveBeenCalledWith(
      "/api/v1/connect/rooms/room-1/messages",
      {
        text: "Broadcast update",
        clientMessageId: "cid-1",
      },
      undefined,
    );
    expect(sent.id).toBe("msg-99");
    expect(sent.content).toBe("Broadcast update");
  });
});

