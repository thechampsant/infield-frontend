import { z } from "zod";

/**
 * Validation schema for creating a chat room.
 * - Name: 1-50 characters, trimmed, required.
 * - MemberUserIds: at most 1,000 active user IDs; mode-specific minimum is checked by the UI and API.
 */
export const createRoomSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give the room a name.")
    .max(50, "Room name cannot exceed 50 characters."),
  memberUserIds: z
    .array(z.string())
    .max(1000, "A room holds up to 1,000 members."),
  membershipType: z.enum(["fixed", "rule"]),
  membershipRule: z.object({
    filters: z.array(z.object({ fieldKey: z.string(), source: z.enum(["user", "store", "designation", "manager"]), values: z.array(z.string()) })),
    reportingManagerIds: z.array(z.string()),
    reportingScope: z.enum(["direct", "subtree"]),
    includeReportingManagers: z.boolean(),
    addedByHandUserIds: z.array(z.string()),
    keptOutByHandUserIds: z.array(z.string()).optional(),
  }).optional(),
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

