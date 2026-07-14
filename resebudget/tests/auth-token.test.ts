import { describe, expect, it } from "vitest";
import { authToken } from "@/lib/auth-token";

describe("authToken", () => {
  it("är deterministisk", async () => {
    expect(await authToken("1234")).toBe(await authToken("1234"));
  });
  it("olika PIN ger olika token", async () => {
    expect(await authToken("1234")).not.toBe(await authToken("4321"));
  });
  it("ser ut som sha256-hex", async () => {
    expect(await authToken("1234")).toMatch(/^[0-9a-f]{64}$/);
  });
});
