/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";
import {
  archivePlant,
  logCareWithNote,
  updatePlant,
  uploadPhoto,
} from "@/lib/actions";
import {
  formatDate,
  lastCareDate,
  nextFertFor,
  nextWaterFor,
  PlantWithRelations,
} from "@/lib/care";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-green-600 focus:outline-none";

const CARE_BUTTONS: { type: string; label: string }[] = [
  { type: "WATER", label: "💧 Water" },
  { type: "FERTILIZE", label: "🌱 Fertilize" },
  { type: "REPOT", label: "🪴 Repot" },
  { type: "PRUNE", label: "✂️ Prune" },
  { type: "CLEAN", label: "🧽 Clean" },
  { type: "NOTE", label: "📝 Note" },
];

const CARE_EMOJI: Record<string, string> = {
  WATER: "💧",
  FERTILIZE: "🌱",
  REPOT: "🪴",
  PRUNE: "✂️",
  CLEAN: "🧽",
  NOTE: "📝",
};

export default async function PlantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const plant = (await prisma.plant.findUnique({
    where: { id },
    include: {
      species: true,
      logs: { orderBy: { doneAt: "desc" } },
      photos: { orderBy: { takenAt: "desc" } },
    },
  })) as PlantWithRelations | null;

  if (!plant || plant.archived) notFound();

  const nextWater = nextWaterFor(plant);
  const nextFert = nextFertFor(plant);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{plant.nickname}</h1>
        <p className="text-gray-500">
          {plant.species.commonName}
          {plant.species.scientificName && (
            <span className="italic"> · {plant.species.scientificName}</span>
          )}
          {plant.species.toxicToPets && " · ⚠️ toxic to pets"}
        </p>
      </div>

      {/* Next care dates */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">💧 Next watering</p>
          <p className="text-lg font-semibold text-green-800">
            {formatDate(nextWater)}
          </p>
          <p className="text-xs text-gray-400">
            last: {formatDate(lastCareDate(plant, "WATER"))}
          </p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">🌱 Next fertilizing</p>
          <p className="text-lg font-semibold text-green-800">
            {nextFert ? formatDate(nextFert) : "never (species)"}
          </p>
          {nextFert && (
            <p className="text-xs text-gray-400">
              last: {formatDate(lastCareDate(plant, "FERTILIZE"))}
            </p>
          )}
        </div>
      </div>

      {/* Log care */}
      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">Log care</h2>
        <form action={logCareWithNote} className="space-y-3">
          <input type="hidden" name="plantId" value={plant.id} />
          <div className="grid grid-cols-3 gap-2">
            {CARE_BUTTONS.map((b) => (
              <button
                key={b.type}
                type="submit"
                name="type"
                value={b.type}
                className="rounded-lg bg-green-100 px-2 py-2 text-sm font-medium text-green-900 hover:bg-green-200"
              >
                {b.label}
              </button>
            ))}
          </div>
          <input
            name="note"
            maxLength={200}
            placeholder="Optional note…"
            className={inputClass}
          />
        </form>
      </section>

      {/* Photo timeline */}
      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">Photos</h2>
        <form action={uploadPhoto} className="mb-4 space-y-2">
          <input type="hidden" name="plantId" value={plant.id} />
          <input
            type="file"
            name="photo"
            accept="image/*"
            capture="environment"
            required
            className="w-full text-sm"
          />
          <div className="flex gap-2">
            <input
              name="note"
              maxLength={120}
              placeholder="Optional note…"
              className={inputClass}
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
            >
              Upload
            </button>
          </div>
        </form>

        {plant.photos.length === 0 ? (
          <p className="text-sm text-gray-500">
            No photos yet — take one now so future-you can see the growth.
          </p>
        ) : (
          <ul className="grid grid-cols-3 gap-2">
            {plant.photos.map((photo) => (
              <li key={photo.id}>
                <a href={photo.url} target="_blank" rel="noreferrer">
                  <img
                    src={photo.url}
                    alt={photo.note ?? formatDate(photo.takenAt)}
                    className="aspect-square w-full rounded-lg object-cover"
                  />
                </a>
                <p className="mt-1 text-xs text-gray-500">
                  {formatDate(photo.takenAt)}
                  {photo.note ? ` · ${photo.note}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Edit attributes */}
      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">Details</h2>
        <form action={updatePlant} className="space-y-3">
          <input type="hidden" name="plantId" value={plant.id} />
          <label className="block text-sm font-medium">
            Nickname
            <input
              name="nickname"
              defaultValue={plant.nickname}
              required
              maxLength={60}
              className={inputClass}
            />
          </label>
          <label className="block text-sm font-medium">
            Location
            <input
              name="location"
              defaultValue={plant.location ?? ""}
              maxLength={80}
              className={inputClass}
            />
          </label>
          <div className="grid grid-cols-3 gap-3">
            <label className="block text-sm font-medium">
              Pot size
              <select name="potSize" defaultValue={plant.potSize} className={inputClass}>
                <option value="SMALL">Small</option>
                <option value="MEDIUM">Medium</option>
                <option value="LARGE">Large</option>
              </select>
            </label>
            <label className="block text-sm font-medium">
              Soil
              <select name="soil" defaultValue={plant.soil} className={inputClass}>
                <option value="DRAINING">Draining</option>
                <option value="STANDARD">Standard</option>
                <option value="RETAINING">Retaining</option>
              </select>
            </label>
            <label className="block text-sm font-medium">
              Light
              <select name="light" defaultValue={plant.light} className={inputClass}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="BRIGHT_INDIRECT">Bright indirect</option>
                <option value="DIRECT">Direct sun</option>
              </select>
            </label>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
          >
            Save changes
          </button>
        </form>
      </section>

      {/* Care history */}
      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">Care history</h2>
        {plant.logs.length === 0 ? (
          <p className="text-sm text-gray-500">No care logged yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100 text-sm">
            {plant.logs.map((log) => (
              <li key={log.id} className="flex justify-between gap-2 py-2">
                <span>
                  {CARE_EMOJI[log.type] ?? ""} {log.type.toLowerCase()}
                  {log.note && <span className="text-gray-500"> — {log.note}</span>}
                </span>
                <span className="shrink-0 text-gray-400">
                  {formatDate(log.doneAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form action={archivePlant}>
        <input type="hidden" name="plantId" value={plant.id} />
        <button
          type="submit"
          className="text-sm text-gray-400 underline hover:text-red-600"
        >
          Archive this plant
        </button>
      </form>
    </div>
  );
}
