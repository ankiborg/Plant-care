import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const Body = z.object({
  EUR: z.number().positive().max(1000).optional(),
  CHF: z.number().positive().max(1000).optional(),
});

// Uppdatera kurser. Påverkar bara nya utgifter — varje utgift bär sin egen kurs.
export async function PATCH(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ogiltiga kurser." }, { status: 400 });
  }
  for (const [currency, rateSek] of Object.entries(parsed.data)) {
    if (rateSek === undefined) continue;
    await prisma.fxRate.upsert({
      where: { currency },
      update: { rateSek },
      create: { currency, rateSek },
    });
  }
  const fxRates = await prisma.fxRate.findMany();
  const rates: Record<string, number> = {};
  for (const fx of fxRates) rates[fx.currency] = Number(fx.rateSek);
  return NextResponse.json({ rates });
}
