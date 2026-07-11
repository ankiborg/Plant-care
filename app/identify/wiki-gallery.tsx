"use client";

import { useEffect, useState } from "react";
import {
  extractWikipediaImages,
  wikipediaMediaListUrl,
  WikiLang,
} from "@/lib/wikipedia";

// One media-list lookup per species, shared across mounts (browser-side —
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

/**
 * Large hero photo + horizontal thumbnail strip for a species, with
 * tap-to-fullscreen. Photos come from Wikipedia (sv → en), preceded by the
 * user's own photo when given; the illustrated art is the last resort.
 */
export function WikiGallery({
  scientificName,
  photoUrl,
  fallbackSrc,
  alt,
}: {
  scientificName: string;
  photoUrl: string | null;
  fallbackSrc: string;
  alt: string;
}) {
  const [wikiImages, setWikiImages] = useState<string[]>([]);
  const [fullscreen, setFullscreen] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    lookupGallery(scientificName).then((urls) => {
      if (!cancelled) setWikiImages(urls);
    });
    return () => {
      cancelled = true;
    };
  }, [scientificName]);

  // Escape closes fullscreen (the sheet's own Escape handler checks this).
  useEffect(() => {
    if (!fullscreen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        // Capture-phase + stopPropagation: close only the fullscreen image,
        // not a parent sheet listening for the same key.
        e.stopPropagation();
        setFullscreen(null);
      }
    }
    document.addEventListener("keydown", onKey, { capture: true });
    return () =>
      document.removeEventListener("keydown", onKey, { capture: true });
  }, [fullscreen]);

  const gallery = [
    ...(photoUrl ? [photoUrl] : []),
    ...wikiImages.filter((url) => url !== photoUrl),
  ];
  const hero = gallery[0] ?? fallbackSrc;

  return (
    <div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={hero}
        alt={alt}
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
            alt={alt}
            referrerPolicy="no-referrer"
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        </button>
      )}
    </div>
  );
}
