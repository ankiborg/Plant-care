"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RankedSuggestion } from "@/lib/actions";
import {
  extractWikipediaImages,
  wikipediaMediaListUrl,
  WikiLang,
} from "@/lib/wikipedia";

// One media-list lookup per species, shared across opens (browser-side —
// the app server never talks to Wikimedia).
const galleryLookups = new Map<string, Promise<string[]>>();

async function fetchGallery(scientificName: string): Promise<string[]> {
  const langs: WikiLang[] = ["sv", "en"];
  for (const lang of langs) {
    try {
      const res = await fetch(wikipediaMediaListUrl(lang, scientificName));
      if (!res.ok) continue;
      const images = extractWikipediaImages(await res.json());
      if (images.length > 0) return images;
    } catch {
      // Network failure on one language — still try the next.
    }
  }
  return [];
}

function lookupGallery(scientificName: string): Promise<string[]> {
  let promise = galleryLookups.get(scientificName);
  if (!promise) {
    promise = fetchGallery(scientificName);
    galleryLookups.set(scientificName, promise);
  }
  return promise;
}

const confidenceLabel = {
  high: "high confidence",
  medium: "medium confidence",
  low: "low confidence",
} as const;

/**
 * Bottom sheet with full details for one identification suggestion: large
 * photos from Wikipedia (tap for fullscreen), all names and the AI's info.
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
  const [wikiImages, setWikiImages] = useState<string[]>([]);
  const [fullscreen, setFullscreen] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    lookupGallery(suggestion.scientificName).then((urls) => {
      if (!cancelled) setWikiImages(urls);
    });
    return () => {
      cancelled = true;
    };
  }, [suggestion.scientificName]);

  // Escape closes (fullscreen first), and page scroll is locked while open.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setFullscreen((current) => {
        if (current) return null;
        onClose();
        return current;
      });
    }
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  // Her own photo first, then Wikipedia's; the illustration as last resort.
  const gallery = [
    ...(photoUrl ? [photoUrl] : []),
    ...wikiImages.filter((url) => url !== photoUrl),
  ];
  const hero = gallery[0] ?? fallbackSrc;

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

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={hero}
          alt={suggestion.scientificName}
          referrerPolicy="no-referrer"
          onClick={() => gallery.length > 0 && setFullscreen(hero)}
          className="h-56 w-full cursor-zoom-in rounded-2xl bg-[var(--color-surface-2)] object-cover"
        />

        {gallery.length > 1 && (
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {gallery.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={url}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
                onClick={() => setFullscreen(url)}
                className="h-20 w-20 shrink-0 cursor-zoom-in rounded-xl bg-[var(--color-surface-2)] object-cover"
              />
            ))}
          </div>
        )}

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

      {fullscreen && (
        <button
          type="button"
          aria-label="Close fullscreen image"
          onClick={() => setFullscreen(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fullscreen}
            alt={suggestion.scientificName}
            referrerPolicy="no-referrer"
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        </button>
      )}
    </div>
  );
}
