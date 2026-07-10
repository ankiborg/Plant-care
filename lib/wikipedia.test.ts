import { describe, expect, it } from "vitest";
import { extractWikipediaImage, wikipediaSummaryUrl } from "./wikipedia";

describe("wikipediaSummaryUrl", () => {
  it("builds the sv summary URL with underscores for spaces", () => {
    expect(wikipediaSummaryUrl("sv", "Monstera deliciosa")).toBe(
      "https://sv.wikipedia.org/api/rest_v1/page/summary/Monstera_deliciosa"
    );
  });

  it("trims and percent-encodes special characters", () => {
    expect(wikipediaSummaryUrl("en", "  Ficus 'Alii'  ")).toBe(
      "https://en.wikipedia.org/api/rest_v1/page/summary/Ficus_'Alii'"
    );
    expect(wikipediaSummaryUrl("sv", "Rosa × damascena")).toBe(
      "https://sv.wikipedia.org/api/rest_v1/page/summary/Rosa_%C3%97_damascena"
    );
  });
});

describe("extractWikipediaImage", () => {
  it("prefers the thumbnail over the original image", () => {
    expect(
      extractWikipediaImage({
        thumbnail: { source: "https://img/thumb.jpg" },
        originalimage: { source: "https://img/full.jpg" },
      })
    ).toBe("https://img/thumb.jpg");
  });

  it("falls back to the original image", () => {
    expect(
      extractWikipediaImage({ originalimage: { source: "https://img/full.jpg" } })
    ).toBe("https://img/full.jpg");
  });

  it("returns null for payloads without an image", () => {
    expect(extractWikipediaImage({})).toBeNull();
    expect(extractWikipediaImage(null)).toBeNull();
    expect(extractWikipediaImage("not an object")).toBeNull();
    expect(extractWikipediaImage({ thumbnail: {} })).toBeNull();
    expect(extractWikipediaImage({ thumbnail: { source: 42 } })).toBeNull();
  });
});
