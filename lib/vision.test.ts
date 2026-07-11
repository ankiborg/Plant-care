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

  it("sends a schema without unsupported array constraints", async () => {
    // Structured outputs reject maxItems/minItems with a 400 — the API then
    // surfaces a misleading "check ANTHROPIC_API_KEY" error to the user.
    create.mockResolvedValue(reply({ isPlant: true, suggestions: [] }));
    const { suggestPlants } = await import("./vision");
    await suggestPlants("https://img/x.jpg");
    const schema = create.mock.calls[0][0].output_config.format.schema;
    expect(JSON.stringify(schema)).not.toMatch(/maxItems|minItems/);
  });

  it("includes home fields in prompt and schema only when home is set", async () => {
    create.mockResolvedValue(reply({ isPlant: true, suggestions: [] }));
    const { suggestPlants } = await import("./vision");

    await suggestPlants("https://img/x.jpg", {
      home: { location: "Umeå", zone: 5 },
    });
    let params = create.mock.calls[0][0];
    expect(params.max_tokens).toBe(3072);
    expect(params.messages[0].content[1].text).toContain("Umeå");
    expect(params.messages[0].content[1].text).toContain("zone 5");
    let schemaJson = JSON.stringify(params.output_config.format.schema);
    expect(schemaJson).toContain("suitability");
    expect(schemaJson).toContain("plantingTips");
    expect(schemaJson).not.toMatch(/maxItems|minItems|minLength|maxLength/);

    await suggestPlants("https://img/x.jpg");
    params = create.mock.calls[1][0];
    expect(params.max_tokens).toBe(2048);
    schemaJson = JSON.stringify(params.output_config.format.schema);
    expect(schemaJson).not.toContain("suitability");
    expect(schemaJson).not.toContain("plantingTips");
  });

  it("caps the suggestions list at 3", async () => {
    const extra = {
      scientificName: "Extra plantus",
      englishName: "Extra",
      swedishName: "",
      confidence: "low",
      description: "x",
      careSummary: "x",
      toxicity: "x",
    };
    create.mockResolvedValue(
      reply({ isPlant: true, suggestions: [extra, extra, extra, extra, extra] })
    );
    const { suggestPlants } = await import("./vision");
    const r = await suggestPlants("https://img/x.jpg");
    if ("error" in r) throw new Error("unexpected error");
    expect(r.suggestions).toHaveLength(3);
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
