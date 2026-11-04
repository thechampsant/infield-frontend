export interface WallPost {
  id: string;
  timestamp: string;
  content: string;
  hasImages?: boolean;
  imageCount?: number;
  hasVideo?: boolean;
  videoDuration?: string;
  audience: string;
  seenCount: number;
  totalUsers: number;
  likes: number;
  claps: number;
  celebrates: number;
  usefuls: number;
}

export interface ChatRoom {
  id: string;
  initials: string;
  name: string;
  memberCount: number;
  hasDemoPhone?: boolean;
  messageCount: number;
  lastActivity: string;
  tag?: string;
}

export interface RoomMember {
  id: string;
  initials: string;
  name: string;
  role: string;
  location: string;
  hasDemoPhone?: boolean;
  avatarColorClass: string;
}

export interface RoomMessage {
  id: string;
  senderName: string;
  timestamp: string;
  content: string;
  initials: string;
}

export type ConnectTab = "wall" | "chat" | "settings";
export type RoomSubTab = "messages" | "members" | "room-settings";
