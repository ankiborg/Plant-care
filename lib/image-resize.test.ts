import { describe, expect, it } from "vitest";
import { pickScaledDimensions, prepareImageForUpload } from "./image-resize";

describe("pickScaledDimensions", () => {
  it("leaves images within the limit untouched", () => {
    expect(pickScaledDimensions(1200, 800, 2048)).toEqual({
      width: 1200,
      height: 800,
    });
  });

  it("never upscales", () => {
    expect(pickScaledDimensions(400, 300, 2048)).toEqual({
      width: 400,
      height: 300,
    });
  });

  it("scales landscape images down preserving aspect ratio", () => {
    expect(pickScaledDimensions(4096, 3072, 2048)).toEqual({
      width: 2048,
      height: 1536,
    });
  });

  it("scales portrait images by the longest side", () => {
    expect(pickScaledDimensions(3000, 6000, 2048)).toEqual({
      width: 1024,
      height: 2048,
    });
  });

  it("never collapses a dimension to zero", () => {
    const { width, height } = pickScaledDimensions(10000, 2, 2048);
    expect(width).toBe(2048);
    expect(height).toBeGreaterThanOrEqual(1);
  });
});

describe("prepareImageForUpload", () => {
  it("returns small files unchanged without touching the DOM", async () => {
    const file = new File([new Uint8Array(1024)], "leaf.jpg", {
      type: "image/jpeg",
    });
    // Runs in node (no DOM): reaching the canvas path would throw, so this
    // also proves the under-threshold branch never decodes.
    expect(await prepareImageForUpload(file)).toBe(file);
  });

  it("falls back to the original when the image can't be decoded", async () => {
    // > 7 MB of garbage: triggers the resize path; createImageBitmap doesn't
    // exist in node, so the catch must return the original file.
    const file = new File([new Uint8Array(8 * 1024 * 1024)], "big.heic", {
      type: "image/heic",
    });
    expect(await prepareImageForUpload(file)).toBe(file);
  });
});

describe("LOADING_MESSAGES", () => {
  it("has several unique messages", async () => {
    const { LOADING_MESSAGES } = await import(
      "../app/identify/identify-loading"
    );
    expect(LOADING_MESSAGES.length).toBeGreaterThanOrEqual(4);
    expect(new Set(LOADING_MESSAGES).size).toBe(LOADING_MESSAGES.length);
  });
});
