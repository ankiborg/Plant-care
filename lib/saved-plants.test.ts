import { describe, expect, it } from "vitest";
import {
  parseSavedCategory,
  SAVED_CATEGORIES,
  SAVED_CATEGORY_KEYS,
} from "./saved-plants";

describe("saved-plants", () => {
  it("has three categories with labels", () => {
    expect(SAVED_CATEGORY_KEYS).toEqual(["GARDEN", "WISHLIST", "SPOTTED"]);
    for (const key of SAVED_CATEGORY_KEYS) {
      expect(SAVED_CATEGORIES[key].label.length).toBeGreaterThan(0);
    }
  });

  it("parses valid categories and rejects everything else", () => {
    expect(parseSavedCategory("GARDEN")).toBe("GARDEN");
    expect(parseSavedCategory("WISHLIST")).toBe("WISHLIST");
    expect(parseSavedCategory("garden")).toBeNull();
    expect(parseSavedCategory("")).toBeNull();
    expect(parseSavedCategory(null)).toBeNull();
    expect(parseSavedCategory(42)).toBeNull();
    // inherited object keys must not slip through
    expect(parseSavedCategory("toString")).toBeNull();
  });
});
