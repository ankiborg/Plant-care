/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { markDone } from "@/lib/actions";
import { dueTasksFor, overdueLabelCap, PlantWithRelations } from "@/lib/care";
import { prisma } from "@/lib/prisma";
import { speciesArt } from "@/lib/species-art";
import { SubmitButton } from "./submit-button";

export const dynamic = "force-dynamic";

interface TodayRow {
  plant: PlantWithRelations;
  type: "WATER" | "FERTILIZE";
  daysOverdue: number;
}

function friendlyToday(): string {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function statusPill(daysOverdue: number) {
  if (daysOverdue <= 0) {
    return {
      label: "Due today",
      className: "bg-[var(--color-honey-soft)] text-[var(--color-honey)]",
    };
  }
  return {
    label: overdueLabelCap(daysOverdue),
    className: "bg-[var(--color-clay-soft)] text-[var(--color-clay)]",
  };
}

export default async function TodayPage() {
  const plants = (await prisma.plant.findMany({
    where: { archived: false },
    include: {
      species: true,
      logs: true,
      photos: { orderBy: { takenAt: "desc" }, take: 1 },
    },
  })) as PlantWithRelations[];

  const rows: TodayRow[] = [];
  for (const plant of plants) {
    for (const task of dueTasksFor(plant)) {
      rows.push({ plant, type: task.type, daysOverdue: task.daysOverdue });
    }
  }

  // One card per plant — a plant needing water AND food is one stop, not two.
  const byPlant = new Map<
    string,
    { plant: PlantWithRelations; tasks: TodayRow[] }
  >();
  for (const row of rows) {
    const entry = byPlant.get(row.plant.id) ?? { plant: row.plant, tasks: [] };
    entry.tasks.push(row);
    byPlant.set(row.plant.id, entry);
  }
  const plantCards = [...byPlant.values()].sort(
    (a, b) =>
      Math.max(...b.tasks.map((t) => t.daysOverdue)) -
      Math.max(...a.tasks.map((t) => t.daysOverdue))
  );

  const total = rows.length;

  return (
    <div className="space-y-7 pt-3">
      <header className="space-y-1">
        <p className="text-sm font-medium text-[var(--color-faint)]">
          {friendlyToday()}
        </p>
        <h1 className="text-[2rem] font-semibold leading-none text-[var(--color-ink)]">
          Today
        </h1>
        <p className="pt-1 text-[0.95rem] text-[var(--color-muted)]">
          {total === 0
            ? "Everything's cared for. Enjoy the calm. 🌿"
            : `${total} ${total === 1 ? "task" : "tasks"} across ${
                new Set(rows.map((r) => r.plant.id)).size
              } ${new Set(rows.map((r) => r.plant.id)).size === 1 ? "plant" : "plants"}.`}
        </p>
      </header>

      {total === 0 && (
        <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-sage)] text-3xl">
            🪴
          </span>
          <p className="font-[family-name:var(--font-display)] text-lg text-[var(--color-ink)]">
            All caught up
          </p>
          <p className="max-w-xs text-sm text-[var(--color-muted)]">
            No plants need water or feeding today. We&apos;ll let you know when
            they do.
          </p>
        </div>
      )}

      <ul className="space-y-2.5">
        {plantCards.map(({ plant, tasks }) => (
          <li key={plant.id} className="card space-y-2.5 p-3.5">
            <Link
              href={`/plants/${plant.id}`}
              className="flex min-w-0 items-center gap-3"
            >
              <img
                src={plant.photos[0]?.url ?? speciesArt(plant.species.commonName)}
                alt=""
                className="h-11 w-11 shrink-0 rounded-full object-cover"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-[var(--color-ink)]">
                  {plant.nickname}
                </span>
                <span className="block truncate text-xs text-[var(--color-faint)]">
                  {plant.location ?? plant.species.commonName}
                </span>
              </span>
              <span aria-hidden="true" className="text-lg text-[var(--color-faint)]">
                ›
              </span>
            </Link>

            {tasks.map((task) => {
              const pill = statusPill(task.daysOverdue);
              return (
                <div
                  key={task.type}
                  className="flex items-center justify-between gap-2 border-t border-[var(--color-line)] pt-2.5"
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span aria-hidden="true">
                      {task.type === "WATER" ? "💧" : "🌱"}
                    </span>
                    <span className="text-sm font-medium text-[var(--color-ink)]">
                      {task.type === "WATER" ? "Water" : "Fertilize"}
                    </span>
                    <span className={`pill shrink-0 ${pill.className}`}>
                      {pill.label}
                    </span>
                  </span>
                  <form action={markDone}>
                    <input type="hidden" name="plantId" value={plant.id} />
                    <input type="hidden" name="type" value={task.type} />
                    <SubmitButton
                      className="btn btn-primary shrink-0 px-4 py-1.5 text-sm"
                      pendingText="…"
                    >
                      Done
                    </SubmitButton>
                  </form>
                </div>
              );
            })}
          </li>
        ))}
      </ul>
    </div>
  );
}
