// Pure helpers for looking up plant photos on Wikipedia. Runs in the browser
// (no server-only import) — the client fetches directly so the app server
// never talks to Wikimedia.

export type WikiLang = "sv" | "en";

/** REST summary endpoint, e.g. https://sv.wikipedia.org/api/rest_v1/page/summary/Monstera_deliciosa */
export function wikipediaSummaryUrl(lang: WikiLang, title: string): string {
  const slug = encodeURIComponent(title.trim().replace(/ /g, "_"));
  return `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${slug}`;
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
