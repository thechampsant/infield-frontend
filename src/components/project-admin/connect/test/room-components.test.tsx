import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  usePathname: () => "/project-admin/acc/prj/connect/room",
  useParams: () => ({ accountCode: "acc", projectCode: "prj", roomId: "room-123" }),
}));

import { CreateRoomModal } from "../modals/create-room-modal";
import { RoomSettingsTab } from "../room/room-settings-tab";
import { ChatRoomsTab } from "../room/chat-rooms-tab";
import { RoomDeleteModal } from "../modals/room-delete-modal";
import { RoomDetail } from "../room/room-detail";
import { RoomDetailPage } from "../room/room-detail-page";
import type { ChatRoom, RoomMember, RoomMessage } from "@/components/project-admin/connect/types";
import type { ProjectUser } from "@/types/project-admin";

const MOCK_USERS: ProjectUser[] = [
  {
    id: "u-1",
    name: "Ritika Shah",
    mobile: "+919876543210",
    email: "ritika@test.com",
    designation: "Promoter",
    role: "Promoter",
    doj: "2026-01-01",
    doe: "",
    status: "active",
    udfs: { store: "Croma Phoenix" },
    backendId: "b-1",
    reporteeIds: [],
  },
  {
    id: "u-2",
    name: "Imran Shaikh",
    mobile: "+919876543211",
    email: "imran@test.com",
    designation: "Promoter",
    role: "Promoter",
    doj: "2026-01-01",
    doe: "",
    status: "active",
    udfs: { store: "Reliance Digital" },
    backendId: "b-2",
    reporteeIds: [],
  },
];

const MOCK_ROOM: ChatRoom = {
  id: "room-123",
  initials: "MS",
  name: "Mumbai Squad",
  memberCount: 5,
  hasDemoPhone: true,
  messageCount: 3,
  lastActivity: "2:45 PM",
  tag: "Discussion",
};

const MOCK_MEMBERS: RoomMember[] = [
  {
    id: "mem-1",
    initials: "RS",
    name: "Ritika Shah",
    role: "Promoter",
    location: "Mumbai",
    avatarColorClass: "bg-blue-900",
  },
];

const MOCK_MESSAGES: RoomMessage[] = [
  {
    id: "msg-1",
    senderName: "Program Team",
    timestamp: "2:41 PM",
    content: "Welcome to the squad!",
    initials: "PT",
  },
];

describe("Room Components Suite", () => {
  describe("CreateRoomModal", () => {
    it("returns null when isOpen is false", () => {
      const html = renderToStaticMarkup(
        <CreateRoomModal
          isOpen={false}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          eligibleUsers={MOCK_USERS}
        />,
      );
      expect(html).toBe("");
    });

    it("renders modal structure, title, subtitle, and input fields when isOpen is true", () => {
      const html = renderToStaticMarkup(
        <CreateRoomModal
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          eligibleUsers={MOCK_USERS}
        />,
      );
      expect(html).toContain("Create chat room");
      expect(html).toContain("A discussion room: every member can message");
      expect(html).toContain("Room name");
      expect(html).toContain("Members");
      expect(html).toContain("Search by name, store or employee code");
      expect(html).toContain("Ritika Shah");
      expect(html).toContain("Imran Shaikh");
      expect(html).toContain("Members get a push and see the room in their Rooms tab");
      expect(html).toContain("Create room");
    });
  });

  describe("RoomSettingsTab", () => {
    it("renders room rename input with current room name and delete button", () => {
      const html = renderToStaticMarkup(
        <RoomSettingsTab
          room={MOCK_ROOM}
          onRenameRoom={vi.fn()}
          onDeleteRoom={vi.fn()}
        />,
      );

      expect(html).toContain("Room settings");
      expect(html).toContain("Update the name or delete this chat room.");
      expect(html).toContain("Room name");
      expect(html).toContain('value="Mumbai Squad"');
      expect(html).toContain("Save name");
      expect(html).toContain("Delete room");
    });
  });

  describe("RoomDeleteModal", () => {
    it("returns null when isOpen is false", () => {
      const html = renderToStaticMarkup(
        <RoomDeleteModal
          isOpen={false}
          room={MOCK_ROOM}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />,
      );
      expect(html).toBe("");
    });

    it("renders confirmation body and actions when isOpen is true", () => {
      const html = renderToStaticMarkup(
        <RoomDeleteModal
          isOpen={true}
          room={MOCK_ROOM}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />,
      );

      expect(html).toContain("Delete this room?");
      expect(html).toContain("All 5 members lose the room and its messages.");
      expect(html).toContain("Cancel");
      expect(html).toContain("Delete room");
    });
  });

  describe("ChatRoomsTab", () => {
    it("renders table of chat rooms with members and last activity", () => {
      const html = renderToStaticMarkup(
        <ChatRoomsTab
          rooms={[MOCK_ROOM]}
          roomsEnabled={true}
        />,
      );

      expect(html).toContain("Chat rooms");
      expect(html).toContain("Mumbai Squad");
      expect(html).toContain("MS");
      expect(html).toContain("5");
      expect(html).toContain("incl. demo phone");
      expect(html).toContain("3");
      expect(html).toContain("2:45 PM");
    });

    it("shows disabled notice and disables create room button when rooms are switched off", () => {
      const html = renderToStaticMarkup(
        <ChatRoomsTab
          rooms={[]}
          roomsEnabled={false}
        />,
      );

      expect(html).toContain("Chat rooms are switched off in Settings.");
      expect(html).toContain("disabled");
    });
  });

  describe("RoomDetail", () => {
    it("renders room header, badges, and sub-tabs", () => {
      const html = renderToStaticMarkup(
        <RoomDetail
          room={MOCK_ROOM}
          onBack={vi.fn()}
          messages={MOCK_MOCK_MESSAGES(MOCK_MESSAGES)}
          members={MOCK_MEMBERS}
          onSendMessage={vi.fn()}
          onDeleteMessage={vi.fn()}
          onAddMember={vi.fn()}
          onRemoveMember={vi.fn()}
          onRenameRoom={vi.fn()}
          onDeleteRoom={vi.fn()}
        />,
      );

      expect(html).toContain("All rooms");
      expect(html).toContain("Mumbai Squad");
      expect(html).toContain("5 members");
      expect(html).toContain("Discussion");
      expect(html).toContain("Messages");
      expect(html).toContain("Members");
      expect(html).toContain("Room settings");
      expect(html).toContain("Welcome to the squad!");
    });
  });

  describe("RoomDetailPage", () => {
    it("renders loading state initially during render", () => {
      const html = renderToStaticMarkup(<RoomDetailPage roomId="room-123" />);
      expect(html).toContain("Loading chat room...");
    });
  });
});

function MOCK_MOCK_MESSAGES(messages: RoomMessage[]): RoomMessage[] {
  return messages;
}
