/**
 * Reminder plumbing for the daily cron run.
 *
 * Pure-ish module: no DB access, no direct `process.env` reads, `fetch` is
 * injectable — so every branch here is unit-testable. The route only wires
 * this up to Prisma and the environment.
 *
 * Design rule after the reminders silently failed for a month: a single bad
 * plant, a flaky network or a half-configured environment must never take the
 * whole run down with an opaque 500. Everything that can fail is caught and
 * reported per plant.
 */

import { dueTasksFor, PlantWithRelations } from "./care";

export const NTFY_DEFAULT_SERVER = "https://ntfy.sh";

/** Just the variables this module reads — keeps tests free of `process.env`. */
export type ReminderEnv = Record<string, string | undefined>;

/**
 * Reads the ntfy topic from the environment. Accepts a bare topic name or a
 * full ntfy URL (easy to paste by mistake) and returns the topic either way.
 * Returns null when unset/blank — the one genuinely fatal misconfiguration.
 */
export function resolveNtfyTopic(
  env: ReminderEnv = process.env
): string | null {
  const raw = env.NTFY_TOPIC?.trim();
  if (!raw) return null;

  // "https://ntfy.sh/my-topic" or "ntfy.sh/my-topic" → "my-topic"
  const segments = raw
    .replace(/^https?:\/\//i, "")
    .split("/")
    .filter(Boolean);
  return segments[segments.length - 1] ?? null;
}

/** ntfy server to publish to (override with NTFY_SERVER for self-hosting). */
export function resolveNtfyServer(
  env: ReminderEnv = process.env
): string {
  const raw = env.NTFY_SERVER?.trim();
  if (!raw) return NTFY_DEFAULT_SERVER;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withScheme.replace(/\/+$/, "");
}

/**
 * Public base URL used for the notification's tap-through link. Optional:
 * without it the reminder still goes out, just without a deep link.
 * Falls back to Railway's injected public domain, and ignores the internal
 * `*.railway.internal` host (useless on a phone).
 */
export function resolveAppUrl(
  env: ReminderEnv = process.env
): string | null {
  const candidates = [
    env.APP_URL,
    env.NEXT_PUBLIC_APP_URL,
    env.RAILWAY_PUBLIC_DOMAIN,
  ];

  for (const candidate of candidates) {
    const raw = candidate?.trim();
    if (!raw) continue;
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const url = withScheme.replace(/\/+$/, "");

    let host: string;
    try {
      host = new URL(url).host;
    } catch {
      continue; // unparseable — try the next candidate
    }
    if (/\.railway\.internal(?::\d+)?$/i.test(host)) continue;

    return url;
  }
  return null;
}

export interface ReminderMessage {
  title: string;
  message: string;
}

/** Notification copy for a plant with at least one due task. */
export function reminderMessage(
  nickname: string,
  types: ReadonlyArray<"WATER" | "FERTILIZE">
): ReminderMessage {
  const water = types.includes("WATER");
  const fert = types.includes("FERTILIZE");

  const emoji = water && fert ? "💧🌱" : water ? "💧" : "🌱";
  const label =
    water && fert ? "Water + Fertilize" : water ? "Water" : "Fertilize";
  const verb =
    water && fert
      ? "needs watering and fertilizing"
      : water
        ? "needs watering"
        : "needs fertilizing";

  return {
    title: `${emoji} ${label}: ${nickname}`,
    message: `${nickname} ${verb} today.`,
  };
}

export interface ReminderFailure {
  /** Plant id, not the nickname — this ends up in a public Actions log. */
  plantId: string;
  error: string;
}

export interface ReminderReport {
  plants: number;
  due: number;
  sent: number;
  failures: ReminderFailure[];
}

export interface SendRemindersOptions {
  plants: PlantWithRelations[];
  topic: string;
  appUrl?: string | null;
  server?: string;
  today?: Date;
  fetchImpl?: typeof fetch;
  /** Attempts per notification (default 3). */
  attempts?: number;
  /** Base backoff between attempts; tests pass 0. */
  retryDelayMs?: number;
  onError?: (plant: PlantWithRelations, error: string) => void;
}

const sleep = (ms: number) =>
  ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();

const describeError = (err: unknown): string => {
  if (err instanceof Error) {
    // undici wraps the useful bit in `cause`.
    const cause = (err as { cause?: unknown }).cause;
    const causeMessage =
      cause instanceof Error
        ? cause.message
        : typeof cause === "string"
          ? cause
          : "";
    return causeMessage ? `${err.message} (${causeMessage})` : err.message;
  }
  return String(err);
};

/**
 * Publishes one notification, retrying transient failures (network errors,
 * 429, 5xx). A 4xx other than 429 won't fix itself, so it fails fast.
 */
async function publish(
  server: string,
  payload: Record<string, unknown>,
  { fetchImpl, attempts, retryDelayMs }: Required<
    Pick<SendRemindersOptions, "fetchImpl" | "attempts" | "retryDelayMs">
  >
): Promise<{ ok: true } | { ok: false; error: string }> {
  let lastError = "no attempt made";

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetchImpl(server, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });

      if (res.ok) return { ok: true };

      lastError = `HTTP ${res.status}`;
      if (res.status < 500 && res.status !== 429) {
        return { ok: false, error: lastError };
      }
    } catch (err) {
      lastError = describeError(err);
    }

    if (attempt < attempts) await sleep(retryDelayMs * attempt);
  }

  return { ok: false, error: lastError };
}

/**
 * Sends one notification per plant with due tasks. Never throws: per-plant
 * problems land in `report.failures` so the rest of the plants still get
 * their reminder.
 */
export async function sendReminders({
  plants,
  topic,
  appUrl = null,
  server = NTFY_DEFAULT_SERVER,
  today = new Date(),
  fetchImpl = fetch,
  attempts = 3,
  retryDelayMs = 500,
  onError,
}: SendRemindersOptions): Promise<ReminderReport> {
  const report: ReminderReport = {
    plants: plants.length,
    due: 0,
    sent: 0,
    failures: [],
  };

  for (const plant of plants) {
    let payload: Record<string, unknown>;

    try {
      const due = dueTasksFor(plant, today);
      if (due.length === 0) continue;
      report.due++;

      const { title, message } = reminderMessage(
        plant.nickname,
        due.map((task) => task.type)
      );

      payload = {
        topic,
        title,
        message,
        tags: ["potted_plant"],
        // JSON publishing (topic in the body) keeps emoji in titles intact,
        // unlike the header-based API.
        ...(appUrl ? { click: `${appUrl}/plants/${plant.id}` } : {}),
      };
    } catch (err) {
      const error = `could not build reminder: ${describeError(err)}`;
      report.failures.push({ plantId: plant.id, error });
      onError?.(plant, error);
      continue;
    }

    const result = await publish(server, payload, {
      fetchImpl,
      attempts,
      retryDelayMs,
    });

    if (result.ok) {
      report.sent++;
    } else {
      report.failures.push({ plantId: plant.id, error: result.error });
      onError?.(plant, result.error);
    }
  }

  return report;
}
