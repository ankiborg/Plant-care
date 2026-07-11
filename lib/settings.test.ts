import { describe, expect, it } from "vitest";
import { parseHardinessZone } from "./settings";

describe("parseHardinessZone", () => {
  it("accepts Swedish zones 1-8", () => {
    expect(parseHardinessZone("1")).toBe(1);
    expect(parseHardinessZone("8")).toBe(8);
    expect(parseHardinessZone("5")).toBe(5);
  });

  it("returns null for empty or missing input", () => {
    expect(parseHardinessZone("")).toBeNull();
    expect(parseHardinessZone("  ")).toBeNull();
    expect(parseHardinessZone(null)).toBeNull();
    expect(parseHardinessZone(undefined)).toBeNull();
  });

  it("rejects out-of-range and non-integer values", () => {
    expect(parseHardinessZone("0")).toBeNull();
    expect(parseHardinessZone("9")).toBeNull();
    expect(parseHardinessZone("5.5")).toBeNull();
    expect(parseHardinessZone("zon 5")).toBeNull();
  });
});
