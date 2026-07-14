export type PadKey =
  | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
  | ","
  | "back";

const MAX_INT_DIGITS = 6;
const MAX_DECIMALS = 2;

// Ren tillståndsövergång för numpaden: nuvarande inmatningssträng + tangent
// → ny sträng. Strängen använder svensk decimalkomma, t.ex. "4,5".
export function pressKey(current: string, key: PadKey): string {
  if (key === "back") return current.slice(0, -1);

  if (key === ",") {
    if (current.includes(",")) return current;
    return current === "" ? "0," : current + ",";
  }

  // siffra
  if (current.includes(",")) {
    const decimals = current.split(",")[1] ?? "";
    if (decimals.length >= MAX_DECIMALS) return current;
    return current + key;
  }
  if (current === "0") return key; // ersätt inledande nolla
  if (current.length >= MAX_INT_DIGITS) return current;
  return current + key;
}
