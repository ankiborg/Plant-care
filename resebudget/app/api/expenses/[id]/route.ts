import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { applyExpensePatch } from "@/lib/expense-calc";
import { expenseToDto } from "@/lib/serialize";
import type { Currency } from "@/lib/rates";

type Params = { params: Promise<{ id: string }> };

const Patch = z.object({
  amount: z.number().positive().max(9999999).optional(),
  currency: z.enum(["EUR", "CHF", "SEK"]).optional(),
  categoryId: z.string().min(1).optional(),
  payer: z.enum(["A", "J"]).optional(),
  note: z.string().max(500).nullish(),
  spentAt: z.string().optional(),
});

// :id accepterar både databas-id och clientId (offline-klienten kan bara sitt clientId).
async function findExpense(id: string) {
  return prisma.expense.findFirst({ where: { OR: [{ clientId: id }, { id }] } });
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const existing = await findExpense(id);
  if (!existing) {
    return NextResponse.json({ error: "Utgiften finns inte." }, { status: 404 });
  }
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ogiltig ändring." }, { status: 400 });
  }
  const patch = parsed.data;

  const fxRates = await prisma.fxRate.findMany();
  const rates: Record<string, number> = {};
  for (const fx of fxRates) rates[fx.currency] = Number(fx.rateSek);

  const amounts = applyExpensePatch(
    {
      amount: Number(existing.amount),
      currency: existing.currency as Currency,
      rate: Number(existing.rate),
    },
    { amount: patch.amount, currency: patch.currency },
    rates,
  );

  const updated = await prisma.expense.update({
    where: { id: existing.id },
    data: {
      ...amounts,
      ...(patch.categoryId ? { categoryId: patch.categoryId } : {}),
      ...(patch.payer ? { payer: patch.payer } : {}),
      ...(patch.note !== undefined ? { note: patch.note } : {}),
      ...(patch.spentAt ? { spentAt: new Date(patch.spentAt) } : {}),
    },
  });
  return NextResponse.json(expenseToDto(updated));
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  // deleteMany → idempotent: att ta bort något som redan är borta är ok.
  await prisma.expense.deleteMany({ where: { OR: [{ clientId: id }, { id }] } });
  return NextResponse.json({ ok: true });
}
