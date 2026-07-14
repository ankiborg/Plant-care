import type { Currency } from "./rates";
import type { Payer } from "./payer";

// DTO:er som API:et skickar och klienten lagrar i IndexedDB.
// Decimal-fält serialiseras som number, datum som ISO-strängar.

export type TripDto = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
};

export type CategoryDto = {
  id: string;
  name: string;
  budgetSek: number;
  color: string;
  softColor: string;
  quick: number[];
  sortOrder: number;
};

export type ExpenseDto = {
  clientId: string;
  tripId: string;
  categoryId: string;
  amount: number;
  currency: Currency;
  rate: number;
  amountSek: number;
  payer: Payer;
  note: string | null;
  spentAt: string;
  createdAt: string;
};

export type ActiveTripDto = {
  trip: TripDto | null;
  categories: CategoryDto[];
  rates: Record<string, number>;
  expenses: ExpenseDto[];
};
