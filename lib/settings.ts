// Pure helpers for the app settings (shared client/server, no Prisma).

export const MIN_ZONE = 1;
export const MAX_ZONE = 8; // Swedish växtzon scale

/** Parse a Swedish hardiness zone (1–8) from form input; null = not set. */
export function parseHardinessZone(value: unknown): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const zone = Number(value);
  return Number.isInteger(zone) && zone >= MIN_ZONE && zone <= MAX_ZONE
    ? zone
    : null;
}
