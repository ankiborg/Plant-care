import type { CareLog, Plant, PlantPhoto, Species } from "@prisma/client";
import {
  DueTask,
  dueTasks,
  nextFertDate,
  nextWaterDate,
} from "./schedule";

export type PlantWithRelations = Plant & {
  species: Species;
  logs: CareLog[];
  photos: PlantPhoto[];
};

/** Last care date of a type, derived from logs; falls back to acquiredAt. */
export function lastCareDate(
  plant: PlantWithRelations,
  type: "WATER" | "FERTILIZE"
): Date {
  let latest: Date | null = null;
  for (const log of plant.logs) {
    if (log.type === type && (!latest || log.doneAt > latest)) {
      latest = log.doneAt;
    }
  }
  return latest ?? plant.acquiredAt;
}

export function waterInputsFor(plant: PlantWithRelations) {
  return {
    baseWaterDays: plant.species.baseWaterDays,
    potSize: plant.potSize,
    soil: plant.soil,
    light: plant.light,
    lastWateredAt: lastCareDate(plant, "WATER"),
  };
}

export function fertInputsFor(plant: PlantWithRelations) {
  return {
    baseFertDays: plant.species.baseFertDays,
    lastFertilizedAt: lastCareDate(plant, "FERTILIZE"),
  };
}

export function nextWaterFor(plant: PlantWithRelations): Date {
  return nextWaterDate(waterInputsFor(plant));
}

export function nextFertFor(plant: PlantWithRelations): Date | null {
  return nextFertDate(fertInputsFor(plant));
}

export function dueTasksFor(
  plant: PlantWithRelations,
  today = new Date()
): DueTask[] {
  return dueTasks(waterInputsFor(plant), fertInputsFor(plant), today);
}

export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Friendly, capped overdue wording. Precise counts stop after a week —
 * "370 days late" reads as blame, not a nudge.
 */
export function overdueLabel(daysOverdue: number): string {
  if (daysOverdue <= 0) return "due today";
  if (daysOverdue === 1) return "1 day late";
  if (daysOverdue <= 7) return `${daysOverdue} days late`;
  if (daysOverdue <= 30) return "over a week late";
  return "long overdue";
}

/** Capitalized variant for pill/badge starts. */
export function overdueLabelCap(daysOverdue: number): string {
  const label = overdueLabel(daysOverdue);
  return label.charAt(0).toUpperCase() + label.slice(1);
}
