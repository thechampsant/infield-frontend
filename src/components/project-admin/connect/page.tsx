"use client";

import React, { useState } from "react";
import { useProjectContext } from "@/lib/project-admin/project-context";
import { useConnectModuleEnabled } from "@/hooks/use-connect-module-enabled";
import { featureConfigService } from "@/lib/api/feature-config-service";
import { formatApiError } from "@/lib/api";
import type {
  WallPost,
  ChatRoom,
  RoomMember,
  RoomMessage,
  ConnectTab,
} from "./types";
import {
  INITIAL_WALL_POSTS,
  INITIAL_ROOMS,
  INITIAL_MEMBERS,
  INITIAL_MESSAGES,
} from "./mock-data";
import { WallTab } from "./wall-tab";
import { ChatRoomsTab } from "./chat-rooms-tab";
import { RoomDetail } from "./room-detail";
import { SettingsTab } from "./settings-tab";
import { NewPostModal } from "./modals/new-post-modal";
import { CreateRoomModal } from "./modals/create-room-modal";
import { AddMemberModal } from "./modals/add-member-modal";
import { UnseenUsersModal } from "./modals/unseen-users-modal";

export function ConnectPage({ tab }: { tab: "wall" | "room" | "setting" }) {
  const { projectName, projectId } = useProjectContext();
  const effectiveProjectName = projectName || "Sample Retail Program";
  const userCount = 36;
  const activeTab: ConnectTab = tab === "room" ? "chat" : tab === "setting" ? "settings" : "wall";
  const connectEnabled = useConnectModuleEnabled(projectId);
  const [savingConnect, setSavingConnect] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Selected chat room (null means showing the room list)
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  // State for posts, rooms, members, messages
  const [wallPosts, setWallPosts] = useState<WallPost[]>(INITIAL_WALL_POSTS);
  const [rooms, setRooms] = useState<ChatRoom[]>(INITIAL_ROOMS);
  const [members, setMembers] = useState<RoomMember[]>(INITIAL_MEMBERS);
  const [messages, setMessages] = useState<RoomMessage[]>(INITIAL_MESSAGES);

  // Settings switches
  const [wallEnabled, setWallEnabled] = useState(true);
  const [chatRoomsEnabled, setChatRoomsEnabled] = useState(true);

  async function toggleConnect() {
    if (!projectId || savingConnect) return;
    setSavingConnect(true);
    setSettingsError(null);
    try {
      await featureConfigService.updateModuleStatus(projectId, "connect", !connectEnabled);
    } catch (error) {
      setSettingsError(formatApiError(error, "Unable to update Connect settings."));
    } finally {
      setSavingConnect(false);
    }
  }

  // Modal dialog states
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [viewUnseenPost, setViewUnseenPost] = useState<WallPost | null>(null);

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  // Handlers for Wall Posts
  function handleDeletePost(postId: string) {
    setWallPosts((prev) => prev.filter((p) => p.id !== postId));
  }

  function handleCreatePost(content: string) {
    const newPost: WallPost = {
      id: `post-${Date.now()}`,
      timestamp: "Just now",
      content,
      audience: "Everyone",
      seenCount: 0,
      totalUsers: userCount,
      likes: 0,
      claps: 0,
      celebrates: 0,
      usefuls: 0,
    };

    setWallPosts((prev) => [newPost, ...prev]);
    setShowNewPostModal(false);
  }

  // Handlers for Chat Rooms
  function handleCreateRoom(roomName: string) {
    const initials = roomName
      .split(/\s+/)
      .map((w) => w[0]?.toUpperCase() || "")
      .slice(0, 2)
      .join("") || "RM";

    const newRoom: ChatRoom = {
      id: `room-${Date.now()}`,
      initials,
      name: roomName,
      memberCount: 1,
      messageCount: 0,
      lastActivity: "Just now",
      tag: "Discussion",
    };

    setRooms((prev) => [newRoom, ...prev]);
    setShowCreateRoomModal(false);
    setSelectedRoomId(newRoom.id);
  }

  function handleDeleteRoom(roomId: string) {
    setRooms((prev) => prev.filter((r) => r.id !== roomId));
    setSelectedRoomId(null);
  }

  // Handlers for Messages inside a Room
  function handleSendMessage(content: string) {
    const newMsg: RoomMessage = {
      id: `msg-${Date.now()}`,
      senderName: "Program Team",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      content,
      initials: "PT",
    };

    setMessages((prev) => [...prev, newMsg]);

    if (selectedRoomId) {
      setRooms((prev) =>
        prev.map((r) =>
          r.id === selectedRoomId
            ? { ...r, messageCount: r.messageCount + 1, lastActivity: "Just now" }
            : r,
        ),
      );
    }
  }

  function handleDeleteMessage(msgId: string) {
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
    if (selectedRoomId) {
      setRooms((prev) =>
        prev.map((r) =>
          r.id === selectedRoomId
            ? { ...r, messageCount: Math.max(0, r.messageCount - 1) }
            : r,
        ),
      );
    }
  }

  // Handlers for Room Members
  function handleAddMember(name: string, location: string) {
    const initials = name
      .split(/\s+/)
      .map((w) => w[0]?.toUpperCase() || "")
      .slice(0, 2)
      .join("") || "MB";

    const newMem: RoomMember = {
      id: `mem-${Date.now()}`,
      initials,
      name,
      role: "Brand Ambassador",
      location: location || "Mumbai – Central",
      avatarColorClass: "bg-teal-700",
    };

    setMembers((prev) => [...prev, newMem]);
    setShowAddMemberModal(false);

    if (selectedRoomId) {
      setRooms((prev) =>
        prev.map((r) =>
          r.id === selectedRoomId ? { ...r, memberCount: r.memberCount + 1 } : r,
        ),
      );
    }
  }

  function handleRemoveMember(memberId: string) {
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    if (selectedRoomId) {
      setRooms((prev) =>
        prev.map((r) =>
          r.id === selectedRoomId
            ? { ...r, memberCount: Math.max(1, r.memberCount - 1) }
            : r,
        ),
      );
    }
  }

  return (
    <div className="w-full pb-12 font-sans text-slate-800">
      {/* TAB 1: WALL */}
      {activeTab === "wall" && (
        <WallTab
          posts={wallPosts}
          userCount={userCount}
          onNewPost={() => setShowNewPostModal(true)}
          onDeletePost={handleDeletePost}
          onViewUnseen={(post) => setViewUnseenPost(post)}
        />
      )}

      {/* TAB 2: CHAT ROOMS LIST */}
      {activeTab === "chat" && selectedRoomId === null && (
        <ChatRoomsTab
          rooms={rooms}
          onCreateRoom={() => setShowCreateRoomModal(true)}
          onSelectRoom={(roomId) => setSelectedRoomId(roomId)}
        />
      )}

      {/* TAB 2: SINGLE ROOM DETAIL VIEW */}
      {activeTab === "chat" && selectedRoomId !== null && selectedRoom && (
        <RoomDetail
          room={selectedRoom}
          onBack={() => setSelectedRoomId(null)}
          messages={messages}
          members={members}
          onSendMessage={handleSendMessage}
          onDeleteMessage={handleDeleteMessage}
          onAddMember={() => setShowAddMemberModal(true)}
          onRemoveMember={handleRemoveMember}
          onDeleteRoom={handleDeleteRoom}
        />
      )}

      {/* TAB 3: SETTINGS */}
      {activeTab === "settings" && (
        <SettingsTab
          projectName={effectiveProjectName}
          connectEnabled={connectEnabled}
          wallEnabled={wallEnabled}
          chatRoomsEnabled={chatRoomsEnabled}
          onToggleConnect={toggleConnect}
          onToggleWall={() => setWallEnabled(!wallEnabled)}
          onToggleChatRooms={() => setChatRoomsEnabled(!chatRoomsEnabled)}
          savingConnect={savingConnect}
          settingsError={settingsError}
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

      <CreateRoomModal
        isOpen={showCreateRoomModal}
        onClose={() => setShowCreateRoomModal(false)}
        onSubmit={handleCreateRoom}
      />

      <AddMemberModal
        isOpen={showAddMemberModal}
        onClose={() => setShowAddMemberModal(false)}
        onSubmit={handleAddMember}
      />

      <UnseenUsersModal
        post={viewUnseenPost}
        onClose={() => setViewUnseenPost(null)}
      />
    </div>
  );
}

export default ConnectPage;
