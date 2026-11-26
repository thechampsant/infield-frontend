import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiClient } from "./api-client";
import {
  CONNECT_SOCKET_EVENTS,
  normalizeSocketMessage,
  getSocketOrigin,
  connectSocketClient,
} from "./connect-socket-client";

// Mock socket.io-client
const mockSocket = {
  connected: false,
  connect: vi.fn(function () {
    mockSocket.connected = true;
    return mockSocket;
  }),
  disconnect: vi.fn(function () {
    mockSocket.connected = false;
    return mockSocket;
  }),
  emit: vi.fn(),
  on: vi.fn(),
};

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => mockSocket),
}));

describe("Connect Socket Client Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.setAccessToken("test-jwt-token");
    mockSocket.connected = false;
    connectSocketClient.disconnect();
  });

  afterEach(() => {
    connectSocketClient.disconnect();
    apiClient.clearAccessToken();
  });

  describe("Socket origin resolution", () => {
    it("returns default services.infield.co.in when no env variable is set", () => {
      const origin = getSocketOrigin();
      expect(origin).toBe("https://services.infield.co.in");
    });
  });

  describe("normalizeSocketMessage", () => {
    it("normalizes admin message correctly", () => {
      const normalized = normalizeSocketMessage({
        messageId: "msg-123",
        roomId: "room-abc",
        senderType: "ADMIN",
        senderDisplayName: "Program Team",
        text: "Please confirm campaign status.",
        sentAt: "2026-11-04T09:00:00.000Z",
      });

      expect(normalized.id).toBe("msg-123");
      expect(normalized.senderName).toBe("Program Team");
      expect(normalized.content).toBe("Please confirm campaign status.");
      expect(normalized.initials).toBe("PT");
      expect(normalized.isSystem).toBe(false);
    });

    it("normalizes removed messages with placeholder", () => {
      const normalized = normalizeSocketMessage({
        messageId: "msg-456",
        roomId: "room-abc",
        senderType: "USER",
        senderDisplayName: "Ritika Shah",
        text: "Hidden text",
        isRemoved: true,
      });

      expect(normalized.content).toBe("Removed by admin");
      expect(normalized.initials).toBe("RS");
    });

    it("normalizes system message correctly", () => {
      const normalized = normalizeSocketMessage({
        messageId: "msg-789",
        roomId: "room-abc",
        isSystem: true,
        text: "Ritika Shah joined the room",
      });

      expect(normalized.isSystem).toBe(true);
      expect(normalized.content).toBe("Ritika Shah joined the room");
    });
  });

  describe("Socket Lifecycle & Client Actions", () => {
    it("joins room and leaves room properly", async () => {
      mockSocket.emit.mockImplementation((event, payload, ack) => {
        if (event === CONNECT_SOCKET_EVENTS.ROOM_JOIN && typeof ack === "function") {
          ack({ event: "room:joined", data: { roomId: payload.roomId } });
        }
      });

      const joined = await connectSocketClient.joinRoom("room-xyz");
      expect(joined).toBe(true);
      expect(mockSocket.emit).toHaveBeenCalledWith(
        CONNECT_SOCKET_EVENTS.ROOM_JOIN,
        { roomId: "room-xyz" },
        expect.any(Function),
      );

      connectSocketClient.leaveRoom("room-xyz");
      expect(mockSocket.emit).toHaveBeenCalledWith(
        CONNECT_SOCKET_EVENTS.ROOM_LEAVE,
        { roomId: "room-xyz" },
      );
    });

    it("emits room:read with lastReadMessageId", () => {
      mockSocket.connected = true;
      connectSocketClient.markRoomRead("room-123", "msg-last");

      expect(mockSocket.emit).toHaveBeenCalledWith(
        CONNECT_SOCKET_EVENTS.ROOM_READ,
        { roomId: "room-123", lastReadMessageId: "msg-last" },
      );
    });

    it("dispatches typed message:new to subscribed listeners", () => {
      const listener = vi.fn();
      const unsub = connectSocketClient.on(CONNECT_SOCKET_EVENTS.MESSAGE_NEW, listener);

      // Find the internal registered handler for message:new
      const onCall = mockSocket.on.mock.calls.find(
        (call) => call[0] === CONNECT_SOCKET_EVENTS.MESSAGE_NEW,
      );
      expect(onCall).toBeDefined();

      const internalHandler = onCall![1];
      const payload = {
        messageId: "m1",
        roomId: "r1",
        text: "Live test",
      };

      internalHandler(payload);
      expect(listener).toHaveBeenCalledWith(payload);

      unsub();
    });

    it("dispatches real-time badge events for connect, wall, and room", () => {
      const connectListener = vi.fn();
      const wallListener = vi.fn();
      const roomListener = vi.fn();

      const unsubConnect = connectSocketClient.on(CONNECT_SOCKET_EVENTS.CONNECT_BADGE_UPDATE, connectListener);
      const unsubWall = connectSocketClient.on(CONNECT_SOCKET_EVENTS.WALL_BADGE_UPDATE, wallListener);
      const unsubRoom = connectSocketClient.on(CONNECT_SOCKET_EVENTS.ROOM_BADGE_UPDATE, roomListener);

      const connectCall = mockSocket.on.mock.calls.find(
        (call) => call[0] === CONNECT_SOCKET_EVENTS.CONNECT_BADGE_UPDATE,
      );
      const wallCall = mockSocket.on.mock.calls.find(
        (call) => call[0] === CONNECT_SOCKET_EVENTS.WALL_BADGE_UPDATE,
      );
      const roomCall = mockSocket.on.mock.calls.find(
        (call) => call[0] === CONNECT_SOCKET_EVENTS.ROOM_BADGE_UPDATE,
      );

      expect(connectCall).toBeDefined();
      expect(wallCall).toBeDefined();
      expect(roomCall).toBeDefined();

      connectCall![1]({ connectCount: 5, wallUnseenCount: 2, roomUnreadCount: 3 });
      expect(connectListener).toHaveBeenCalledWith({ connectCount: 5, wallUnseenCount: 2, roomUnreadCount: 3 });

      wallCall![1]({ wallUnseenCount: 2, hasUnseenWallPosts: true });
      expect(wallListener).toHaveBeenCalledWith({ wallUnseenCount: 2, hasUnseenWallPosts: true });

      roomCall![1]({ roomUnreadCount: 3 });
      expect(roomListener).toHaveBeenCalledWith({ roomUnreadCount: 3 });

      unsubConnect();
      unsubWall();
      unsubRoom();
    });
  });
});
