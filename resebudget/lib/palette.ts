// Färgpar för kategorier som skapas i appen (seed-kategorierna har sina
// egna färger). Väljs runt-och-runt utifrån hur många kategorier resan har.
export const EXTRA_PALETTE: { color: string; softColor: string }[] = [
  { color: "#7A5EA3", softColor: "#EDE9F4" },
  { color: "#2E8A83", softColor: "#E2F0EF" },
  { color: "#B25B4C", softColor: "#F5E7E4" },
  { color: "#4E7A38", softColor: "#E7F0DF" },
  { color: "#8A6A9E", softColor: "#F0EAF4" },
  { color: "#3A6E8A", softColor: "#E3EDF3" },
];

export function pickPalette(existingCount: number) {
  return EXTRA_PALETTE[existingCount % EXTRA_PALETTE.length];
}

export const DEFAULT_QUICK = [5, 10, 20, 40];
