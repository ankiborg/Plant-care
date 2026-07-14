import { describe, expect, it } from "vitest";
import { groupExpensesByDay } from "@/lib/history";
import { dayKey, formatDayLabel } from "@/lib/dates";

// Lokala tider utan Z-suffix → tolkas i testmiljöns tidszon, precis som
// på enheten, så testet är tidszonsoberoende.
function exp(spentAt: string, amountSek: number) {
  return { spentAt, amountSek };
}

describe("groupExpensesByDay", () => {
  it("grupperar per dag, nyast först, med dagsummor", () => {
    const groups = groupExpensesByDay([
      exp("2026-07-20T10:00:00", 50),
      exp("2026-07-21T09:00:00", 30),
      exp("2026-07-20T18:00:00", 100),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0].key).toBe("2026-07-21");
    expect(groups[0].totalSek).toBe(30);
    expect(groups[1].key).toBe("2026-07-20");
    expect(groups[1].totalSek).toBe(150);
    // inom dagen: nyast först
    expect(groups[1].items[0].spentAt).toBe("2026-07-20T18:00:00");
  });

  it("tom lista ger inga grupper", () => {
    expect(groupExpensesByDay([])).toEqual([]);
  });
});

describe("dayKey", () => {
  it("ger lokal dagnyckel", () => {
    expect(dayKey("2026-07-20T10:30:00")).toBe("2026-07-20");
  });
});

describe("formatDayLabel", () => {
  it("formaterar svenska dagnamn", () => {
    expect(formatDayLabel("2026-07-20")).toBe("Måndag 20 juli");
    expect(formatDayLabel("2026-07-26")).toBe("Söndag 26 juli");
  });
});
