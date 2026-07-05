import { NextRequest, NextResponse } from "next/server";
import { dueTasksFor, PlantWithRelations } from "@/lib/care";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Called daily by the plant-reminders GitHub Action. Sends one ntfy
 * notification per plant with any due/overdue task. Overdue plants keep
 * pinging every day until the task is marked done — intentional, no dedup.
 */
export async function POST(req: NextRequest) {
  if (req.headers.get("x-cron-secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const topic = process.env.NTFY_TOPIC;
  const appUrl = process.env.APP_URL;
  if (!topic || !appUrl) {
    return NextResponse.json(
      { error: "NTFY_TOPIC and APP_URL must be configured" },
      { status: 500 }
    );
  }

  const plants = (await prisma.plant.findMany({
    where: { archived: false },
    include: { species: true, logs: true, photos: true },
  })) as PlantWithRelations[];

  let sent = 0;
  const failures: string[] = [];

  for (const plant of plants) {
    const due = dueTasksFor(plant);
    if (due.length === 0) continue;

    const water = due.some((t) => t.type === "WATER");
    const fert = due.some((t) => t.type === "FERTILIZE");

    const emoji = water && fert ? "💧🌱" : water ? "💧" : "🌱";
    const label =
      water && fert ? "Water + Fertilize" : water ? "Water" : "Fertilize";
    const verb =
      water && fert
        ? "needs watering and fertilizing"
        : water
          ? "needs watering"
          : "needs fertilizing";

    // JSON publishing (topic in the body) — unlike raw headers, this keeps
    // emoji/UTF-8 in titles intact.
    const res = await fetch("https://ntfy.sh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic,
        title: `${emoji} ${label}: ${plant.nickname}`,
        message: `${plant.nickname} ${verb} today.`,
        click: `${appUrl}/plants/${plant.id}`,
        tags: ["potted_plant"],
      }),
    });

    if (res.ok) sent++;
    else failures.push(`${plant.nickname}: HTTP ${res.status}`);
  }

  return NextResponse.json(
    failures.length > 0 ? { sent, failures } : { sent }
  );
}
