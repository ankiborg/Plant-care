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

import { request as httpRequest, type IncomingMessage } from "node:http";
import { request as httpsRequest } from "node:https";

import { dueTasksFor, PlantWithRelations } from "./care";

export const NTFY_DEFAULT_SERVER = "https://ntfy.sh";

/** Just the variables this module reads — keeps tests free of `process.env`. */
export type ReminderEnv = Record<string, string | undefined>;

export type PublishResult = { ok: true } | { ok: false; error: string };

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
  /** Of `sent`, how many needed the IPv4 fallback (0 when fetch is healthy). */
  sentViaFallback: number;
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
  /**
   * Last-resort publisher used when `fetch` fails at the network layer.
   * Defaults to the IPv4-pinned node:https path.
   */
  fallbackPublish?: (
    server: string,
    payload: Record<string, unknown>
  ) => Promise<PublishResult>;
  onError?: (plant: PlantWithRelations, error: string) => void;
}

const sleep = (ms: number) =>
  ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();

/**
 * Flattens an error into something a GitHub Actions log can be debugged from.
 *
 * `fetch` says only "fetch failed" — the reason lives in `cause`, and for a
 * host that resolves to several addresses that cause is an AggregateError
 * holding one error per attempt (the IPv6/IPv4 pair, typically). Without
 * unwrapping both, a DNS failure, a refused connection and a blocked egress
 * all read identically.
 */
export function describeError(err: unknown, depth = 0): string {
  if (!(err instanceof Error)) return String(err);

  const code = (err as { code?: unknown }).code;
  const head = [err.message || err.name, typeof code === "string" ? code : ""]
    .filter(Boolean)
    .join(": ");

  if (depth >= 3) return head;

  const nested = err as { cause?: unknown; errors?: unknown };
  const inner: string[] = [];

  if (Array.isArray(nested.errors)) {
    for (const item of nested.errors.slice(0, 4)) {
      inner.push(describeError(item, depth + 1));
    }
  } else if (nested.cause !== undefined && nested.cause !== null) {
    inner.push(describeError(nested.cause, depth + 1));
  }

  const detail = inner.filter(Boolean).join("; ");
  return detail ? `${head} (${detail})` : head;
}

/**
 * Node prefers IPv6 addresses when a host has both, and a container without
 * working IPv6 egress then fails every request with a bare "fetch failed".
 * Best-effort, process-wide, and harmless where IPv6 works.
 */
async function preferIPv4(): Promise<void> {
  try {
    const dns = await import("node:dns");
    dns.setDefaultResultOrder("ipv4first");
  } catch {
    // Not fatal — the request may well work anyway.
  }
}

interface NodeRequestOptions {
  method: "GET" | "POST";
  body?: string;
  timeoutMs?: number;
}

/**
 * One request over node:http(s) with the address family pinned to IPv4.
 * Deliberately not `fetch`: this is the fallback for when undici's
 * dual-stack connect is what's broken.
 */
async function nodeRequest(
  target: string,
  { method, body, timeoutMs = 15_000 }: NodeRequestOptions
): Promise<PublishResult> {
  let url: URL;
  try {
    url = new URL(target);
  } catch {
    return { ok: false, error: `invalid URL: ${target}` };
  }

  const secure = url.protocol === "https:";
  // Statically imported on purpose: a computed `await import()` survives
  // typecheck and unit tests, then dies as MODULE_NOT_FOUND inside the
  // bundled route — exactly when this fallback is needed.
  const request = secure ? httpsRequest : httpRequest;

  return new Promise<PublishResult>((resolve) => {
    try {
      const req = request(
        {
          hostname: url.hostname,
          port: url.port || (secure ? 443 : 80),
          path: `${url.pathname}${url.search}`,
          method,
          family: 4,
          timeout: timeoutMs,
          headers: body
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(body),
              }
            : {},
        },
        (res: IncomingMessage) => {
          res.resume(); // drain, we only care about the status
          const status = res.statusCode ?? 0;
          resolve(
            status >= 200 && status < 300
              ? { ok: true }
              : { ok: false, error: `HTTP ${status}` }
          );
        }
      );

      req.on("timeout", () =>
        req.destroy(new Error(`timeout after ${timeoutMs}ms`))
      );
      req.on("error", (err: unknown) =>
        resolve({ ok: false, error: describeError(err) })
      );
      req.end(body);
    } catch (err) {
      resolve({ ok: false, error: describeError(err) });
    }
  });
}

/** Fallback publisher: same ntfy JSON payload, IPv4, no undici. */
export function publishViaNode(
  server: string,
  payload: Record<string, unknown>
): Promise<PublishResult> {
  return nodeRequest(server, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface NtfyReachability {
  /** Result of the normal `fetch` path — "ok" or the reason it failed. */
  fetch: string;
  /** Result of the IPv4-pinned node:https path. */
  ipv4: string;
}

/**
 * Pings ntfy's health endpoint over both transports. Sends no notification,
 * so it is safe to call from the config check.
 */
export async function probeNtfy(
  server: string = NTFY_DEFAULT_SERVER,
  fetchImpl: typeof fetch = fetch
): Promise<NtfyReachability> {
  const health = `${server.replace(/\/+$/, "")}/v1/health`;

  const viaFetch = await (async () => {
    try {
      const res = await fetchImpl(health, {
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
      return res.ok ? "ok" : `HTTP ${res.status}`;
    } catch (err) {
      return describeError(err);
    }
  })();

  const viaNode = await nodeRequest(health, { method: "GET", timeoutMs: 10_000 });

  return { fetch: viaFetch, ipv4: viaNode.ok ? "ok" : viaNode.error };
}

/**
 * Publishes one notification, retrying transient failures (network errors,
 * 429, 5xx). A 4xx other than 429 won't fix itself, so it fails fast.
 *
 * When every `fetch` attempt dies at the network layer — the Railway
 * symptom: a bare "fetch failed" for each plant, every morning — it retries
 * once over an IPv4-pinned node:https connection before giving up.
 */
async function publish(
  server: string,
  payload: Record<string, unknown>,
  { fetchImpl, attempts, retryDelayMs, fallbackPublish }: Required<
    Pick<
      SendRemindersOptions,
      "fetchImpl" | "attempts" | "retryDelayMs" | "fallbackPublish"
    >
  >
): Promise<PublishResult & { viaFallback?: boolean }> {
  let lastError = "no attempt made";
  let networkFailure = false;

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

      networkFailure = false;
      lastError = `HTTP ${res.status}`;
      if (res.status < 500 && res.status !== 429) {
        return { ok: false, error: lastError };
      }
    } catch (err) {
      networkFailure = true;
      lastError = describeError(err);
    }

    if (attempt < attempts) await sleep(retryDelayMs * attempt);
  }

  // ntfy answering with an error is a different story — only a connection
  // that never got made is worth trying over another transport.
  if (networkFailure) {
    const fallback = await fallbackPublish(server, payload);
    if (fallback.ok) return { ok: true, viaFallback: true };
    return { ok: false, error: `${lastError}; ipv4 fallback: ${fallback.error}` };
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
  fallbackPublish = publishViaNode,
  onError,
}: SendRemindersOptions): Promise<ReminderReport> {
  const report: ReminderReport = {
    plants: plants.length,
    due: 0,
    sent: 0,
    sentViaFallback: 0,
    failures: [],
  };

  await preferIPv4();

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
      fallbackPublish,
    });

    if (result.ok) {
      report.sent++;
      if (result.viaFallback) report.sentViaFallback++;
    } else {
      report.failures.push({ plantId: plant.id, error: result.error });
      onError?.(plant, result.error);
    }
  }

  return report;
}
