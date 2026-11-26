import { describe, expect, it } from "vitest";
import { isReportFavoriteForUser } from "./report-nav-state";

describe("isReportFavoriteForUser", () => {
  it("counts only reports favorited by the current user", () => {
    const reportByOther = { favorites: ["user-2"] };
    const reportByUserId = { favorites: ["user-1", "user-2"] };
    const reportByMongoId = { favorites: ["mongo-1"] };

    expect(isReportFavoriteForUser(reportByOther, { id: "user-1", _id: "mongo-1" })).toBe(false);
    expect(isReportFavoriteForUser(reportByUserId, { id: "user-1", _id: "mongo-1" })).toBe(true);
    expect(isReportFavoriteForUser(reportByMongoId, { id: "user-1", _id: "mongo-1" })).toBe(true);
    expect(isReportFavoriteForUser(reportByUserId, null)).toBe(false);
  });
});
