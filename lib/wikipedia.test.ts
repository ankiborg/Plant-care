import { describe, expect, it } from "vitest";
import {
  extractWikipediaImage,
  extractWikipediaImages,
  wikipediaMediaListUrl,
  wikipediaSummaryUrl,
} from "./wikipedia";

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

describe("wikipediaMediaListUrl", () => {
  it("builds the media-list URL with underscores for spaces", () => {
    expect(wikipediaMediaListUrl("sv", "Saxifraga umbrosa")).toBe(
      "https://sv.wikipedia.org/api/rest_v1/page/media-list/Saxifraga_umbrosa"
    );
  });
});

describe("extractWikipediaImages", () => {
  const img = (src: string, type = "image") => ({ type, srcset: [{ src }] });

  it("collects image URLs and fixes protocol-relative sources", () => {
    expect(
      extractWikipediaImages({
        items: [img("//upload.wikimedia.org/a.jpg"), img("https://x/b.jpg")],
      })
    ).toEqual(["https://upload.wikimedia.org/a.jpg", "https://x/b.jpg"]);
  });

  it("skips non-images, SVGs and malformed entries", () => {
    expect(
      extractWikipediaImages({
        items: [
          img("//x/map.svg"),
          img("//x/video.webm", "video"),
          { type: "image" }, // no srcset
          { type: "image", srcset: [{}] }, // no src
          null,
          img("//x/photo.jpg"),
        ],
      })
    ).toEqual(["https://x/photo.jpg"]);
  });

  it("caps the number of images", () => {
    const items = Array.from({ length: 10 }, (_, i) => img(`//x/${i}.jpg`));
    expect(extractWikipediaImages({ items }, 6)).toHaveLength(6);
  });

  it("returns [] for broken payloads", () => {
    expect(extractWikipediaImages(null)).toEqual([]);
    expect(extractWikipediaImages({})).toEqual([]);
    expect(extractWikipediaImages({ items: "nope" })).toEqual([]);
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
