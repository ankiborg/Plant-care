import Link from "next/link";
import { markDone } from "@/lib/actions";
import { dueTasksFor, overdueLabel, PlantWithRelations } from "@/lib/care";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface TodayRow {
  plant: PlantWithRelations;
  type: "WATER" | "FERTILIZE";
  daysOverdue: number;
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

  const groups: { type: "WATER" | "FERTILIZE"; title: string; rows: TodayRow[] }[] = [
    { type: "WATER", title: "💧 Water", rows: [] },
    { type: "FERTILIZE", title: "🌱 Fertilize", rows: [] },
  ];
  for (const group of groups) {
    group.rows = rows
      .filter((r) => r.type === group.type)
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
  }

  const total = rows.length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Today</h1>

      {total === 0 && (
        <p className="rounded-xl bg-white p-6 text-center text-gray-500 shadow-sm">
          Nothing due today — all plants are happy. ✅
        </p>
      )}

      {groups.map(
        (group) =>
          group.rows.length > 0 && (
            <section key={group.type}>
              <h2 className="mb-2 text-lg font-semibold text-green-800">
                {group.title}{" "}
                <span className="text-sm font-normal text-gray-500">
                  ({group.rows.length})
                </span>
              </h2>
              <ul className="space-y-2">
                {group.rows.map((row) => (
                  <li
                    key={`${row.plant.id}-${row.type}`}
                    className={`flex items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm ${
                      row.daysOverdue > 0 ? "border-l-4 border-red-400" : "border-l-4 border-green-400"
                    }`}
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/plants/${row.plant.id}`}
                        className="font-semibold hover:underline"
                      >
                        {row.plant.nickname}
                      </Link>
                      <p className="truncate text-sm text-gray-500">
                        {row.plant.species.commonName}
                        {row.plant.location ? ` · ${row.plant.location}` : ""}
                      </p>
                      <p
                        className={`text-sm ${
                          row.daysOverdue > 0
                            ? "font-semibold text-red-600"
                            : "text-green-700"
                        }`}
                      >
                        {overdueLabel(row.daysOverdue)}
                      </p>
                    </div>
                    <form action={markDone}>
                      <input type="hidden" name="plantId" value={row.plant.id} />
                      <input type="hidden" name="type" value={row.type} />
                      <button
                        type="submit"
                        className="shrink-0 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
                      >
                        Mark done
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </section>
          )
      )}
    </div>
  );
}
