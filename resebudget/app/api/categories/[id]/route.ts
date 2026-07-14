import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { categoryToDto } from "@/lib/serialize";

type Params = { params: Promise<{ id: string }> };

const Patch = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  budgetSek: z.number().int().min(0).max(10000000).optional(),
  quick: z.array(z.number().positive()).max(4).optional(),
});

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ogiltig ändring." }, { status: 400 });
  }
  try {
    const category = await prisma.category.update({ where: { id }, data: parsed.data });
    return NextResponse.json(categoryToDto(category));
  } catch {
    return NextResponse.json({ error: "Kategorin finns inte." }, { status: 404 });
  }
}

// Ta bort kategori. Kategorier med utgifter kräver ?moveTo=<kategori-id> —
// utgifterna flyttas dit (t.ex. Övrigt) innan kategorin tas bort.
export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params;
  const moveTo = new URL(req.url).searchParams.get("moveTo");

  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { expenses: true } } },
  });
  if (!category) return NextResponse.json({ ok: true });

  if (category._count.expenses > 0) {
    if (!moveTo || moveTo === id) {
      return NextResponse.json(
        { error: "Kategorin har utgifter.", count: category._count.expenses },
        { status: 409 },
      );
    }
    const target = await prisma.category.findUnique({ where: { id: moveTo } });
    if (!target || target.tripId !== category.tripId) {
      return NextResponse.json({ error: "Målkategorin finns inte." }, { status: 400 });
    }
    await prisma.expense.updateMany({ where: { categoryId: id }, data: { categoryId: moveTo } });
  }

  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
