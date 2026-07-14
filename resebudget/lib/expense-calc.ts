import { toSek, parseAmount } from "./money";
import type { Currency } from "./rates";

export type ExpenseAmounts = {
  amount: number;
  currency: Currency;
  rate: number;
  amountSek: number;
};

// Redigeringsregeln från kravspecen: behåll den ursprungliga kursen om
// valutan inte ändras; byts valutan används aktuell kurs för den nya
// valutan. amountSek räknas alltid om.
export function applyExpensePatch(
  existing: { amount: number; currency: Currency; rate: number },
  patch: { amount?: number; currency?: Currency },
  currentRates: Record<string, number>,
): ExpenseAmounts {
  const amount = patch.amount ?? existing.amount;
  const currency = patch.currency ?? existing.currency;
  const currencyChanged = currency !== existing.currency;
  const rate = currencyChanged ? (currentRates[currency] ?? existing.rate) : existing.rate;
  return { amount, currency, rate, amountSek: toSek(amount, rate) };
}

// Validering av ett nytt utgiftsbelopp från inmatningsvyn.
export function validateEntry(amountInput: string): number | null {
  const amount = parseAmount(amountInput);
  if (amount === null || amount <= 0) return null;
  return amount;
}
