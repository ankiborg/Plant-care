// Låsta defaultkurser (~1,5 % över mid-market 14 juli 2026, ungefär kortets
// växlingspåslag). Går att ändra i inställningarna — ändringen påverkar bara
// nya utgifter eftersom kursen sparas per utgift.
export const DEFAULT_RATES: Record<string, number> = {
  EUR: 11.2,
  CHF: 12.0,
  SEK: 1.0,
};

export const CURRENCIES = ["EUR", "CHF", "SEK"] as const;
export type Currency = (typeof CURRENCIES)[number];

export function isCurrency(value: string): value is Currency {
  return (CURRENCIES as readonly string[]).includes(value);
}
