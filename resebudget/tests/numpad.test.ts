import { describe, expect, it } from "vitest";
import { pressKey, type PadKey } from "@/lib/numpad";

function type(keys: PadKey[]): string {
  return keys.reduce((cur, key) => pressKey(cur, key), "");
}

describe("pressKey", () => {
  it("bygger upp ett belopp", () => {
    expect(type(["4", ",", "5"])).toBe("4,5");
    expect(type(["1", "2", "0"])).toBe("120");
  });

  it("komma på tom inmatning ger 0,", () => {
    expect(type([","])).toBe("0,");
    expect(type([",", "5"])).toBe("0,5");
  });

  it("tillåter bara ett komma", () => {
    expect(type(["4", ",", ",", "5"])).toBe("4,5");
  });

  it("max två decimaler", () => {
    expect(type(["4", ",", "5", "5", "5"])).toBe("4,55");
  });

  it("ersätter inledande nolla", () => {
    expect(type(["0", "5"])).toBe("5");
  });

  it("backsteg raderar", () => {
    expect(type(["4", ",", "5", "back"])).toBe("4,");
    expect(type(["4", "back", "back"])).toBe("");
  });

  it("max sex heltalssiffror", () => {
    expect(type(["9", "9", "9", "9", "9", "9", "9"])).toBe("999999");
  });
});
