import { describe, expect, it } from "vitest";
import {
  addDays,
  daysBetween,
  dueTasks,
  nextFertDate,
  nextWaterDate,
  seasonOf,
  waterIntervalDays,
} from "./schedule";

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

describe("seasonOf", () => {
  it("classifies Swedish seasons by month", () => {
    expect(seasonOf(utc(2026, 1, 15))).toBe("DORMANT");
    expect(seasonOf(utc(2026, 2, 28))).toBe("DORMANT");
    expect(seasonOf(utc(2026, 3, 1))).toBe("SHOULDER");
    expect(seasonOf(utc(2026, 4, 1))).toBe("GROWING");
    expect(seasonOf(utc(2026, 7, 5))).toBe("GROWING");
    expect(seasonOf(utc(2026, 9, 30))).toBe("GROWING");
    expect(seasonOf(utc(2026, 10, 10))).toBe("SHOULDER");
    expect(seasonOf(utc(2026, 11, 1))).toBe("DORMANT");
    expect(seasonOf(utc(2026, 12, 24))).toBe("DORMANT");
  });
});

describe("watering interval", () => {
  const pothos = {
    baseWaterDays: 7,
    potSize: "SMALL",
    soil: "STANDARD",
    light: "BRIGHT_INDIRECT",
  } as const;

  it("pothos, small pot, bright indirect, July → 5 days", () => {
    // 7 * 0.85 (small) * 1.0 (standard) * 0.9 (bright) * 1.0 (growing) = 5.355 → 5
    expect(waterIntervalDays(pothos, utc(2026, 7, 10))).toBe(5);
  });

  it("same pothos in December stretches to 8 days", () => {
    // 7 * 0.85 * 1.0 * 0.9 * 1.5 (dormant) = 8.03 → 8
    expect(waterIntervalDays(pothos, utc(2026, 12, 10))).toBe(8);
  });

  it("bigger pot + retaining soil + low light stretches the interval", () => {
    const zz = {
      baseWaterDays: 18,
      potSize: "LARGE",
      soil: "RETAINING",
      light: "LOW",
    } as const;
    // 18 * 1.2 * 1.2 * 1.2 * 1.0 = 31.1 → 31
    expect(waterIntervalDays(zz, utc(2026, 6, 1))).toBe(31);
  });

  it("interval never drops below 1 day", () => {
    const tiny = {
      baseWaterDays: 1,
      potSize: "SMALL",
      soil: "DRAINING",
      light: "DIRECT",
    } as const;
    // 1 * 0.85 * 0.85 * 0.8 = 0.578 → round 1... but guard anyway
    expect(waterIntervalDays(tiny, utc(2026, 7, 1))).toBeGreaterThanOrEqual(1);
  });

  it("nextWaterDate = lastWatered + interval", () => {
    expect(
      nextWaterDate({ ...pothos, lastWateredAt: utc(2026, 7, 1) })
    ).toEqual(utc(2026, 7, 6));
  });

  it("changing pot/light visibly changes the next date", () => {
    const base = { baseWaterDays: 8, soil: "STANDARD", lastWateredAt: utc(2026, 7, 1) } as const;
    const sunny = nextWaterDate({ ...base, potSize: "SMALL", light: "DIRECT" });
    const shady = nextWaterDate({ ...base, potSize: "LARGE", light: "LOW" });
    expect(shady.getTime()).toBeGreaterThan(sunny.getTime());
  });
});

describe("fertilizing", () => {
  it("never fertilizes species with null baseFertDays", () => {
    expect(
      nextFertDate({ baseFertDays: null, lastFertilizedAt: utc(2026, 6, 1) })
    ).toBeNull();
  });

  it("growing season uses the base interval", () => {
    expect(
      nextFertDate({ baseFertDays: 30, lastFertilizedAt: utc(2026, 6, 1) })
    ).toEqual(utc(2026, 7, 1));
  });

  it("shoulder months stretch the interval 1.5x", () => {
    // Mar 1 + 45 days = Apr 15
    expect(
      nextFertDate({ baseFertDays: 30, lastFertilizedAt: utc(2026, 3, 1) })
    ).toEqual(utc(2026, 4, 15));
  });

  it("a due date landing in dormancy is pushed to March 1", () => {
    // Oct 15 (shoulder) + 45 days = Nov 29 → dormant → Mar 1 next year
    expect(
      nextFertDate({ baseFertDays: 30, lastFertilizedAt: utc(2026, 10, 15) })
    ).toEqual(utc(2027, 3, 1));
  });

  it("last fertilized in dormancy schedules for March 1", () => {
    expect(
      nextFertDate({ baseFertDays: 30, lastFertilizedAt: utc(2026, 1, 10) })
    ).toEqual(utc(2026, 3, 1));
    expect(
      nextFertDate({ baseFertDays: 30, lastFertilizedAt: utc(2026, 11, 20) })
    ).toEqual(utc(2027, 3, 1));
  });

  it("never produces a due date in Nov–Feb", () => {
    for (let month = 1; month <= 12; month++) {
      const due = nextFertDate({
        baseFertDays: 45,
        lastFertilizedAt: utc(2026, month, 15),
      });
      expect(due).not.toBeNull();
      const dueMonth = due!.getUTCMonth() + 1;
      expect(dueMonth === 11 || dueMonth === 12 || dueMonth <= 2).toBe(false);
    }
  });
});

describe("dueTasks", () => {
  const pothosJuly = {
    baseWaterDays: 7,
    potSize: "SMALL",
    soil: "STANDARD",
    light: "BRIGHT_INDIRECT",
    lastWateredAt: utc(2026, 7, 1), // interval 5 → due Jul 6
  } as const;

  it("reports nothing before the due date", () => {
    expect(
      dueTasks(pothosJuly, { baseFertDays: null, lastFertilizedAt: utc(2026, 7, 1) }, utc(2026, 7, 5))
    ).toHaveLength(0);
  });

  it("reports water due on the due date and counts overdue days", () => {
    const onDay = dueTasks(
      pothosJuly,
      { baseFertDays: null, lastFertilizedAt: utc(2026, 7, 1) },
      utc(2026, 7, 6)
    );
    expect(onDay).toEqual([
      { type: "WATER", dueDate: utc(2026, 7, 6), daysOverdue: 0 },
    ]);

    const overdue = dueTasks(
      pothosJuly,
      { baseFertDays: null, lastFertilizedAt: utc(2026, 7, 1) },
      utc(2026, 7, 9)
    );
    expect(overdue[0].daysOverdue).toBe(3);
  });

  it("reports water and fertilize together when both are due", () => {
    const tasks = dueTasks(
      pothosJuly,
      { baseFertDays: 30, lastFertilizedAt: utc(2026, 6, 1) }, // due Jul 1
      utc(2026, 7, 6)
    );
    expect(tasks.map((t) => t.type).sort()).toEqual(["FERTILIZE", "WATER"]);
  });
});

describe("date helpers", () => {
  it("addDays and daysBetween round-trip", () => {
    const start = utc(2026, 2, 27);
    expect(addDays(start, 3)).toEqual(utc(2026, 3, 2)); // across month boundary
    expect(daysBetween(start, addDays(start, 17))).toBe(17);
  });
});
