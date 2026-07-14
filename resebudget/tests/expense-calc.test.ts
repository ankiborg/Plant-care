import { describe, expect, it } from "vitest";
import { applyExpensePatch, validateEntry } from "@/lib/expense-calc";

const rates = { EUR: 11.5, CHF: 12.5, SEK: 1 };

describe("applyExpensePatch", () => {
  const existing = { amount: 10, currency: "EUR" as const, rate: 11.2 };

  it("behåller ursprunglig kurs när valutan inte ändras", () => {
    const result = applyExpensePatch(existing, { amount: 20 }, rates);
    expect(result.rate).toBe(11.2);
    expect(result.amountSek).toBe(224);
  });

  it("använder aktuell kurs när valutan byts", () => {
    const result = applyExpensePatch(existing, { currency: "CHF" }, rates);
    expect(result.rate).toBe(12.5);
    expect(result.amountSek).toBe(125);
  });

  it("samma valuta uttryckligen angiven ändrar inte kursen", () => {
    const result = applyExpensePatch(existing, { amount: 5, currency: "EUR" }, rates);
    expect(result.rate).toBe(11.2);
    expect(result.amountSek).toBe(56);
  });

  it("faller tillbaka på gammal kurs om den nya valutan saknar kurs", () => {
    const result = applyExpensePatch(existing, { currency: "CHF" }, {});
    expect(result.rate).toBe(11.2);
  });
});

describe("validateEntry", () => {
  it("godkänner positiva belopp", () => {
    expect(validateEntry("4,5")).toBe(4.5);
  });
  it("avvisar noll, tomt och skräp", () => {
    expect(validateEntry("0")).toBeNull();
    expect(validateEntry("")).toBeNull();
    expect(validateEntry("0,")).toBeNull();
  });
});
