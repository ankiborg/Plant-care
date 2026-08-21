import { NextRequest, NextResponse } from "next/server";
import { PlantWithRelations } from "@/lib/care";
import { prisma } from "@/lib/prisma";
import {
  probeNtfy,
  resolveAppUrl,
  resolveNtfyServer,
  resolveNtfyTopic,
  sendReminders,
} from "@/lib/reminders";

export const dynamic = "force-dynamic";

function unauthorized(req: NextRequest): boolean {
  return req.headers.get("x-cron-secret") !== process.env.CRON_SECRET;
}

/**
 * Config check for the daily run — same secret, sends nothing. Handy when
 * the cron fails and you need to know whether it's the environment or ntfy.
 */
export async function GET(req: NextRequest) {
  if (unauthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const topic = resolveNtfyTopic();
  const server = resolveNtfyServer();
  let plants: number | null = null;
  let database = "ok";

  try {
    plants = await prisma.plant.count({ where: { archived: false } });
  } catch (err) {
    database = err instanceof Error ? err.message : String(err);
  }

  // Can this host actually reach ntfy? Both transports, no notification.
  const ntfyReachable = await probeNtfy(server).catch((err: unknown) => ({
    fetch: err instanceof Error ? err.message : String(err),
    ipv4: "not probed",
  }));

  return NextResponse.json({
    ntfyTopic: topic ? "configured" : "missing",
    ntfyServer: server,
    ntfyReachable,
    // Only used for the tap-through link; reminders go out without it.
    appUrl: resolveAppUrl() ? "configured" : "missing",
    database,
    plants,
  });
}

/**
 * Called daily by the plant-reminders GitHub Action. Sends one ntfy
 * notification per plant with any due/overdue task. Overdue plants keep
 * pinging every day until the task is marked done — intentional, no dedup.
 *
 * Status codes are what the workflow reports on, so they mean something:
 * 401 wrong secret · 500 misconfigured or DB down · 502 ntfy rejected every
 * notification · 200 everything (or at least something) went out, with any
 * per-plant failures listed in the body.
 */
export async function POST(req: NextRequest) {
  if (unauthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const topic = resolveNtfyTopic();
  if (!topic) {
    return NextResponse.json(
      {
        error:
          "NTFY_TOPIC is not set on the app service — set it in Railway and redeploy",
      },
      { status: 500 }
    );
  }

  let plants: PlantWithRelations[];
  try {
    plants = (await prisma.plant.findMany({
      where: { archived: false },
      include: { species: true, logs: true, photos: true },
    })) as PlantWithRelations[];
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[reminders] could not load plants:", message);
    return NextResponse.json(
      { error: `database unavailable: ${message}` },
      { status: 500 }
    );
  }

  const report = await sendReminders({
    plants,
    topic,
    appUrl: resolveAppUrl(),
    server: resolveNtfyServer(),
    onError: (plant, error) =>
      console.error(`[reminders] ${plant.nickname}: ${error}`),
  });

  if (report.sentViaFallback > 0) {
    console.warn(
      `[reminders] ${report.sentViaFallback} notification(s) needed the IPv4 fallback — fetch to ntfy is failing on this host`
    );
  }

  // Every notification bounced — the run is broken, not merely imperfect.
  const allFailed = report.sent === 0 && report.failures.length > 0;
  if (allFailed) {
    console.error(
      `[reminders] all ${report.failures.length} notifications failed`
    );
  }

  return NextResponse.json(report, { status: allFailed ? 502 : 200 });
}
