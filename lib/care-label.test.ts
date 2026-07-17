import { describe, expect, it } from "vitest";
import { overdueLabel, overdueLabelCap } from "./care";

describe("overdueLabel", () => {
  it("gives precise counts for the first week", () => {
    expect(overdueLabel(0)).toBe("due today");
    expect(overdueLabel(1)).toBe("1 day late");
    expect(overdueLabel(7)).toBe("7 days late");
  });

  it("caps wording beyond a week — no giant guilt numbers", () => {
    expect(overdueLabel(8)).toBe("over a week late");
    expect(overdueLabel(30)).toBe("over a week late");
    expect(overdueLabel(31)).toBe("long overdue");
    expect(overdueLabel(370)).toBe("long overdue");
  });

  it("capitalizes for pills", () => {
    expect(overdueLabelCap(370)).toBe("Long overdue");
    expect(overdueLabelCap(3)).toBe("3 days late");
  });
});
