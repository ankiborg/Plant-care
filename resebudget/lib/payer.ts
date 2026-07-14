export const PAYERS = ["A", "J"] as const;
export type Payer = (typeof PAYERS)[number];

export const PAYER_NAMES: Record<Payer, string> = {
  A: "Annika",
  J: "Jamie",
};

export function isPayer(value: string): value is Payer {
  return (PAYERS as readonly string[]).includes(value);
}
