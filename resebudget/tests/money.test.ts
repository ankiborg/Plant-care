import { describe, expect, it } from "vitest";
import { formatAmount, formatInt, formatMoney, formatSek, parseAmount, toSek } from "@/lib/money";

describe("toSek", () => {
  it("räknar om och avrundar till hel krona", () => {
    expect(toSek(4.5, 11.2)).toBe(50); // 50,4 → 50
    expect(toSek(3, 11.2)).toBe(34); // 33,6 → 34
    expect(toSek(100, 12)).toBe(1200);
    expect(toSek(10, 1)).toBe(10);
  });
});

describe("formatInt", () => {
  it("grupperar tusental med hårt mellanslag", () => {
    expect(formatInt(0)).toBe("0");
    expect(formatInt(999)).toBe("999");
    expect(formatInt(1000)).toBe("1 000");
    expect(formatInt(1234567)).toBe("1 234 567");
  });
});

describe("formatSek", () => {
  it("lägger till kr", () => {
    expect(formatSek(10000)).toBe("10 000 kr");
  });
});

describe("formatAmount", () => {
  it("heltal utan decimaler, annars två med komma", () => {
    expect(formatAmount(4)).toBe("4");
    expect(formatAmount(4.5)).toBe("4,50");
    expect(formatAmount(1234.5)).toBe("1 234,50");
    expect(formatAmount(0.05)).toBe("0,05");
  });
});

describe("formatMoney", () => {
  it("formaterar per valuta", () => {
    expect(formatMoney(4.5, "EUR")).toBe("4,50 €");
    expect(formatMoney(12, "CHF")).toBe("12 CHF");
    expect(formatMoney(25, "SEK")).toBe("25 kr");
  });
});

describe("parseAmount", () => {
  it("tolkar svensk decimalkomma", () => {
    expect(parseAmount("4,5")).toBe(4.5);
    expect(parseAmount("4.5")).toBe(4.5);
    expect(parseAmount("100")).toBe(100);
    expect(parseAmount("0,05")).toBe(0.05);
  });
  it("avvisar ogiltig inmatning", () => {
    expect(parseAmount("")).toBeNull();
    expect(parseAmount(",")).toBeNull();
    expect(parseAmount("4,555")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount("-5")).toBeNull();
  });
});
