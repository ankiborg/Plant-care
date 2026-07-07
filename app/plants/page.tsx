/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { nextWaterFor, PlantWithRelations } from "@/lib/care";
import { daysBetween, startOfUTCDay } from "@/lib/schedule";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function waterLabel(next: Date): { text: string; tone: "ok" | "due" | "late" } {
  const days = daysBetween(startOfUTCDay(new Date()), next);
  if (days < 0)
    return { text: `${-days}d late`, tone: "late" };
  if (days === 0) return { text: "Water today", tone: "due" };
  if (days === 1) return { text: "Water tomorrow", tone: "ok" };
  return { text: `Water in ${days}d`, tone: "ok" };
}

const toneClass = {
  ok: "text-[var(--color-muted)]",
  due: "text-[var(--color-honey)] font-semibold",
  late: "text-[var(--color-clay)] font-semibold",
};

const dotClass = {
  ok: "bg-[var(--color-moss)]",
  due: "bg-[var(--color-honey)]",
  late: "bg-[var(--color-clay)]",
};

export default async function PlantsPage() {
  const plants = (await prisma.plant.findMany({
    where: { archived: false },
    include: {
      species: true,
      logs: true,
      photos: { orderBy: { takenAt: "desc" }, take: 1 },
    },
    orderBy: { nickname: "asc" },
  })) as PlantWithRelations[];

  return (
    <div className="space-y-6 pt-3">
      <header className="flex items-end justify-between">
        <div className="space-y-1">
          <h1 className="text-[2rem] font-semibold leading-none text-[var(--color-ink)]">
            Plants
          </h1>
          <p className="text-[0.95rem] text-[var(--color-muted)]">
            {plants.length === 0
              ? "Your collection starts here."
              : `${plants.length} in your care`}
          </p>
        </div>
        <Link href="/plants/new" className="btn btn-ghost">
          + Add
        </Link>
      </header>

      {plants.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-sage)] text-3xl">
            🌱
          </span>
          <p className="font-[family-name:var(--font-display)] text-lg">
            No plants yet
          </p>
          <Link href="/plants/new" className="btn btn-primary mt-1">
            Add your first plant
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3.5">
          {plants.map((plant) => {
            const label = waterLabel(nextWaterFor(plant));
            return (
              <li key={plant.id}>
                <Link
                  href={`/plants/${plant.id}`}
                  className="card group block overflow-hidden transition-shadow hover:shadow-[0_10px_30px_rgba(26,42,32,0.10)]"
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-[var(--color-sage)]">
                    {plant.photos[0] ? (
                      <img
                        src={plant.photos[0].url}
                        alt={plant.nickname}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-4xl opacity-70">
                        🪴
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 p-3">
                    <p className="truncate font-[family-name:var(--font-display)] text-[0.98rem] font-semibold leading-tight text-[var(--color-ink)]">
                      {plant.nickname}
                    </p>
                    <p className="truncate text-xs text-[var(--color-faint)]">
                      {plant.species.commonName}
                    </p>
                    <p
                      className={`flex items-center gap-1.5 pt-0.5 text-xs ${toneClass[label.tone]}`}
                    >
                      <span
                        className={`inline-block h-1.5 w-1.5 rounded-full ${dotClass[label.tone]}`}
                      />
                      {label.text}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
