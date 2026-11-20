import { describe, it, expect } from "vitest";
import { createRoomSchema, renameRoomSchema } from "./room-schema";

describe("Room Schemas Suite", () => {
  describe("createRoomSchema", () => {
    it("fails when room name is empty", () => {
      const res = createRoomSchema.safeParse({
        name: "",
        memberUserIds: ["u1", "u2"],
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toBe("Give the room a name.");
      }
    });

    it("fails when room name exceeds 50 characters", () => {
      const res = createRoomSchema.safeParse({
        name: "a".repeat(51),
        memberUserIds: ["u1", "u2"],
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toBe("Room name cannot exceed 50 characters.");
      }
    });

    it("fails when memberUserIds has fewer than 2 members", () => {
      const res = createRoomSchema.safeParse({
        name: "Valid Room",
        memberUserIds: ["u1"],
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toBe("Add at least 2 members.");
      }
    });

    it("fails when memberUserIds has more than 250 members", () => {
      const users = Array.from({ length: 251 }, (_, i) => `u-${i}`);
      const res = createRoomSchema.safeParse({
        name: "Valid Room",
        memberUserIds: users,
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toBe("A room holds up to 250 members.");
      }
    });

    it("succeeds with valid room name and 2-250 members", () => {
      const res = createRoomSchema.safeParse({
        name: "Mumbai Promoters Squad",
        memberUserIds: ["u1", "u2", "u3"],
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.name).toBe("Mumbai Promoters Squad");
        expect(res.data.memberUserIds.length).toBe(3);
      }
    });
  });

  describe("renameRoomSchema", () => {
    it("fails when name is whitespace only", () => {
      const res = renameRoomSchema.safeParse({ name: "   " });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toBe("Room name is required.");
      }
    });

    it("fails when name exceeds 50 characters", () => {
      const res = renameRoomSchema.safeParse({ name: "x".repeat(51) });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toBe("Room name cannot exceed 50 characters.");
      }
    });

    it("succeeds with valid name", () => {
      const res = renameRoomSchema.safeParse({ name: "Renamed Squad 2.0" });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.name).toBe("Renamed Squad 2.0");
      }
    });
  });
});

