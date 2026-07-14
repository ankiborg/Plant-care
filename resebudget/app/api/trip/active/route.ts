import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { categoryToDto, expenseToDto, tripToDto } from "@/lib/serialize";
import type { ActiveTripDto } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const [trip, fxRates] = await Promise.all([
    prisma.trip.findFirst({
      where: { isActive: true },
      include: {
        categories: { orderBy: { sortOrder: "asc" } },
        expenses: { orderBy: { spentAt: "desc" } },
      },
    }),
    prisma.fxRate.findMany(),
  ]);

  const rates: Record<string, number> = {};
  for (const fx of fxRates) rates[fx.currency] = Number(fx.rateSek);

  const payload: ActiveTripDto = trip
    ? {
        trip: tripToDto(trip),
        categories: trip.categories.map(categoryToDto),
        rates,
        expenses: trip.expenses.map(expenseToDto),
      }
    : { trip: null, categories: [], rates, expenses: [] };

  return NextResponse.json(payload);
}
