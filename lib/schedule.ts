/**
 * Care-scheduling engine.
 *
 * Pure module: no DB access, no side effects. Takes plain inputs, returns
 * dates. All date math is done on UTC calendar days so results don't depend
 * on the server's timezone (Railway runs UTC; for Sweden that means the
 * day boundary is 01:00/02:00 local, which is fine for daily plant care).
 */

export type PotSize = "SMALL" | "MEDIUM" | "LARGE";
export type SoilType = "DRAINING" | "STANDARD" | "RETAINING";
export type LightLevel = "LOW" | "MEDIUM" | "BRIGHT_INDIRECT" | "DIRECT";
export type Season = "GROWING" | "SHOULDER" | "DORMANT";

// ---- Tuning knobs -------------------------------------------------------

/** Smaller pot dries faster. */
export const POT_FACTOR: Record<PotSize, number> = {
  SMALL: 0.85,
  MEDIUM: 1.0,
  LARGE: 1.2,
};

/** Draining soil dries faster. */
export const SOIL_FACTOR: Record<SoilType, number> = {
  DRAINING: 0.85,
  STANDARD: 1.0,
  RETAINING: 1.2,
};

/** More light dries faster. */
export const LIGHT_FACTOR: Record<LightLevel, number> = {
  LOW: 1.2,
  MEDIUM: 1.0,
  BRIGHT_INDIRECT: 0.9,
  DIRECT: 0.8,
};

/** Season → watering multiplier. Tuned for Sweden (high-latitude N hemisphere). */
export const SEASON_WATER_FACTOR: Record<Season, number> = {
  GROWING: 1.0, // Apr–Sep
  SHOULDER: 1.2, // Mar, Oct
  DORMANT: 1.5, // Nov–Feb
};

/** Fertilizing interval multiplier in shoulder months (Mar, Oct). */
export const FERT_SHOULDER_FACTOR = 1.5;

// ---- Season -------------------------------------------------------------

/** Month is read in UTC. Apr–Sep growing; Mar & Oct shoulder; Nov–Feb dormant. */
export function seasonOf(date: Date): Season {
  const month = date.getUTCMonth() + 1; // 1-12
  if (month >= 4 && month <= 9) return "GROWING";
  if (month === 3 || month === 10) return "SHOULDER";
  return "DORMANT";
}

// ---- Date helpers -------------------------------------------------------

export function startOfUTCDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

export function addDays(date: Date, days: number): Date {
  const d = startOfUTCDay(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** Whole days from `a` to `b` (positive if b is after a). */
export function daysBetween(a: Date, b: Date): number {
  const MS_PER_DAY = 86_400_000;
  return Math.round(
    (startOfUTCDay(b).getTime() - startOfUTCDay(a).getTime()) / MS_PER_DAY
  );
}

// ---- Watering -----------------------------------------------------------

export interface WaterInputs {
  baseWaterDays: number;
  potSize: PotSize;
  soil: SoilType;
  light: LightLevel;
  /** Most recent WATER CareLog, falling back to acquiredAt. */
  lastWateredAt: Date;
}

/**
 * Effective watering interval in days. The season factor is evaluated at the
 * date the interval starts from (the last watering).
 */
export function waterIntervalDays(
  inputs: Omit<WaterInputs, "lastWateredAt">,
  onDate: Date
): number {
  const interval = Math.round(
    inputs.baseWaterDays *
      POT_FACTOR[inputs.potSize] *
      SOIL_FACTOR[inputs.soil] *
      LIGHT_FACTOR[inputs.light] *
      SEASON_WATER_FACTOR[seasonOf(onDate)]
  );
  return Math.max(1, interval);
}

export function nextWaterDate(inputs: WaterInputs): Date {
  const interval = waterIntervalDays(inputs, inputs.lastWateredAt);
  return addDays(inputs.lastWateredAt, interval);
}

// ---- Fertilizing --------------------------------------------------------

export interface FertInputs {
  /** null = this species is never fertilized. */
  baseFertDays: number | null;
  /** Most recent FERTILIZE CareLog, falling back to acquiredAt. */
  lastFertilizedAt: Date;
}

/** First day of the next non-dormant window (Mar 1) at or after `date`. */
function pushOutOfDormancy(date: Date): Date {
  const month = date.getUTCMonth() + 1;
  if (month >= 3 && month <= 10) return date; // not dormant
  const year =
    month >= 11 ? date.getUTCFullYear() + 1 : date.getUTCFullYear(); // Nov/Dec → next Mar; Jan/Feb → this Mar
  return new Date(Date.UTC(year, 2, 1));
}

/**
 * Next fertilizing date, or null if the species is never fertilized.
 *
 * - Growing season: interval = baseFertDays
 * - Shoulder (Mar, Oct): interval = baseFertDays * FERT_SHOULDER_FACTOR
 * - Dormant (Nov–Feb): fertilizing is never scheduled — if the last
 *   fertilizing (or the computed due date) falls in dormancy, the due date
 *   is pushed to March 1.
 */
export function nextFertDate(inputs: FertInputs): Date | null {
  if (inputs.baseFertDays === null) return null;

  const season = seasonOf(inputs.lastFertilizedAt);
  if (season === "DORMANT") return pushOutOfDormancy(inputs.lastFertilizedAt);

  const factor = season === "SHOULDER" ? FERT_SHOULDER_FACTOR : 1.0;
  const interval = Math.max(1, Math.round(inputs.baseFertDays * factor));
  return pushOutOfDormancy(addDays(inputs.lastFertilizedAt, interval));
}

// ---- Due-task computation (what the Today view and reminders use) --------

export interface DueTask {
  type: "WATER" | "FERTILIZE";
  dueDate: Date;
  /** 0 = due today, positive = days overdue. */
  daysOverdue: number;
}

export function dueTasks(
  water: WaterInputs,
  fert: FertInputs,
  today: Date
): DueTask[] {
  const tasks: DueTask[] = [];
  const day = startOfUTCDay(today);

  const waterDue = nextWaterDate(water);
  if (waterDue.getTime() <= day.getTime()) {
    tasks.push({
      type: "WATER",
      dueDate: waterDue,
      daysOverdue: daysBetween(waterDue, day),
    });
  }

  const fertDue = nextFertDate(fert);
  if (fertDue && fertDue.getTime() <= day.getTime()) {
    tasks.push({
      type: "FERTILIZE",
      dueDate: fertDue,
      daysOverdue: daysBetween(fertDue, day),
    });
  }

  return tasks;
}
