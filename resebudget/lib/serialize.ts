import "server-only";
import type { Category, Expense, Trip } from "@prisma/client";
import type { CategoryDto, ExpenseDto, TripDto } from "./types";
import type { Currency } from "./rates";
import type { Payer } from "./payer";

export function tripToDto(trip: Trip): TripDto {
  return {
    id: trip.id,
    name: trip.name,
    startDate: trip.startDate.toISOString(),
    endDate: trip.endDate.toISOString(),
  };
}

export function categoryToDto(cat: Category): CategoryDto {
  return {
    id: cat.id,
    name: cat.name,
    budgetSek: cat.budgetSek,
    color: cat.color,
    softColor: cat.softColor,
    quick: cat.quick,
    sortOrder: cat.sortOrder,
  };
}

export function expenseToDto(e: Expense): ExpenseDto {
  return {
    clientId: e.clientId,
    tripId: e.tripId,
    categoryId: e.categoryId,
    amount: Number(e.amount),
    currency: e.currency as Currency,
    rate: Number(e.rate),
    amountSek: e.amountSek,
    payer: e.payer as Payer,
    note: e.note,
    spentAt: e.spentAt.toISOString(),
    createdAt: e.createdAt.toISOString(),
  };
}
