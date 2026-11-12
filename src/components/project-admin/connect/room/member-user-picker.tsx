"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { ProjectUser } from "@/types/project-admin";
import { getInitialsColor, initials } from "../utils";

interface MemberUserPickerProps {
  users: ProjectUser[];
  selectedUserIds: string[];
  onSelectionChange: (ids: string[]) => void;
  disabled?: boolean;
  selectionLimit?: number;
  searchPlaceholder?: string;
  excludedUserIds?: string[];
}

export function MemberUserPicker({
  users,
  selectedUserIds,
  onSelectionChange,
  disabled = false,
  selectionLimit = 250,
  searchPlaceholder = "Search by name, store or employee code",
  excludedUserIds = [],
}: MemberUserPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const excluded = new Set(excludedUserIds);
    return users.filter((user) => {
      if (excluded.has(user.backendId || user.id)) return false;
      if (user.status === "inactive") return false;
      if (!q) return true;
      const store = typeof user.udfs?.store === "string" ? user.udfs.store : "";
      return [user.name, user.id, user.backendId, user.designation, user.role, store]
        .some((value) => (value || "").toLowerCase().includes(q));
    });
  }, [users, searchQuery, excludedUserIds]);

  function toggleUser(userId: string) {
    if (selectionLimit === 1) {
      onSelectionChange(selectedUserIds.includes(userId) ? [] : [userId]);
      return;
    }
    if (selectedUserIds.includes(userId)) {
      onSelectionChange(selectedUserIds.filter((id) => id !== userId));
    } else if (selectedUserIds.length < selectionLimit) {
      onSelectionChange([...selectedUserIds, userId]);
    }
  }

  return (
    <>
      <div className="relative mb-2">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="search"
          aria-label="Search members"
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          disabled={disabled}
          className="w-full border border-slate-200 bg-slate-50/70 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 placeholder:text-slate-500 focus:outline-hidden focus:border-blue-500 transition-colors"
        />
      </div>
      <div className="border border-slate-200 rounded-xl max-h-64 overflow-y-auto divide-y divide-slate-200 bg-white">
        {filteredUsers.length ? filteredUsers.map((user) => {
          const userId = user.backendId || user.id;
          const store = typeof user.udfs?.store === "string" ? user.udfs.store : "Store";
          return (
            <label key={userId} className={`px-3.5 py-2.5 flex items-center gap-3 cursor-pointer transition-colors ${selectedUserIds.includes(userId) ? "bg-blue-50" : "hover:bg-slate-50"}`}>
              <input
                type="checkbox"
                checked={selectedUserIds.includes(userId)}
                onChange={() => toggleUser(userId)}
                disabled={disabled || (!selectedUserIds.includes(userId) && selectedUserIds.length >= selectionLimit)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
              />
              <span className={`w-7 h-7 rounded-full ${getInitialsColor(userId)} text-white font-bold text-[11px] flex items-center justify-center flex-shrink-0`}>
                {initials(user.name || "User")}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 truncate">{user.name}</span>
                  {user.id && <span className="text-[10px] text-slate-400 font-semibold uppercase">{user.id}</span>}
                </div>
                <div className="text-[11px] text-slate-500 truncate">{user.designation || user.role || "Promoter"} · {store}</div>
              </div>
            </label>
          );
        }) : (
          <div className="p-4 text-center text-xs text-slate-500">
            {searchQuery ? `No active users match "${searchQuery}".` : "No active users found."}
          </div>
        )}
      </div>
    </>
  );
}
