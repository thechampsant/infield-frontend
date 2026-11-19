"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ChevronLeft,
  Plus,
  Trash2,
  Send,
  UserMinus,
  Loader2,
  X,
  Pencil,
  SlidersHorizontal,
} from "lucide-react";
import type { ChatRoom, RoomMember, RoomMessage, RoomSubTab } from "@/components/project-admin/connect/types";
import { RoomSettingsTab } from "./room-settings-tab";
import { plural } from "../utils";
import type { MembershipRuleInput } from "@/lib/api/connect-room-service";

export interface RoomDetailProps {
  room: ChatRoom;
  onBack: () => void;
  messages: RoomMessage[];
  members: RoomMember[];
  onSendMessage: (content: string) => void | Promise<void>;
  onDeleteMessage: (msgId: string) => void | Promise<void>;
  onAddMember: () => void;
  onRemoveMember: (memberId: string) => void | Promise<void>;
  onSimulateExit?: (memberId: string) => void | boolean | Promise<void | boolean>;
  onRenameRoom: (name: string) => void | Promise<void>;
  onDeleteRoom: (roomId: string) => void | Promise<void>;
  membershipRule?: MembershipRuleInput | null;
  onEditRule?: () => void;
  keptOutByHand?: Array<{ userId: string; name: string }>;
  onAllowBack?: (userId: string) => void | Promise<void>;
  heldRemovals?: Array<{ userId: string; name: string }>;
  removalHoldReason?: string | null;
  waitingCount?: number;
  onResolveHeldRemovals?: (decision: "remove" | "keep") => void | Promise<void>;
  initialSubTab?: RoomSubTab;
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
  membershipRule,
  onEditRule,
  keptOutByHand = [],
  onAllowBack,
  heldRemovals = [],
  removalHoldReason,
  waitingCount = 0,
  onResolveHeldRemovals,
  initialSubTab = "messages",
}: RoomDetailProps) {
  const [roomSubTab, setRoomSubTab] = useState<RoomSubTab>(initialSubTab);
  const [inputMessage, setInputMessage] = useState("");
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const [memberActionError, setMemberActionError] = useState<string | null>(null);
  const [memberToExit, setMemberToExit] = useState<RoomMember | null>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (roomSubTab === "messages" && messagesScrollRef.current) {
      messagesScrollRef.current.scrollTop = messagesScrollRef.current.scrollHeight;
    }
  }, [messages.length, roomSubTab]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = inputMessage.trim();
    if (!trimmed) return;
    setInputMessage("");
    await onSendMessage(trimmed);
  }

  async function runMemberAction(memberId: string, action: () => void | boolean | Promise<void | boolean>): Promise<boolean> {
    setBusyMemberId(memberId);
    setMemberActionError(null);
    try {
      return (await action()) !== false;
    } catch (error) {
      setMemberActionError(error instanceof Error ? error.message : "Could not update this room member.");
      return false;
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
          <span className={`text-xs font-semibold rounded-full px-2.5 py-0.5 border ${room.membershipType === "rule" ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-slate-600 bg-slate-100 border-slate-200"}`}>{room.membershipType === "rule" ? "Follows a rule" : "Fixed list"}</span>
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
            className={`connect-subtab-item ${roomSubTab === "messages" ? "connect-subtab-item--active" : ""
              }`}
          >
            Messages
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={roomSubTab === "members"}
            onClick={() => setRoomSubTab("members")}
            className={`connect-subtab-item ${roomSubTab === "members" ? "connect-subtab-item--active" : ""
              }`}
          >
            Members
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={roomSubTab === "room-settings"}
            onClick={() => setRoomSubTab("room-settings")}
            className={`connect-subtab-item ${roomSubTab === "room-settings" ? "connect-subtab-item--active" : ""
              }`}
          >
            Room settings
          </button>
        </nav>
      </div>

      {/* Sub-tab 1: Messages in Room */}
      {roomSubTab === "messages" && (
        <div className="flex h-[480px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div ref={messagesScrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.map((msg) => msg.isSystem ? (
              <div key={msg.id} className="flex justify-center py-0.5">
                <span className="max-w-full rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-center text-[11px] text-slate-500">
                  {msg.content} · {msg.timestamp}
                </span>
              </div>
            ) : (
              <div key={msg.id} className="group flex items-start justify-between gap-3 rounded-lg px-1 py-1 hover:bg-slate-50/60">
                <div className="flex min-w-0 items-start gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-white">
                    {msg.initials}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-1.5">
                      <span className="text-xs font-bold text-slate-900">{msg.senderName}</span>
                      <span className="text-[11px] text-slate-500">{msg.timestamp}</span>
                    </div>
                    <p className={`mt-0.5 break-words text-[13px] ${msg.content === "Removed by admin" ? "italic text-slate-400" : "text-slate-700"}`}>
                      {msg.content}
                    </p>
                  </div>
                </div>
                {msg.content !== "Removed by admin" && (
                  <button
                    type="button"
                    onClick={() => onDeleteMessage(msg.id)}
                    className="shrink-0 p-1 text-slate-500 opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
                    title="Delete message for everyone"
                    aria-label="Delete message for everyone"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-slate-200 bg-slate-50/70 px-3 py-2.5">
            <input
              type="text"
              maxLength={2000}
              placeholder={`Message ${room.name} as Program Team`}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-xs transition-colors placeholder:text-slate-500 focus:border-blue-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim()}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-slate-100 px-4 text-xs font-semibold text-slate-400 transition-colors enabled:bg-blue-600 enabled:text-white enabled:hover:bg-blue-700 disabled:cursor-not-allowed"
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
            <p className="text-xs text-slate-500 font-medium">Program Team manages every room. Members see messages from the day they join.</p>
            <div className="flex items-center gap-2">
              {onEditRule && (
                <button
                  type="button"
                  onClick={onEditRule}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer bg-white border border-slate-200 hover:border-slate-300 ${
                    room.membershipType === "rule"
                      ? "text-slate-700 hover:text-slate-900 hover:bg-slate-50"
                      : "text-blue-700 hover:text-blue-800 hover:bg-blue-50/50"
                  }`}
                >
                  {room.membershipType === "rule" ? (
                    <>
                      <Pencil className="w-3.5 h-3.5 text-slate-500" />
                      <span>Edit rule</span>
                    </>
                  ) : (
                    <>
                      <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
                      <span>Add rule</span>
                    </>
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={onAddMember}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{room.membershipType === "rule" ? "Add by hand" : "Add members"}</span>
              </button>
            </div>
          </div>

          {room.membershipType === "rule" && (
            <div className="border-b border-slate-100 bg-slate-50/40 p-4">
              <div className="mb-2 flex items-center gap-2">
                <strong className="text-xs font-bold text-slate-800">Membership rule</strong>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {membershipRule?.filters.flatMap((filter) =>
                  filter.values.map((value) => (
                    <span
                      key={`${filter.source}-${filter.fieldKey}-${value}`}
                      className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700"
                    >
                      {filter.source === "designation"
                        ? value
                        : `${filter.fieldKey.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase())}: ${value}`}
                    </span>
                  ))
                )}
                {membershipRule?.reportingManagerIds.length ? (
                  <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700">
                    {membershipRule.reportingManagerIds.length} reporting manager
                    {membershipRule.reportingManagerIds.length > 1 ? "s" : ""} ·{" "}
                    {membershipRule.reportingScope === "subtree" ? "Including sub-team" : "Direct reports"}
                  </span>
                ) : null}
                {membershipRule?.includeReportingManagers && (
                  <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700">
                    + their managers
                  </span>
                )}
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                People join and leave as the Users master changes. Hand-added people stay; people removed by hand stay out.
              </p>
              {waitingCount > 0 && (
                <p className="mt-2 rounded-md bg-amber-50 px-2.5 py-2 text-[11px] text-amber-800">
                  {waitingCount} people match and are waiting for a place. They join in order as places free up.
                </p>
              )}
              {heldRemovals.length > 0 && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-bold text-amber-900">{heldRemovals.length} removals held</p>
                  <p className="mt-1 text-[11px] text-amber-800">{removalHoldReason}</p>
                  <div className="my-2 flex flex-wrap gap-1">
                    {heldRemovals.map((person) => (
                      <span
                        key={person.userId}
                        className="rounded-full border border-amber-200 bg-white px-2 py-1 text-[10px] text-amber-900"
                      >
                        {person.name} · Removal held
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onResolveHeldRemovals?.("remove")}
                      className="rounded-md bg-red-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-red-700 transition-colors cursor-pointer"
                    >
                      Remove them
                    </button>
                    <button
                      type="button"
                      onClick={() => onResolveHeldRemovals?.("keep")}
                      className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Keep them
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

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
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${member.membershipSource === "rule" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}>{member.membershipSource === "rule" ? "By rule" : "Added by hand"}</span>
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
                    onClick={() => {
                      setMemberActionError(null);
                      setMemberToExit(member);
                    }}
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
          {room.membershipType === "rule" && keptOutByHand.length > 0 && (
            <div className="border-t border-slate-200 px-4 py-3">
              <h3 className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                Kept out by hand · {keptOutByHand.length}
              </h3>
              <div className="divide-y divide-slate-100">
                {keptOutByHand.map((person) => {
                  const initials = person.name
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join("")
                    .toUpperCase();
                  return (
                    <div key={person.userId} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                          {initials || "?"}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-slate-900">{person.name}</p>
                          <p className="mt-0.5 text-[11px] text-slate-500">Matches the rule, but the Admin removed them</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => runMemberAction(person.userId, () => onAllowBack?.(person.userId))}
                        disabled={busyMemberId !== null}
                        className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {busyMemberId === person.userId && <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />}
                        Allow back
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {memberToExit && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="simulate-exit-title"
          className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={(event) => {
            if (busyMemberId === null && event.target === event.currentTarget) setMemberToExit(null);
          }}
        >
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 pt-5 pb-4 flex items-start justify-between">
              <h3 id="simulate-exit-title" className="text-base font-bold text-slate-900">
                Deactivate {memberToExit.name}?
              </h3>
              <button
                type="button"
                onClick={() => setMemberToExit(null)}
                disabled={busyMemberId !== null}
                aria-label="Close deactivation dialog"
                className="text-slate-500 hover:text-slate-700 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="px-6 pb-5 text-sm leading-5 text-slate-600">
              This simulates an exit in the Users master. {memberToExit.name} loses app access and is removed from their active rooms; past messages show as &quot;Former member&quot;.
            </p>
            {memberActionError && (
              <p role="alert" className="px-6 pb-4 text-xs font-medium text-red-600">{memberActionError}</p>
            )}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setMemberToExit(null)}
                disabled={busyMemberId !== null}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyMemberId !== null}
                onClick={async () => {
                  const didExit = await runMemberAction(
                    memberToExit.id,
                    () => onSimulateExit?.(memberToExit.id),
                  );
                  if (didExit) setMemberToExit(null);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
              >
                {busyMemberId === memberToExit.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Deactivate user
              </button>
            </div>
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

