import { beforeEach, describe, expect, it, vi } from "vitest";

// server-only throws outside a server bundle; stub it for the test runner.
vi.mock("server-only", () => ({}));

// Stub the Anthropic SDK: `new Anthropic()` → { messages: { create } }.
const create = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create };
  },
}));

const reply = (obj: unknown, stop_reason = "end_turn") => ({
  stop_reason,
  content: [{ type: "text", text: JSON.stringify(obj) }],
});

const candidates = [
  { id: "sp_monstera", commonName: "Monstera", scientificName: "Monstera deliciosa" },
  { id: "sp_pothos", commonName: "Pothos", scientificName: "Epipremnum aureum" },
];

describe("identifySpecies", () => {
  // resetModules so the vision module's cached Anthropic client is rebuilt per
  // test — avoids a cross-test quirk where a mock throwing on a client created
  // in an earlier test is misattributed by the runner.
  beforeEach(() => {
    create.mockReset();
    vi.resetModules();
  });

  it("maps a matched id straight through", async () => {
    create.mockResolvedValue(
      reply({
        matchedSpeciesId: "sp_monstera",
        guessCommonName: "Monstera",
        guessScientificName: "Monstera deliciosa",
        confidence: "high",
        reasoning: "Fenestrated leaves.",
      })
    );
    const { identifySpecies } = await import("./vision");
    const r = await identifySpecies("https://img/x.jpg", candidates);
    expect(r).toEqual({
      matchedSpeciesId: "sp_monstera",
      guessCommonName: "Monstera",
      guessScientificName: "Monstera deliciosa",
      confidence: "high",
    });
  });

  it("turns an empty match into null", async () => {
    create.mockResolvedValue(
      reply({
        matchedSpeciesId: "",
        guessCommonName: "Fiddle leaf fig",
        guessScientificName: "Ficus lyrata",
        confidence: "medium",
        reasoning: "Large violin-shaped leaves.",
      })
    );
    const { identifySpecies } = await import("./vision");
    const r = await identifySpecies("https://img/x.jpg", candidates);
    expect(r).toMatchObject({ matchedSpeciesId: null, guessCommonName: "Fiddle leaf fig" });
  });

  it("returns an error shape on refusal instead of throwing", async () => {
    create.mockResolvedValue(reply({}, "refusal"));
    const { identifySpecies } = await import("./vision");
    const r = await identifySpecies("https://img/x.jpg", candidates);
    expect(r).toHaveProperty("error");
  });

  it("returns an error shape when the SDK throws", async () => {
    // synchronous throw — avoids vitest flagging an awaited rejected promise
    create.mockImplementation(() => {
      throw new Error("no api key");
    });
    const { identifySpecies } = await import("./vision");
    const r = await identifySpecies("https://img/x.jpg", candidates);
    expect(r).toHaveProperty("error");
  });
});

describe("suggestPlants", () => {
  beforeEach(() => {
    create.mockReset();
    vi.resetModules();
  });

  const twoSuggestions = {
    isPlant: true,
    suggestions: [
      {
        scientificName: "Monstera deliciosa",
        englishName: "Swiss cheese plant",
        swedishName: "Monstera",
        confidence: "high",
        description: "En klättrande växt.",
        careSummary: "Ljust utan direkt sol.",
        toxicity: "Giftig för husdjur.",
      },
      {
        scientificName: "Monstera adansonii",
        englishName: "Swiss cheese vine",
        swedishName: "",
        confidence: "low",
        description: "En mindre släkting.",
        careSummary: "Samma skötsel.",
        toxicity: "Giftig för husdjur.",
      },
    ],
  };

  it("passes ranked suggestions through and requests Swedish by default", async () => {
    create.mockResolvedValue(reply(twoSuggestions));
    const { suggestPlants } = await import("./vision");
    const r = await suggestPlants("https://img/x.jpg");
    expect(r).toEqual(twoSuggestions);

    const params = create.mock.calls[0][0];
    expect(params.max_tokens).toBe(2048);
    expect(params.messages[0].content[1].text).toContain("in Swedish");
  });

  it("threads the language option into the prompt", async () => {
    create.mockResolvedValue(reply({ isPlant: true, suggestions: [] }));
    const { suggestPlants } = await import("./vision");
    await suggestPlants("https://img/x.jpg", { language: "en" });
    const params = create.mock.calls[0][0];
    expect(params.messages[0].content[1].text).toContain("in English");
  });

  it("passes a non-plant verdict through", async () => {
    create.mockResolvedValue(reply({ isPlant: false, suggestions: [] }));
    const { suggestPlants } = await import("./vision");
    const r = await suggestPlants("https://img/x.jpg");
    expect(r).toEqual({ isPlant: false, suggestions: [] });
  });

  it("returns an error shape on refusal instead of throwing", async () => {
    create.mockResolvedValue(reply({}, "refusal"));
    const { suggestPlants } = await import("./vision");
    const r = await suggestPlants("https://img/x.jpg");
    expect(r).toHaveProperty("error");
  });

  it("returns an error shape when the SDK throws", async () => {
    create.mockImplementation(() => {
      throw new Error("no api key");
    });
    const { suggestPlants } = await import("./vision");
    const r = await suggestPlants("https://img/x.jpg");
    expect(r).toHaveProperty("error");
  });
});
