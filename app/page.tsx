import Link from "next/link";
import { markDone } from "@/lib/actions";
import { dueTasksFor, PlantWithRelations } from "@/lib/care";
import { prisma } from "@/lib/prisma";
import { SubmitButton } from "./submit-button";

export const dynamic = "force-dynamic";

interface TodayRow {
  plant: PlantWithRelations;
  type: "WATER" | "FERTILIZE";
  daysOverdue: number;
}

function WaterGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M12 3.5c3.5 4 5.5 6.6 5.5 9.4A5.5 5.5 0 0 1 12 18.4a5.5 5.5 0 0 1-5.5-5.5C6.5 10.1 8.5 7.5 12 3.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FertGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M12 20c0-5 1-8 6-11-1 5.5-2.5 8.5-6 9.5M12 20c0-4-.5-6.5-4-9 1.5 4 3 5.5 4 6.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
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
    label: daysOverdue === 1 ? "1 day late" : `${daysOverdue} days late`,
    className: "bg-[var(--color-clay-soft)] text-[var(--color-clay)]",
  };
}

export default async function TodayPage() {
  const plants = (await prisma.plant.findMany({
    where: { archived: false },
    include: { species: true, logs: true, photos: true },
  })) as PlantWithRelations[];

  const rows: TodayRow[] = [];
  for (const plant of plants) {
    for (const task of dueTasksFor(plant)) {
      rows.push({ plant, type: task.type, daysOverdue: task.daysOverdue });
    }
  }

  const groups = [
    { type: "WATER" as const, title: "Water", Glyph: WaterGlyph },
    { type: "FERTILIZE" as const, title: "Fertilize", Glyph: FertGlyph },
  ].map((g) => ({
    ...g,
    rows: rows
      .filter((r) => r.type === g.type)
      .sort((a, b) => b.daysOverdue - a.daysOverdue),
  }));

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

      {groups.map(
        (group) =>
          group.rows.length > 0 && (
            <section key={group.type} className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <span className="text-[var(--color-moss)]">
                  <group.Glyph />
                </span>
                <h2 className="text-base font-semibold text-[var(--color-ink)]">
                  {group.title}
                </h2>
                <span className="pill bg-[var(--color-surface-2)] text-[var(--color-muted)]">
                  {group.rows.length}
                </span>
              </div>

              <ul className="space-y-2.5">
                {group.rows.map((row) => {
                  const pill = statusPill(row.daysOverdue);
                  return (
                    <li
                      key={`${row.plant.id}-${row.type}`}
                      className="card flex items-center gap-3 p-3.5"
                    >
                      <Link
                        href={`/plants/${row.plant.id}`}
                        className="flex min-w-0 flex-1 items-center gap-3"
                      >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-sage)] text-[var(--color-forest)]">
                          <group.Glyph />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-[var(--color-ink)]">
                            {row.plant.nickname}
                          </span>
                          <span className="mt-1 flex items-center gap-1.5">
                            <span className={`pill shrink-0 ${pill.className}`}>
                              {pill.label}
                            </span>
                            <span className="min-w-0 truncate text-xs text-[var(--color-faint)]">
                              {row.plant.location ?? row.plant.species.commonName}
                            </span>
                          </span>
                        </span>
                      </Link>
                      <form action={markDone}>
                        <input type="hidden" name="plantId" value={row.plant.id} />
                        <input type="hidden" name="type" value={row.type} />
                        <SubmitButton
                          className="btn btn-primary shrink-0"
                          pendingText="…"
                        >
                          Done
                        </SubmitButton>
                      </form>
                    </li>
                  );
                })}
              </ul>
            </section>
          )
      )}
    </div>
  );
}
