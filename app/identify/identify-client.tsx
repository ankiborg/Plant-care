"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import {
  RankedSuggestion,
  suggestPlantsFromUpload,
  SuggestPlantsState,
} from "@/lib/actions";
import { prepareImageForUpload } from "@/lib/image-resize";
import { MAX_PHOTO_MB, photoTooLargeMessage } from "@/lib/photo-limits";
import { speciesArt } from "@/lib/species-art";
import { IdentifyLoading } from "./identify-loading";
import { PlantDetailSheet } from "./plant-detail-sheet";
import { WikiImage } from "./wiki-image";

function artFor(s: RankedSuggestion): string {
  return s.matchedCommonName
    ? speciesArt(s.matchedCommonName)
    : "/species/generic.svg";
}

const confidenceLabel = {
  high: "high confidence",
  medium: "medium confidence",
  low: "low confidence",
} as const;

export function IdentifyClient({
  // Test hook: lets UI checks render results without calling the AI.
  initialState = { status: "idle" },
}: {
  initialState?: SuggestPlantsState;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<SuggestPlantsState>(initialState);
  const [detail, setDetail] = useState<RankedSuggestion | null>(null);

  // Runs as soon as a photo is taken or picked — no separate Identify button.
  function identify(file: File) {
    startTransition(async () => {
      // Oversized photos are downscaled in the browser instead of rejected.
      const prepared = await prepareImageForUpload(file);
      if (prepared.size > MAX_PHOTO_MB * 1024 * 1024) {
        setState({
          status: "error",
          message: photoTooLargeMessage(prepared.size),
        });
        return;
      }
      const fd = new FormData();
      fd.set("photo", prepared);
      setState(await suggestPlantsFromUpload(fd));
    });
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Clear so picking the same photo again re-triggers change.
    e.target.value = "";
    if (file) identify(file);
  }

  return (
    <div className="space-y-4">
      {/* Hidden inputs: `capture` opens the camera directly on mobile;
          the plain one opens the gallery/file picker. */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onPick}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        onChange={onPick}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          disabled={pending}
          className="btn btn-primary flex-col gap-1 rounded-2xl py-4 text-base"
        >
          <span aria-hidden="true" className="text-2xl leading-none">
            📷
          </span>
          Take a photo
        </button>
        <button
          type="button"
          onClick={() => galleryRef.current?.click()}
          disabled={pending}
          className="btn btn-ghost flex-col gap-1 rounded-2xl py-4 text-base"
        >
          <span aria-hidden="true" className="text-2xl leading-none">
            🖼️
          </span>
          Choose a photo
        </button>
      </div>

      {state.status === "error" && (
        <p className="card px-4 py-3 text-sm text-[var(--color-clay)]">
          {state.message}
        </p>
      )}

      {pending && <IdentifyLoading />}

      {!pending && state.status === "done" && !state.isPlant && (
        <p className="card px-4 py-3 text-sm text-[var(--color-muted)]">
          That doesn&apos;t look like a plant — try another photo with the
          plant clearly in view.
        </p>
      )}

      {!pending && state.status === "done" && state.isPlant && (
        <div className="space-y-3">
          {state.suggestions.length > 0 && (
            <p className="text-xs text-[var(--color-faint)]">
              Tap a card for details and more photos.
            </p>
          )}
          {state.suggestions.map((s, i) => (
            <article
              key={s.scientificName + i}
              role="button"
              tabIndex={0}
              onClick={() => setDetail(s)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setDetail(s);
                }
              }}
              className="card cursor-pointer space-y-3 p-4 transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-forest)]"
            >
              <div className="flex items-start gap-3">
                <WikiImage
                  scientificName={s.scientificName}
                  fallbackSrc={artFor(s)}
                  alt={s.scientificName}
                />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <h2 className="text-lg font-semibold leading-tight text-[var(--color-ink)]">
                    {s.swedishName || s.englishName}
                  </h2>
                  {s.swedishName && (
                    <p className="text-sm text-[var(--color-muted)]">
                      {s.englishName}
                    </p>
                  )}
                  <p className="text-sm italic text-[var(--color-muted)]">
                    {s.scientificName}
                  </p>
                  <span className="inline-block rounded-full bg-[var(--color-sage)] px-2 py-0.5 text-xs font-medium text-[var(--color-forest)]">
                    {confidenceLabel[s.confidence]}
                  </span>
                </div>
                <span
                  aria-hidden="true"
                  className="self-center text-lg text-[var(--color-faint)]"
                >
                  ›
                </span>
              </div>

              <p className="text-sm text-[var(--color-ink)]">{s.description}</p>
              <div className="space-y-1 text-sm text-[var(--color-muted)]">
                <p>
                  <span className="font-medium text-[var(--color-ink)]">
                    Care:
                  </span>{" "}
                  {s.careSummary}
                </p>
                <p>
                  <span className="font-medium text-[var(--color-ink)]">
                    Toxicity:
                  </span>{" "}
                  {s.toxicity}
                </p>
              </div>

              {s.matchedSpeciesId && (
                <Link
                  href={`/plants/new?speciesId=${s.matchedSpeciesId}`}
                  onClick={(e) => e.stopPropagation()}
                  className="btn btn-ghost"
                >
                  Add to my plants
                </Link>
              )}
            </article>
          ))}
          {state.suggestions.length === 0 && (
            <p className="card px-4 py-3 text-sm text-[var(--color-muted)]">
              Couldn&apos;t narrow this one down — try a closer photo of the
              leaves or flowers.
            </p>
          )}
        </div>
      )}

      {detail && (
        <PlantDetailSheet
          suggestion={detail}
          photoUrl={state.status === "done" ? state.photoUrl : null}
          fallbackSrc={artFor(detail)}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}
