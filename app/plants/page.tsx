/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { formatDate, nextWaterFor, PlantWithRelations } from "@/lib/care";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Plants</h1>
        <Link
          href="/plants/new"
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
        >
          + Add plant
        </Link>
      </div>

      {plants.length === 0 && (
        <p className="rounded-xl bg-white p-6 text-center text-gray-500 shadow-sm">
          No plants yet.{" "}
          <Link href="/plants/new" className="text-green-700 underline">
            Add your first plant
          </Link>
          .
        </p>
      )}

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {plants.map((plant) => (
          <li key={plant.id}>
            <Link
              href={`/plants/${plant.id}`}
              className="block overflow-hidden rounded-xl bg-white shadow-sm transition hover:shadow-md"
            >
              <div className="aspect-square bg-green-100">
                {plant.photos[0] ? (
                  <img
                    src={plant.photos[0].url}
                    alt={plant.nickname}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl">
                    🪴
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="truncate font-semibold">{plant.nickname}</p>
                <p className="truncate text-xs text-gray-500">
                  {plant.species.commonName}
                </p>
                <p className="mt-1 text-xs text-green-700">
                  💧 next {formatDate(nextWaterFor(plant))}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
