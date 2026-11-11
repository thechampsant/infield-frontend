import { z } from "zod";

/**
 * Validation schema for creating a chat room.
 * - Name: 1-50 characters, trimmed, required.
 * - MemberUserIds: 2-250 member user IDs, required.
 */
export const createRoomSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give the room a name.")
    .max(50, "Room name cannot exceed 50 characters."),
  memberUserIds: z
    .array(z.string())
    .min(2, "Add at least 2 members.")
    .max(250, "A room holds up to 250 members."),
});

export type CreateRoomFormValues = z.infer<typeof createRoomSchema>;

/**
 * Validation schema for renaming a chat room.
 * - Name: 1-50 characters, trimmed, required.
 */
export const renameRoomSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Room name is required.")
    .max(50, "Room name cannot exceed 50 characters."),
});

export type RenameRoomFormValues = z.infer<typeof renameRoomSchema>;

