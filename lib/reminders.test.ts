import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlantWithRelations } from "./care";
import {
  reminderMessage,
  resolveAppUrl,
  resolveNtfyServer,
  resolveNtfyTopic,
  sendReminders,
} from "./reminders";

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

/** Thirsty by default: watered long ago, so it's due on `today`. */
function plant(overrides: Partial<PlantWithRelations> = {}): PlantWithRelations {
  return {
    id: "p1",
    nickname: "Basilika",
    speciesId: "s1",
    location: null,
    potSize: "MEDIUM",
    soil: "STANDARD",
    light: "MEDIUM",
    acquiredAt: day("2026-05-01"),
    archived: false,
    createdAt: day("2026-05-01"),
    updatedAt: day("2026-05-01"),
    species: {
      id: "s1",
      commonName: "Basil",
      scientificName: "Ocimum basilicum",
      baseWaterDays: 3,
      baseFertDays: null,
      lightPref: "BRIGHT_INDIRECT",
      defaultSoil: "STANDARD",
      toxicToPets: false,
      notes: null,
    },
    logs: [],
    photos: [],
    ...overrides,
  } as PlantWithRelations;
}

const ok = () => new Response(null, { status: 200 });
const send = (options: Parameters<typeof sendReminders>[0]) =>
  sendReminders({ retryDelayMs: 0, today: day("2026-06-01"), ...options });

describe("resolveNtfyTopic", () => {
  it("returns null when unset or blank", () => {
    expect(resolveNtfyTopic({})).toBeNull();
    expect(resolveNtfyTopic({ NTFY_TOPIC: "   " })).toBeNull();
  });

  it("keeps a bare topic and unwraps a pasted ntfy URL", () => {
    expect(resolveNtfyTopic({ NTFY_TOPIC: " secret-topic " })).toBe(
      "secret-topic"
    );
    expect(
      resolveNtfyTopic({ NTFY_TOPIC: "https://ntfy.sh/secret-topic" })
    ).toBe("secret-topic");
    expect(resolveNtfyTopic({ NTFY_TOPIC: "ntfy.sh/secret-topic/" })).toBe(
      "secret-topic"
    );
  });
});

describe("resolveNtfyServer", () => {
  it("defaults to ntfy.sh and normalizes an override", () => {
    expect(resolveNtfyServer({})).toBe("https://ntfy.sh");
    expect(resolveNtfyServer({ NTFY_SERVER: "ntfy.example.com/" })).toBe(
      "https://ntfy.example.com"
    );
  });
});

describe("resolveAppUrl", () => {
  it("prefers APP_URL and strips trailing slashes", () => {
    expect(resolveAppUrl({ APP_URL: "https://plants.example.com/" })).toBe(
      "https://plants.example.com"
    );
  });

  it("falls back to Railway's public domain", () => {
    expect(
      resolveAppUrl({ RAILWAY_PUBLIC_DOMAIN: "plants.up.railway.app" })
    ).toBe("https://plants.up.railway.app");
  });

  it("ignores the internal Railway host, which is useless on a phone", () => {
    expect(
      resolveAppUrl({
        APP_URL: "http://plant-care.railway.internal:8080",
        RAILWAY_PUBLIC_DOMAIN: "plants.up.railway.app",
      })
    ).toBe("https://plants.up.railway.app");
  });

  it("returns null when nothing usable is configured", () => {
    expect(resolveAppUrl({})).toBeNull();
    expect(resolveAppUrl({ APP_URL: "  " })).toBeNull();
  });
});

describe("reminderMessage", () => {
  it("combines water and fertilize into one notification", () => {
    expect(reminderMessage("Basilika", ["WATER", "FERTILIZE"])).toEqual({
      title: "💧🌱 Water + Fertilize: Basilika",
      message: "Basilika needs watering and fertilizing today.",
    });
  });

  it("covers the single-task wording", () => {
    expect(reminderMessage("Basilika", ["WATER"]).title).toBe(
      "💧 Water: Basilika"
    );
    expect(reminderMessage("Basilika", ["FERTILIZE"]).message).toBe(
      "Basilika needs fertilizing today."
    );
  });
});

describe("sendReminders", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("publishes one notification per due plant, skipping the rest", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok());

    const report = await send({
      plants: [
        plant(),
        plant({ id: "p2", nickname: "Fresh", acquiredAt: day("2026-06-01") }),
      ],
      topic: "secret-topic",
      appUrl: "https://plants.example.com",
      fetchImpl,
    });

    expect(report).toEqual({ plants: 2, due: 1, sent: 1, failures: [] });
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body).toMatchObject({
      topic: "secret-topic",
      title: "💧 Water: Basilika",
      click: "https://plants.example.com/plants/p1",
    });
  });

  it("still sends without APP_URL, just without the deep link", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok());

    const report = await send({
      plants: [plant()],
      topic: "secret-topic",
      appUrl: null,
      fetchImpl,
    });

    expect(report.sent).toBe(1);
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body).click).toBeUndefined();
  });

  it("retries a network error and reports success", async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(
        Object.assign(new Error("fetch failed"), {
          cause: new Error("ENOTFOUND ntfy.sh"),
        })
      )
      .mockResolvedValue(ok());

    const report = await send({
      plants: [plant()],
      topic: "secret-topic",
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(report).toEqual({ plants: 1, due: 1, sent: 1, failures: [] });
  });

  it("gives up after the retries and records why, without throwing", async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValue(
        Object.assign(new Error("fetch failed"), {
          cause: new Error("ENOTFOUND ntfy.sh"),
        })
      );

    const report = await send({
      plants: [plant()],
      topic: "secret-topic",
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(report.sent).toBe(0);
    expect(report.failures).toEqual([
      { plantId: "p1", error: "fetch failed (ENOTFOUND ntfy.sh)" },
    ]);
  });

  it("does not retry a client error from ntfy", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 400 }));

    const report = await send({
      plants: [plant()],
      topic: "secret-topic",
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(report.failures).toEqual([{ plantId: "p1", error: "HTTP 400" }]);
  });

  it("keeps going when one plant fails", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 400 }))
      .mockResolvedValue(ok());

    const report = await send({
      plants: [plant(), plant({ id: "p2", nickname: "Monstera" })],
      topic: "secret-topic",
      fetchImpl,
    });

    expect(report.sent).toBe(1);
    expect(report.due).toBe(2);
    expect(report.failures).toHaveLength(1);
  });

  it("reports a broken plant row instead of taking the run down", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok());
    const broken = plant({ id: "bad" });
    // A plant whose species failed to load: the old route threw a TypeError
    // here and every reminder that day was lost.
    (broken as { species: unknown }).species = null;

    const report = await send({
      plants: [broken, plant()],
      topic: "secret-topic",
      fetchImpl,
    });

    expect(report.sent).toBe(1);
    expect(report.failures[0].plantId).toBe("bad");
    expect(report.failures[0].error).toMatch(/could not build reminder/);
  });
});
