import { createPlant } from "@/lib/actions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-green-600 focus:outline-none";

export default async function NewPlantPage() {
  const species = await prisma.species.findMany({
    orderBy: { commonName: "asc" },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Add plant</h1>

      {species.length === 0 && (
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          The species list is empty — run <code>npm run seed</code> first.
        </p>
      )}

      <form action={createPlant} className="space-y-4 rounded-xl bg-white p-4 shadow-sm">
        <label className="block text-sm font-medium">
          Species
          <select name="speciesId" required className={inputClass}>
            {species.map((s) => (
              <option key={s.id} value={s.id}>
                {s.commonName}
                {s.scientificName ? ` (${s.scientificName})` : ""}
                {s.toxicToPets ? " ⚠️ toxic to pets" : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium">
          Nickname
          <input
            name="nickname"
            required
            maxLength={60}
            placeholder="e.g. Monstera by the sofa"
            className={inputClass}
          />
        </label>

        <label className="block text-sm font-medium">
          Location
          <input
            name="location"
            maxLength={80}
            placeholder="e.g. Living room, east window"
            className={inputClass}
          />
        </label>

        <div className="grid grid-cols-3 gap-3">
          <label className="block text-sm font-medium">
            Pot size
            <select name="potSize" defaultValue="MEDIUM" className={inputClass}>
              <option value="SMALL">Small</option>
              <option value="MEDIUM">Medium</option>
              <option value="LARGE">Large</option>
            </select>
          </label>

          <label className="block text-sm font-medium">
            Soil
            <select name="soil" defaultValue="" className={inputClass}>
              <option value="">Species default</option>
              <option value="DRAINING">Draining</option>
              <option value="STANDARD">Standard</option>
              <option value="RETAINING">Retaining</option>
            </select>
          </label>

          <label className="block text-sm font-medium">
            Light
            <select name="light" defaultValue="" className={inputClass}>
              <option value="">Species default</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="BRIGHT_INDIRECT">Bright indirect</option>
              <option value="DIRECT">Direct sun</option>
            </select>
          </label>
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-green-700 px-4 py-3 font-semibold text-white hover:bg-green-800"
        >
          Add plant
        </button>
      </form>
    </div>
  );
}
