import type { Currency } from "./rates";

// Belopp i lokal valuta × kurs → hela kronor.
export function toSek(amount: number, rate: number): number {
  return Math.round(amount * rate);
}

// Svensk tusentalsavgränsare (hårt mellanslag) — egen implementation så att
// formatet är identiskt i tester, på servern och i alla webbläsare.
export function formatInt(n: number): string {
  const sign = n < 0 ? "−" : "";
  const digits = Math.abs(Math.round(n)).toString();
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return sign + grouped;
}

export function formatSek(n: number): string {
  return `${formatInt(n)} kr`;
}

// Svensk decimalkomma. Heltal utan decimaler, annars exakt två: 4.5 → "4,50".
export function formatAmount(n: number): string {
  if (Number.isInteger(n)) return formatInt(n);
  const abs = Math.abs(n);
  const intPart = Math.trunc(abs);
  const decPart = Math.round((abs - intPart) * 100)
    .toString()
    .padStart(2, "0");
  const sign = n < 0 ? "−" : "";
  return `${sign}${formatInt(intPart)},${decPart}`;
}

export function formatMoney(amount: number, currency: Currency): string {
  switch (currency) {
    case "EUR":
      return `${formatAmount(amount)} €`;
    case "CHF":
      return `${formatAmount(amount)} CHF`;
    case "SEK":
      return `${formatAmount(amount)} kr`;
  }
}

// Tolkar numpad-/formulärinmatning med svensk decimalkomma ("4,5").
// Punkt accepteras också. Max två decimaler. Ogiltigt/tomt → null.
export function parseAmount(input: string): number | null {
  const normalized = input.trim().replace(/\s| /g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  return value;
}
