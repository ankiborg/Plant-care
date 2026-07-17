import Link from "next/link";
import { createPlant } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { speciesArt } from "@/lib/species-art";
import { LocationField } from "../../location-field";
import { SubmitButton } from "../../submit-button";
import { SpeciesField } from "./species-field";

export const dynamic = "force-dynamic";

export default async function NewPlantPage({
  searchParams,
}: {
  searchParams: Promise<{ speciesId?: string }>;
}) {
  const { speciesId } = await searchParams;
  const species = await prisma.species.findMany({
    orderBy: { commonName: "asc" },
  });
  // Preselect the species when arriving from the Identify page; ignore ids
  // that aren't in the list.
  const initialSpeciesId = species.some((s) => s.id === speciesId)
    ? speciesId
    : undefined;
  const locationRows = await prisma.plant.findMany({
    where: { archived: false, location: { not: null } },
    select: { location: true },
    distinct: ["location"],
    orderBy: { location: "asc" },
  });
  const locations = locationRows
    .map((r) => r.location)
    .filter((l): l is string => Boolean(l));

  return (
    <div className="space-y-6 pt-3">
      <header className="space-y-1">
        <h1 className="text-[2rem] font-semibold leading-none text-[var(--color-ink)]">
          Add a plant
        </h1>
        <p className="text-[0.95rem] text-[var(--color-muted)]">
          Pick a species and we&apos;ll set a sensible care schedule.
        </p>
      </header>

      {species.length === 0 && (
        <p className="card px-4 py-3 text-sm text-[var(--color-clay)]">
          The species list is empty — run <code>npm run seed</code> first.
        </p>
      )}

      <form action={createPlant} className="card space-y-5 p-5">
        <SpeciesField
          initialSpeciesId={initialSpeciesId}
          species={species.map((s) => ({
            id: s.id,
            commonName: s.commonName,
            scientificName: s.scientificName,
            toxicToPets: s.toxicToPets,
            art: speciesArt(s.commonName),
          }))}
        />

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-[var(--color-ink)]">Nickname</span>
          <input
            name="nickname"
            required
            maxLength={60}
            placeholder="Monstera by the sofa"
            className="field"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-[var(--color-ink)]">
            Location <span className="text-[var(--color-faint)]">· optional</span>
          </span>
          <LocationField locations={locations} />
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-[var(--color-ink)]">Pot</span>
            <select name="potSize" defaultValue="MEDIUM" className="field">
              <option value="SMALL">Small</option>
              <option value="MEDIUM">Medium</option>
              <option value="LARGE">Large</option>
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-[var(--color-ink)]">Soil</span>
            <select name="soil" defaultValue="" className="field">
              <option value="">Default</option>
              <option value="DRAINING">Draining</option>
              <option value="STANDARD">Standard</option>
              <option value="RETAINING">Retaining</option>
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-[var(--color-ink)]">Light</span>
            <select name="light" defaultValue="" className="field">
              <option value="">Default</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="BRIGHT_INDIRECT">Bright indirect</option>
              <option value="DIRECT">Direct sun</option>
            </select>
          </label>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <SubmitButton
            className="btn btn-primary flex-1 py-3"
            pendingText="Adding…"
          >
            Add plant
          </SubmitButton>
          <Link href="/plants" className="btn btn-ghost">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
