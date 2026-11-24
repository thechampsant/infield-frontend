import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  usePathname: () => "/project-admin/acc/prj/connect/room",
  useParams: () => ({ accountCode: "acc", projectCode: "prj", roomId: "room-123" }),
}));

vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({ user: { name: "Admin Connect", email: "admin@example.com" } }),
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

    it("deduplicates rooms sharing the same id without key collision warnings", () => {
      const duplicateRoom = { ...MOCK_ROOM };
      const html = renderToStaticMarkup(
        <ChatRoomsTab
          rooms={[MOCK_ROOM, duplicateRoom]}
          roomsEnabled={true}
        />,
      );

      const occurrences = (html.match(/Mumbai Squad/g) || []).length;
      expect(occurrences).toBe(1);
    });

    it("renders unread badge when a room has unread messages", () => {
      const roomWithUnread = { ...MOCK_ROOM, unreadCount: 2 };
      const html = renderToStaticMarkup(
        <ChatRoomsTab
          rooms={[roomWithUnread]}
          roomsEnabled={true}
        />,
      );

      expect(html).toContain("2 new");
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

    it("renders 'Add rule' and 'Add members' at the header when room has no rule", () => {
      const html = renderToStaticMarkup(
        <RoomDetail
          room={{ ...MOCK_ROOM, membershipType: "fixed" }}
          onBack={vi.fn()}
          messages={MOCK_MESSAGES}
          members={MOCK_MEMBERS}
          onSendMessage={vi.fn()}
          onDeleteMessage={vi.fn()}
          onAddMember={vi.fn()}
          onRemoveMember={vi.fn()}
          onRenameRoom={vi.fn()}
          onDeleteRoom={vi.fn()}
          onEditRule={vi.fn()}
          initialSubTab="members"
        />,
      );

      expect(html).toContain("Add rule");
      expect(html).toContain("Add members");
      expect(html).not.toContain("Edit rule");
      expect(html).not.toContain("Add by hand");
      expect(html).not.toContain("Membership rule");
    });

    it("renders 'Edit rule' and 'Add by hand' at the same header when room follows a rule", () => {
      const html = renderToStaticMarkup(
        <RoomDetail
          room={{ ...MOCK_ROOM, membershipType: "rule" }}
          onBack={vi.fn()}
          messages={MOCK_MESSAGES}
          members={MOCK_MEMBERS}
          onSendMessage={vi.fn()}
          onDeleteMessage={vi.fn()}
          onAddMember={vi.fn()}
          onRemoveMember={vi.fn()}
          onRenameRoom={vi.fn()}
          onDeleteRoom={vi.fn()}
          onEditRule={vi.fn()}
          membershipRule={{
            filters: [{ source: "designation", fieldKey: "role", values: ["Promoter"] }],
            reportingManagerIds: [],
            reportingScope: "direct",
            includeReportingManagers: false,
            addedByHandUserIds: [],
            keptOutByHandUserIds: [],
          }}
          initialSubTab="members"
        />,
      );

      expect(html).toContain("Edit rule");
      expect(html).toContain("Add by hand");
      expect(html).not.toContain("Add rule");
      expect(html).not.toContain("Add members");
      expect(html).toContain("Membership rule");
      expect(html).toContain("Promoter");
    });

    it("deduplicates messages sharing the same id without key collision warnings", () => {
      const duplicateMsg: RoomMessage = {
        id: "6b0407ebf792f213c4514f77",
        senderName: "Program Team",
        timestamp: "10:30 AM",
        content: "Testing deduplication",
        initials: "PT",
      };

      const html = renderToStaticMarkup(
        <RoomDetail
          room={MOCK_ROOM}
          onBack={vi.fn()}
          messages={[duplicateMsg, { ...duplicateMsg }]}
          members={MOCK_MEMBERS}
          onSendMessage={vi.fn()}
          onDeleteMessage={vi.fn()}
          onAddMember={vi.fn()}
          onRemoveMember={vi.fn()}
          onRenameRoom={vi.fn()}
          onDeleteRoom={vi.fn()}
          initialSubTab="messages"
        />,
      );

      const occurrences = (html.match(/Testing deduplication/g) || []).length;
      expect(occurrences).toBe(1);
    });

    it("renders toast notification when member added, removed, or allowed back", () => {
      const htmlAdded = renderToStaticMarkup(
        <RoomDetail
          room={MOCK_ROOM}
          onBack={vi.fn()}
          messages={MOCK_MESSAGES}
          members={MOCK_MEMBERS}
          onSendMessage={vi.fn()}
          onDeleteMessage={vi.fn()}
          onAddMember={vi.fn()}
          onRemoveMember={vi.fn()}
          onRenameRoom={vi.fn()}
          onDeleteRoom={vi.fn()}
          toast={{ message: `1 member added to ${MOCK_ROOM.name}`, type: "success" }}
        />,
      );
      expect(htmlAdded).toContain("if2-toast success center");
      expect(htmlAdded).toContain(`1 member added to ${MOCK_ROOM.name}`);

      const htmlRemoved = renderToStaticMarkup(
        <RoomDetail
          room={MOCK_ROOM}
          onBack={vi.fn()}
          messages={MOCK_MESSAGES}
          members={MOCK_MEMBERS}
          onSendMessage={vi.fn()}
          onDeleteMessage={vi.fn()}
          onAddMember={vi.fn()}
          onRemoveMember={vi.fn()}
          onRenameRoom={vi.fn()}
          onDeleteRoom={vi.fn()}
          toast={{ message: `Ritika Shah removed from ${MOCK_ROOM.name}`, type: "success" }}
        />,
      );
      expect(htmlRemoved).toContain("if2-toast success center");
      expect(htmlRemoved).toContain(`Ritika Shah removed from ${MOCK_ROOM.name}`);

      const htmlAllowedBack = renderToStaticMarkup(
        <RoomDetail
          room={MOCK_ROOM}
          onBack={vi.fn()}
          messages={MOCK_MESSAGES}
          members={MOCK_MEMBERS}
          onSendMessage={vi.fn()}
          onDeleteMessage={vi.fn()}
          onAddMember={vi.fn()}
          onRemoveMember={vi.fn()}
          onRenameRoom={vi.fn()}
          onDeleteRoom={vi.fn()}
          toast={{ message: `Imran Shaikh allowed back · rule rooms updated: ${MOCK_ROOM.name} (+1)`, type: "success" }}
        />,
      );
      expect(htmlAllowedBack).toContain("if2-toast success center");
      expect(htmlAllowedBack).toContain(`Imran Shaikh allowed back · rule rooms updated: ${MOCK_ROOM.name} (+1)`);
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
