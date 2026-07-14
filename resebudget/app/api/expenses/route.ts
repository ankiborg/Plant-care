import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { toSek } from "@/lib/money";
import { expenseToDto } from "@/lib/serialize";

const Body = z.object({
  clientId: z.string().min(8),
  tripId: z.string().min(1),
  categoryId: z.string().min(1),
  amount: z.number().positive().max(9999999),
  currency: z.enum(["EUR", "CHF", "SEK"]),
  rate: z.number().positive().max(999999),
  payer: z.enum(["A", "J"]),
  note: z.string().max(500).nullish(),
  spentAt: z.string().datetime({ offset: true }).or(z.string().datetime()),
});

// Skapa/uppdatera utgift. Upsert på clientId gör anropet idempotent så att
// offline-kön kan skicka samma utgift flera gånger utan dubbletter.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ogiltig utgift." }, { status: 400 });
  }
  const b = parsed.data;
  const amountSek = toSek(b.amount, b.rate);
  const fields = {
    categoryId: b.categoryId,
    amount: b.amount,
    currency: b.currency,
    rate: b.rate,
    amountSek,
    payer: b.payer,
    note: b.note ?? null,
    spentAt: new Date(b.spentAt),
  };
  try {
    const expense = await prisma.expense.upsert({
      where: { clientId: b.clientId },
      update: fields,
      create: { ...fields, clientId: b.clientId, tripId: b.tripId },
    });
    return NextResponse.json(expenseToDto(expense));
  } catch {
    // T.ex. kategori som tagits bort på en annan enhet.
    return NextResponse.json(
      { error: "Kunde inte spara utgiften (finns kategorin kvar?)." },
      { status: 400 },
    );
  }
}
