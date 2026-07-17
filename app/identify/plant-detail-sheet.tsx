"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { RankedSuggestion, saveIdentifiedPlant } from "@/lib/actions";
import { SAVED_CATEGORIES, SavedCategoryKey } from "@/lib/saved-plants";
import { WikiGallery } from "./wiki-gallery";
import { lookupImage } from "./wiki-image";

const confidenceLabel = {
  high: "high confidence",
  medium: "medium confidence",
  low: "low confidence",
} as const;

/**
 * Bottom sheet with full details for one identification suggestion: large
 * photos from Wikipedia (tap for fullscreen), all names, the AI's info and
 * save-to-Garden buttons.
 */
export function PlantDetailSheet({
  suggestion,
  photoUrl,
  fallbackSrc,
  onClose,
}: {
  suggestion: RankedSuggestion;
  photoUrl: string | null;
  fallbackSrc: string;
  onClose: () => void;
}) {
  const [saving, startSaving] = useTransition();
  const [saved, setSaved] = useState<SavedCategoryKey | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Escape closes the sheet (the gallery's fullscreen handler runs first and
  // stops propagation while a fullscreen image is open). Scroll is locked.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  function save(category: SavedCategoryKey) {
    startSaving(async () => {
      setSaveError(null);
      const fd = new FormData();
      fd.set("category", category);
      fd.set("scientificName", suggestion.scientificName);
      fd.set("swedishName", suggestion.swedishName);
      fd.set("englishName", suggestion.englishName);
      fd.set("description", suggestion.description);
      fd.set("careSummary", suggestion.careSummary);
      fd.set("toxicity", suggestion.toxicity);
      if (suggestion.suitability) fd.set("suitability", suggestion.suitability);
      if (suggestion.plantingTips)
        fd.set("plantingTips", suggestion.plantingTips);
      if (photoUrl) fd.set("photoUrl", photoUrl);
      // Cache the Wikipedia thumbnail so the Garden card always has a real
      // photo (already resolved by the result card — instant from cache).
      const wikiImage = await lookupImage(suggestion.scientificName).catch(
        () => null
      );
      if (wikiImage) fd.set("wikiImageUrl", wikiImage);
      const result = await saveIdentifiedPlant(fd);
      if (result.status === "error") setSaveError(result.message);
      else if (result.status === "done") setSaved(category);
    });
  }

  return (
    <div className="fixed inset-0 z-40">
      {/* backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/45"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={suggestion.swedishName || suggestion.englishName}
        className="absolute inset-x-0 bottom-0 mx-auto max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-[var(--color-surface)] p-5 pb-8 shadow-2xl"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold leading-tight text-[var(--color-ink)]">
              {suggestion.swedishName || suggestion.englishName}
            </h2>
            {suggestion.swedishName && (
              <p className="text-sm text-[var(--color-muted)]">
                {suggestion.englishName}
              </p>
            )}
            <p className="text-sm italic text-[var(--color-muted)]">
              {suggestion.scientificName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-2)] text-lg text-[var(--color-muted)]"
          >
            ✕
          </button>
        </div>

        <WikiGallery
          scientificName={suggestion.scientificName}
          photoUrl={photoUrl}
          fallbackSrc={fallbackSrc}
          alt={suggestion.scientificName}
        />

        <div className="mt-4 space-y-3">
          <span className="inline-block rounded-full bg-[var(--color-sage)] px-2 py-0.5 text-xs font-medium text-[var(--color-forest)]">
            {confidenceLabel[suggestion.confidence]}
          </span>
          <p className="text-sm text-[var(--color-ink)]">
            {suggestion.description}
          </p>
          <div className="space-y-1 text-sm text-[var(--color-muted)]">
            <p>
              <span className="font-medium text-[var(--color-ink)]">Care:</span>{" "}
              {suggestion.careSummary}
            </p>
            <p>
              <span className="font-medium text-[var(--color-ink)]">
                Toxicity:
              </span>{" "}
              {suggestion.toxicity}
            </p>
          </div>

          {suggestion.suitability ? (
            <div className="space-y-1 rounded-xl bg-[var(--color-surface-2)] p-3 text-sm">
              <p className="text-[var(--color-ink)]">
                <span className="font-medium">🏡 At my place:</span>{" "}
                {suggestion.suitability}
              </p>
              {suggestion.plantingTips && (
                <p className="text-[var(--color-muted)]">
                  <span className="font-medium text-[var(--color-ink)]">
                    Planting:
                  </span>{" "}
                  {suggestion.plantingTips}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-[var(--color-faint)]">
              <Link href="/settings" className="underline">
                Set your location in Settings
              </Link>{" "}
              to see if this plant would thrive at your place.
            </p>
          )}

          {/* Save to the Garden tab */}
          {saved ? (
            <div className="rounded-xl bg-[var(--color-sage)] p-3 text-sm text-[var(--color-forest)]">
              Saved to {SAVED_CATEGORIES[saved].label}{" "}
              {SAVED_CATEGORIES[saved].emoji} —{" "}
              <Link href="/garden" className="font-semibold underline">
                open Garden
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-[var(--color-ink)]">
                Save this plant
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(
                  Object.entries(SAVED_CATEGORIES) as [
                    SavedCategoryKey,
                    (typeof SAVED_CATEGORIES)[SavedCategoryKey],
                  ][]
                ).map(([key, meta]) => (
                  <button
                    key={key}
                    type="button"
                    disabled={saving}
                    onClick={() => save(key)}
                    className="btn btn-ghost flex-col gap-0.5 rounded-xl py-2.5 text-xs"
                  >
                    <span aria-hidden="true" className="text-lg leading-none">
                      {meta.emoji}
                    </span>
                    {meta.label}
                  </button>
                ))}
              </div>
              {saveError && (
                <p className="text-sm text-[var(--color-clay)]">{saveError}</p>
              )}
            </div>
          )}

          {suggestion.matchedSpeciesId && (
            <Link
              href={`/plants/new?speciesId=${suggestion.matchedSpeciesId}`}
              className="btn btn-primary w-full"
            >
              Add to my plants
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
