export type ConnectMediaType = "NONE" | "IMAGES" | "VIDEO";
export type ConnectReactionType = "LIKE" | "CLAP" | "CELEBRATE" | "USEFUL";

export interface WallImageMetadata {
  url: string;
  name: string;
  originalName?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
}

export interface WallVideoMetadata {
  url: string;
  title: string;
  duration: string;
  durationSeconds?: number;
  sizeBytes?: number;
  originalName?: string;
}

export interface WallPost {
  id: string;
  timestamp: string;
  content: string;
  mediaType?: ConnectMediaType;
  hasImages?: boolean;
  imageCount?: number;
  images?: WallImageMetadata[];
  hasVideo?: boolean;
  videoDuration?: string;
  video?: WallVideoMetadata | null;
  audience: string;
  seenCount: number;
  totalUsers: number;
  likes: number;
  claps: number;
  celebrates: number;
  usefuls: number;
  authorDisplayName?: string;
  seenUserIds?: string[];
  createdAt?: string;
}

export interface ChatRoom {
  id: string;
  _id?: string;
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
