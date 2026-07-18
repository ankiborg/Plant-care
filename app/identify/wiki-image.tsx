"use client";

import { useEffect, useState } from "react";
import { extractWikipediaImage, wikipediaSummaryUrl, WikiLang } from "@/lib/wikipedia";

// Wikipedia lookups happen in the browser (the app server never talks to
// Wikimedia). Dedupe repeated lookups for the same species across cards.
const lookups = new Map<string, Promise<string | null>>();

async function fetchImage(scientificName: string): Promise<string | null> {
  const langs: WikiLang[] = ["sv", "en"];
  for (const lang of langs) {
    try {
      const res = await fetch(wikipediaSummaryUrl(lang, scientificName));
      if (!res.ok) continue;
      const image = extractWikipediaImage(await res.json());
      if (image) return image;
    } catch {
      // Network failure on one language — still try the next.
    }
  }
  return null;
}

export function lookupImage(scientificName: string): Promise<string | null> {
  let promise = lookups.get(scientificName);
  if (!promise) {
    promise = fetchImage(scientificName);
    lookups.set(scientificName, promise);
  }
  return promise;
}

/**
 * Example photo for a suggested species, looked up on Wikipedia by the
 * scientific name (Swedish Wikipedia first, then English). Shows the
 * illustrated fallback until a photo arrives — or forever if none exists.
 */
export function WikiImage({
  scientificName,
  fallbackSrc,
  alt,
  className = "h-20 w-20 shrink-0 rounded-xl bg-[var(--color-surface-2)] object-cover",
}: {
  scientificName: string;
  fallbackSrc: string;
  alt: string;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    lookupImage(scientificName).then((url) => {
      if (!cancelled && url) setSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [scientificName]);

  /* eslint-disable-next-line @next/next/no-img-element */
  return (
    <img
      src={src ?? fallbackSrc}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setSrc(null)}
      className={className}
    />
  );
}
