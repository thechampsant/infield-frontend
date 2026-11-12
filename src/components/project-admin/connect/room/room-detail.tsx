"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ChevronLeft,
  Plus,
  Trash2,
  Send,
  UserMinus,
  Loader2,
} from "lucide-react";
import type { ChatRoom, RoomMember, RoomMessage, RoomSubTab } from "@/components/project-admin/connect/types";
import { RoomSettingsTab } from "./room-settings-tab";
import { plural } from "./room-service";

export interface RoomDetailProps {
  room: ChatRoom;
  onBack: () => void;
  messages: RoomMessage[];
  members: RoomMember[];
  onSendMessage: (content: string) => void | Promise<void>;
  onDeleteMessage: (msgId: string) => void | Promise<void>;
  onAddMember: () => void;
  onRemoveMember: (memberId: string) => void | Promise<void>;
  onSimulateExit?: (memberId: string) => void | Promise<void>;
  onRenameRoom: (name: string) => void | Promise<void>;
  onDeleteRoom: (roomId: string) => void | Promise<void>;
}

export function RoomDetail({
  room,
  onBack,
  messages,
  members,
  onSendMessage,
  onDeleteMessage,
  onAddMember,
  onRemoveMember,
  onSimulateExit,
  onRenameRoom,
  onDeleteRoom,
}: RoomDetailProps) {
  const [roomSubTab, setRoomSubTab] = useState<RoomSubTab>("messages");
  const [inputMessage, setInputMessage] = useState("");
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const [memberActionError, setMemberActionError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = inputMessage.trim();
    if (!trimmed) return;
    setInputMessage("");
    await onSendMessage(trimmed);
  }

  async function runMemberAction(memberId: string, action: () => void | Promise<void>) {
    setBusyMemberId(memberId);
    setMemberActionError(null);
    try {
      await action();
    } catch (error) {
      setMemberActionError(error instanceof Error ? error.message : "Could not update this room member.");
    } finally {
      setBusyMemberId(null);
    }
  }

  return (
    <div>
      {/* Back to all rooms link */}
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:underline cursor-pointer mb-3"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>All rooms</span>
      </button>

      {/* Room Title and Badges */}
      <div className="mb-4">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          {room.name}
        </h2>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2.5 py-0.5">
            {room.tag || "Discussion"}
          </span>
          <span className="text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 rounded-full px-2.5 py-0.5">
            {plural(room.memberCount, "member")}
          </span>
        </div>
      </div>

      {/* Room Sub-tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 mb-6">
        <nav className="flex items-center gap-2" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={roomSubTab === "messages"}
            onClick={() => setRoomSubTab("messages")}
            className={`connect-subtab-item ${
              roomSubTab === "messages" ? "connect-subtab-item--active" : ""
            }`}
          >
            Messages
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={roomSubTab === "members"}
            onClick={() => setRoomSubTab("members")}
            className={`connect-subtab-item ${
              roomSubTab === "members" ? "connect-subtab-item--active" : ""
            }`}
          >
            Members
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={roomSubTab === "room-settings"}
            onClick={() => setRoomSubTab("room-settings")}
            className={`connect-subtab-item ${
              roomSubTab === "room-settings" ? "connect-subtab-item--active" : ""
            }`}
          >
            Room settings
          </button>
        </nav>
      </div>

      {/* Sub-tab 1: Messages in Room */}
      {roomSubTab === "messages" && (
        <div className="border border-slate-200 rounded-xl bg-white shadow-xs p-6 flex flex-col justify-between min-h-[460px]">
          <div>
            {/* System event notice */}
            <div className="text-center my-3">
              <span className="inline-block text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-3.5 py-1">
                Program Team created this room and added {room.memberCount} members · {room.lastActivity}
              </span>
            </div>

            {/* Message items */}
            <div className="space-y-4 mt-6">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className="flex items-start justify-between group hover:bg-slate-50/50 p-2 rounded-lg transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                      {msg.initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">
                          {msg.senderName}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {msg.timestamp}
                        </span>
                      </div>
                      <div className={`text-sm mt-1 ${msg.content === "Removed by admin" ? "text-slate-400 italic" : "text-slate-800"}`}>
                        {msg.content}
                      </div>
                    </div>
                  </div>

                  {msg.content !== "Removed by admin" && (
                    <button
                      type="button"
                      onClick={() => onDeleteMessage(msg.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 transition-opacity p-1 cursor-pointer"
                      title="Delete message for everyone"
                      aria-label="Delete message for everyone"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Form */}
          <form onSubmit={handleSend} className="mt-8 pt-4 border-t border-slate-100 flex items-center gap-2">
            <input
              type="text"
              maxLength={2000}
              placeholder={`Message ${room.name} as Program Team`}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-hidden focus:border-blue-500 transition-colors"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      )}

      {/* Sub-tab 2: Members in Room */}
      {roomSubTab === "members" && (
        <div className="border border-slate-200 rounded-xl bg-white shadow-xs overflow-hidden">
          <div className="p-4 flex items-center justify-between border-b border-slate-100 flex-wrap gap-2">
            <p className="text-xs text-slate-500 font-medium">
              Program Team manages every room. Members see messages from the day they join.
            </p>
            <button
              type="button"
              onClick={onAddMember}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add members</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {memberActionError && <p role="alert" className="px-5 py-3 text-xs font-medium text-red-600">{memberActionError}</p>}
            {members.map((member) => (
              <div
                key={member.id}
                className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-full ${member.avatarColorClass} text-white font-bold text-xs flex items-center justify-center flex-shrink-0`}
                  >
                    {member.initials}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">
                        {member.name}
                      </span>
                      {member.hasDemoPhone && (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                          Demo phone
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {member.role} · {member.location}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => runMemberAction(member.id, () => onRemoveMember(member.id))}
                    disabled={busyMemberId !== null || room.memberCount <= 2}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {busyMemberId === member.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Remove
                  </button>

                  <button
                    type="button"
                    onClick={() => runMemberAction(member.id, () => onSimulateExit?.(member.id))}
                    disabled={busyMemberId !== null}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50/40 hover:bg-red-50 border border-red-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Simulates deactivation in the Users master"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                    <span>Simulate exit</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-tab 3: Room Settings */}
      {roomSubTab === "room-settings" && (
        <RoomSettingsTab
          room={room}
          onRenameRoom={onRenameRoom}
          onDeleteRoom={onDeleteRoom}
        />
      )}
    </div>
  );
}

