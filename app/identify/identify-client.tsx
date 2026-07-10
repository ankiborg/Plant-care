"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { suggestPlantsFromUpload, SuggestPlantsState } from "@/lib/actions";
import { prepareImageForUpload } from "@/lib/image-resize";
import { MAX_PHOTO_MB, photoTooLargeMessage } from "@/lib/photo-limits";
import { speciesArt } from "@/lib/species-art";
import { IdentifyLoading } from "./identify-loading";
import { WikiImage } from "./wiki-image";

const confidenceLabel = {
  high: "high confidence",
  medium: "medium confidence",
  low: "low confidence",
} as const;

export function IdentifyClient() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<SuggestPlantsState>({ status: "idle" });

  function identify() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setState({ status: "error", message: "Choose a photo first." });
      return;
    }
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

  return (
    <div className="space-y-4">
      <div className="card space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            name="photo"
            accept="image/*"
            className="min-w-0 flex-1 text-sm text-[var(--color-muted)] file:mr-3 file:rounded-full file:border-0 file:bg-[var(--color-sage)] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-[var(--color-forest)]"
          />
          <button
            type="button"
            onClick={identify}
            disabled={pending}
            className="btn btn-primary shrink-0"
          >
            {pending ? "Identifying…" : "Identify"}
          </button>
        </div>
        {state.status === "error" && (
          <p className="text-sm text-[var(--color-clay)]">{state.message}</p>
        )}
      </div>

      {pending && <IdentifyLoading />}

      {!pending && state.status === "done" && !state.isPlant && (
        <p className="card px-4 py-3 text-sm text-[var(--color-muted)]">
          That doesn&apos;t look like a plant — try another photo with the
          plant clearly in view.
        </p>
      )}

      {!pending && state.status === "done" && state.isPlant && (
        <div className="space-y-3">
          {state.suggestions.map((s, i) => (
            <article key={s.scientificName + i} className="card space-y-3 p-4">
              <div className="flex items-start gap-3">
                <WikiImage
                  scientificName={s.scientificName}
                  fallbackSrc={
                    s.matchedCommonName
                      ? speciesArt(s.matchedCommonName)
                      : "/species/generic.svg"
                  }
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
    </div>
  );
}
