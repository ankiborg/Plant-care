import "server-only";
import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-opus-4-8";

let cached: Anthropic | null = null;
function client(): Anthropic {
  if (!cached) cached = new Anthropic();
  return cached;
}

/** Pull the first text block out of a message response. */
function textOf(message: Anthropic.Message): string {
  for (const block of message.content) {
    if (block.type === "text") return block.text;
  }
  return "";
}

/**
 * Run a vision request constrained to a JSON schema and parse the result.
 * Returns the parsed object, or an `{ error }` shape the UI can render — never
 * throws, so callers don't have to wrap every call.
 */
async function visionJson<T>(
  imageUrl: string,
  prompt: string,
  schema: Record<string, unknown>,
  opts: { maxTokens?: number } = {}
): Promise<T | { error: string }> {
  try {
    const message = await client().messages.create({
      model: MODEL,
      max_tokens: opts.maxTokens ?? 1024,
      // Simple perception task — keep effort (and cost/latency) low.
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema },
      },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "url", url: imageUrl } },
            { type: "text", text: prompt },
          ],
        },
      ],
    } as Anthropic.MessageCreateParamsNonStreaming);

    if (message.stop_reason === "refusal") {
      return { error: "The model declined to analyze that image." };
    }

    const raw = textOf(message);
    if (!raw) return { error: "No response from the model." };
    return JSON.parse(raw) as T;
  } catch (e) {
    // Log the detail for the server operator; show the user a clean message.
    // Most common cause in practice: a missing/invalid ANTHROPIC_API_KEY.
    console.error("[vision] request failed:", e);
    return {
      error:
        "Couldn't reach the photo recognition service. Check that ANTHROPIC_API_KEY is set, or try again.",
    };
  }
}

export interface SpeciesCandidate {
  id: string;
  commonName: string;
  scientificName: string | null;
}

export interface SpeciesGuess {
  matchedSpeciesId: string; // "" when none of the candidates match
  guessCommonName: string;
  guessScientificName: string;
  confidence: "high" | "medium" | "low";
  reasoning: string;
}

const SPECIES_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    matchedSpeciesId: {
      type: "string",
      description:
        "The id of the matching candidate species, or an empty string if none match.",
    },
    guessCommonName: { type: "string" },
    guessScientificName: { type: "string" },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    reasoning: { type: "string" },
  },
  required: [
    "matchedSpeciesId",
    "guessCommonName",
    "guessScientificName",
    "confidence",
    "reasoning",
  ],
} as const;

export async function identifySpecies(
  imageUrl: string,
  candidates: SpeciesCandidate[]
): Promise<
  | {
      matchedSpeciesId: string | null;
      guessCommonName: string;
      guessScientificName: string;
      confidence: "high" | "medium" | "low";
    }
  | { error: string }
> {
  const list = candidates
    .map(
      (c) =>
        `- id=${c.id} | ${c.commonName}${
          c.scientificName ? ` (${c.scientificName})` : ""
        }`
    )
    .join("\n");

  const prompt = `You are a botanist identifying a houseplant from a photo.

Here is the user's known species list:
${list}

Identify the plant in the image. If it clearly matches one of the species above,
put that species' id in "matchedSpeciesId". If it doesn't match any (or you're
unsure), set "matchedSpeciesId" to an empty string and still give your best
"guessCommonName"/"guessScientificName". Set "confidence" to how sure you are
that the plant is the species you named. Keep "reasoning" to one short sentence.`;

  const result = await visionJson<SpeciesGuess>(imageUrl, prompt, SPECIES_SCHEMA);
  if ("error" in result) return result;

  return {
    matchedSpeciesId: result.matchedSpeciesId || null,
    guessCommonName: result.guessCommonName,
    guessScientificName: result.guessScientificName,
    confidence: result.confidence,
  };
}

// --- Open-ended identification (any plant, ranked suggestions) ---

/** Language the prose fields (description/care/toxicity) are written in. */
export type InfoLanguage = "sv" | "en";

const LANGUAGE_NAMES: Record<InfoLanguage, string> = {
  sv: "Swedish",
  en: "English",
};

export interface PlantSuggestion {
  scientificName: string;
  englishName: string;
  swedishName: string; // "" when no established Swedish name exists
  confidence: "high" | "medium" | "low";
  description: string;
  careSummary: string;
  toxicity: string;
}

export interface PlantSuggestions {
  isPlant: boolean;
  suggestions: PlantSuggestion[]; // ranked, most likely first, max 3
}

const SUGGEST_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    isPlant: {
      type: "boolean",
      description: "false if the image clearly contains no plant",
    },
    suggestions: {
      type: "array",
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          scientificName: { type: "string" },
          englishName: { type: "string" },
          swedishName: {
            type: "string",
            description:
              "Established Swedish common name, or empty string if none exists",
          },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
          description: {
            type: "string",
            description: "2-3 sentences: what the plant is, where it grows",
          },
          careSummary: {
            type: "string",
            description: "1-2 sentences: light, water, hardiness",
          },
          toxicity: {
            type: "string",
            description:
              "One sentence on toxicity to pets/children, or that it is considered safe",
          },
        },
        required: [
          "scientificName",
          "englishName",
          "swedishName",
          "confidence",
          "description",
          "careSummary",
          "toxicity",
        ],
      },
    },
  },
  required: ["isPlant", "suggestions"],
} as const;

export async function suggestPlants(
  imageUrl: string,
  opts: { language?: InfoLanguage } = {}
): Promise<PlantSuggestions | { error: string }> {
  const languageName = LANGUAGE_NAMES[opts.language ?? "sv"];

  const prompt = `You are a botanist identifying a plant from a photo. It can
be any kind of plant: a houseplant, garden plant, wild flower, tree or shrub.

Give up to 3 ranked candidates for what the plant is, most likely first. For
each candidate provide the exact scientific (Latin) name, the common English
name, and the established Swedish common name (empty string if none exists).
Write "description", "careSummary" and "toxicity" in ${languageName}. Keep
each text field short. If the image contains no plant at all, set isPlant to
false and return an empty suggestions array.`;

  return visionJson<PlantSuggestions>(imageUrl, prompt, SUGGEST_SCHEMA, {
    // Three candidates with prose fields don't fit in the default 1024.
    maxTokens: 2048,
  });
}

export interface Diagnosis {
  overall: "looks_healthy" | "needs_attention";
  issues: string[];
  suggestions: string[];
}

const DIAGNOSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    overall: { type: "string", enum: ["looks_healthy", "needs_attention"] },
    issues: {
      type: "array",
      items: { type: "string" },
      description: "Visible problems, e.g. yellowing leaves, brown tips, pests.",
    },
    suggestions: {
      type: "array",
      items: { type: "string" },
      description: "Short, actionable care suggestions.",
    },
  },
  required: ["overall", "issues", "suggestions"],
} as const;

export async function diagnosePlant(
  imageUrl: string,
  context: { commonName: string; light: string; soil: string; potSize: string }
): Promise<Diagnosis | { error: string }> {
  const prompt = `You are a plant-care expert assessing a ${context.commonName}
from a photo. Its current setup: light=${context.light}, soil=${context.soil},
pot size=${context.potSize}.

Look for visible health problems (yellowing, browning, wilting, spots, pests,
over- or under-watering, etc.). Set "overall" to "looks_healthy" only if you see
no clear problems. List concrete "issues" you can actually see (empty array if
none) and short, practical "suggestions" (empty array if none). Be concise and
don't invent problems that aren't visible.`;

  return visionJson<Diagnosis>(imageUrl, prompt, DIAGNOSIS_SCHEMA);
}
