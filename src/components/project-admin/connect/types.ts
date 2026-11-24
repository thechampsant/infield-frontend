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
  membershipType?: "fixed" | "rule";
  membershipSummary?: string;
  waitingCount?: number;
  needsAttention?: boolean;
}

export interface RoomMember {
  id: string;
  initials: string;
  name: string;
  role: string;
  location: string;
  storeName?: string;
  store?: string;
  employeeCode?: string;
  hasDemoPhone?: boolean;
  avatarColorClass: string;
  membershipSource?: "rule" | "hand";
}

export interface RoomMessage {
  id: string;
  senderName: string;
  timestamp: string;
  content: string;
  initials: string;
  isSystem?: boolean;
  clientMessageId?: string;
}

export type ConnectTab = "wall" | "chat" | "settings";
export type RoomSubTab = "messages" | "members" | "room-settings";
