import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { DEFAULT_QUICK, pickPalette } from "@/lib/palette";
import { categoryToDto } from "@/lib/serialize";

const Body = z.object({
  tripId: z.string().min(1),
  name: z.string().trim().min(1).max(40),
  budgetSek: z.number().int().min(0).max(10000000),
  quick: z.array(z.number().positive()).max(4).optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ogiltig kategori." }, { status: 400 });
  }
  const { tripId, name, budgetSek, quick } = parsed.data;

  const existing = await prisma.category.findMany({ where: { tripId } });
  if (existing.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
    return NextResponse.json({ error: "Kategorin finns redan." }, { status: 409 });
  }
  const palette = pickPalette(existing.length);
  const sortOrder = existing.reduce((max, c) => Math.max(max, c.sortOrder), -1) + 1;

  const category = await prisma.category.create({
    data: {
      tripId,
      name,
      budgetSek,
      quick: quick ?? DEFAULT_QUICK,
      sortOrder,
      ...palette,
    },
  });
  return NextResponse.json(categoryToDto(category));
}
