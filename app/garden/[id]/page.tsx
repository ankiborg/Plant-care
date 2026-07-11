import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SAVED_CATEGORIES } from "@/lib/saved-plants";
import { WikiGallery } from "../../identify/wiki-gallery";
import { SavedPlantForm } from "./saved-plant-form";

export const dynamic = "force-dynamic";

export default async function SavedPlantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const plant = await prisma.savedPlant.findUnique({ where: { id } });
  if (!plant) notFound();

  return (
    <div className="space-y-5 pt-3">
      <header className="space-y-1">
        <p className="text-sm text-[var(--color-faint)]">
          <Link href="/garden" className="underline">
            Garden
          </Link>{" "}
          · {SAVED_CATEGORIES[plant.category].emoji}{" "}
          {SAVED_CATEGORIES[plant.category].label}
        </p>
        <h1 className="text-[2rem] font-semibold leading-none text-[var(--color-ink)]">
          {plant.swedishName || plant.englishName}
        </h1>
        {plant.swedishName && (
          <p className="text-[0.95rem] text-[var(--color-muted)]">
            {plant.englishName}
          </p>
        )}
        <p className="text-[0.95rem] italic text-[var(--color-muted)]">
          {plant.scientificName}
        </p>
      </header>

      <WikiGallery
        scientificName={plant.scientificName}
        photoUrl={plant.photoUrl}
        fallbackSrc="/species/generic.svg"
        alt={plant.scientificName}
      />

      <div className="card space-y-3 p-4">
        {plant.description && (
          <p className="text-sm text-[var(--color-ink)]">{plant.description}</p>
        )}
        <div className="space-y-1 text-sm text-[var(--color-muted)]">
          {plant.careSummary && (
            <p>
              <span className="font-medium text-[var(--color-ink)]">Care:</span>{" "}
              {plant.careSummary}
            </p>
          )}
          {plant.toxicity && (
            <p>
              <span className="font-medium text-[var(--color-ink)]">
                Toxicity:
              </span>{" "}
              {plant.toxicity}
            </p>
          )}
          {plant.suitability && (
            <p>
              <span className="font-medium text-[var(--color-ink)]">
                At my place:
              </span>{" "}
              {plant.suitability}
            </p>
          )}
          {plant.plantingTips && (
            <p>
              <span className="font-medium text-[var(--color-ink)]">
                Planting:
              </span>{" "}
              {plant.plantingTips}
            </p>
          )}
        </div>
        <p className="text-xs text-[var(--color-faint)]">
          Saved {plant.createdAt.toISOString().slice(0, 10)}
        </p>
      </div>

      <SavedPlantForm
        id={plant.id}
        category={plant.category}
        note={plant.note}
      />
    </div>
  );
}
