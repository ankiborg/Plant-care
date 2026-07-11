// Pure helpers for looking up plant photos on Wikipedia. Runs in the browser
// (no server-only import) — the client fetches directly so the app server
// never talks to Wikimedia.

export type WikiLang = "sv" | "en";

/** REST summary endpoint, e.g. https://sv.wikipedia.org/api/rest_v1/page/summary/Monstera_deliciosa */
export function wikipediaSummaryUrl(lang: WikiLang, title: string): string {
  const slug = encodeURIComponent(title.trim().replace(/ /g, "_"));
  return `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${slug}`;
}

/** REST media-list endpoint — all images on a page, for the detail gallery. */
export function wikipediaMediaListUrl(lang: WikiLang, title: string): string {
  const slug = encodeURIComponent(title.trim().replace(/ /g, "_"));
  return `https://${lang}.wikipedia.org/api/rest_v1/page/media-list/${slug}`;
}

/**
 * Pull photo URLs out of a media-list payload. Skips non-image entries and
 * SVGs (maps/icons), fixes protocol-relative URLs, caps the count.
 */
export function extractWikipediaImages(payload: unknown, max = 6): string[] {
  if (typeof payload !== "object" || payload === null) return [];
  const items = (payload as { items?: unknown }).items;
  if (!Array.isArray(items)) return [];

  const urls: string[] = [];
  for (const item of items) {
    if (urls.length >= max) break;
    if (typeof item !== "object" || item === null) continue;
    const it = item as { type?: unknown; srcset?: unknown };
    if (it.type !== "image" || !Array.isArray(it.srcset)) continue;
    const first = it.srcset[0] as { src?: unknown } | undefined;
    const src = typeof first?.src === "string" ? first.src : null;
    if (!src) continue;
    const url = src.startsWith("//") ? `https:${src}` : src;
    if (/\.svg(\?|$)/i.test(url)) continue;
    urls.push(url);
  }
  return urls;
}

/**
 * Pull a usable image URL out of a summary payload. Prefers the thumbnail
 * (~320px, right size for a result card) over the full-size original.
 * Returns null when the payload has no image or isn't the expected shape.
 */
export function extractWikipediaImage(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const p = payload as {
    thumbnail?: { source?: unknown };
    originalimage?: { source?: unknown };
  };
  if (typeof p.thumbnail?.source === "string") return p.thumbnail.source;
  if (typeof p.originalimage?.source === "string") return p.originalimage.source;
  return null;
}
