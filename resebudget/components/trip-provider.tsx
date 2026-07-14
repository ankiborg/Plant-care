"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  idbGetAllExpenses,
  idbGetBootstrap,
  idbGetExpense,
  idbOutboxCount,
  idbPutExpense,
  idbQueue,
  type Bootstrap,
  type LocalExpense,
} from "@/lib/idb";
import { syncNow } from "@/lib/sync";
import { applyExpensePatch } from "@/lib/expense-calc";
import type { CategoryDto, TripDto } from "@/lib/types";
import type { Currency } from "@/lib/rates";
import type { Payer } from "@/lib/payer";

export type CategoryWithSpent = CategoryDto & { spentSek: number };

export type NewExpense = {
  categoryId: string;
  amount: number;
  currency: Currency;
  payer: Payer;
  note: string | null;
  spentAt: string;
};

export type ExpensePatch = {
  amount?: number;
  currency?: Currency;
  categoryId?: string;
  payer?: Payer;
  note?: string | null;
  spentAt?: string;
};

type TripContextValue = {
  ready: boolean;
  online: boolean;
  trip: TripDto | null;
  categories: CategoryWithSpent[];
  rates: Record<string, number>;
  expenses: LocalExpense[]; // ej borttagna, nyast först
  pending: number;
  addExpense: (input: NewExpense) => Promise<void>;
  updateExpense: (clientId: string, patch: ExpensePatch) => Promise<void>;
  deleteExpense: (clientId: string) => Promise<void>;
  restoreExpense: (expense: LocalExpense) => Promise<void>;
  refresh: () => Promise<void>;
};

const TripContext = createContext<TripContextValue | null>(null);

export function useTrip(): TripContextValue {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error("useTrip måste användas inuti TripProvider");
  return ctx;
}

export function TripProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(true);
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [allExpenses, setAllExpenses] = useState<LocalExpense[]>([]);
  const [pending, setPending] = useState(0);
  const mounted = useRef(true);

  // Läs om allt från IndexedDB — den enda källan UI:t litar på.
  const reload = useCallback(async () => {
    const [boot, expenses, count] = await Promise.all([
      idbGetBootstrap(),
      idbGetAllExpenses(),
      idbOutboxCount(),
    ]);
    if (!mounted.current) return;
    setBootstrap(boot);
    setAllExpenses(expenses);
    setPending(count);
    setReady(true);
  }, []);

  const sync = useCallback(async () => {
    await syncNow();
    await reload();
  }, [reload]);

  useEffect(() => {
    mounted.current = true;
    setOnline(navigator.onLine);
    reload().then(() => sync());

    const onOnline = () => {
      setOnline(true);
      void sync();
    };
    const onOffline = () => setOnline(false);
    const onVisible = () => {
      if (document.visibilityState === "visible") void sync();
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisible);
    const interval = setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine) void sync();
    }, 30_000);

    return () => {
      mounted.current = false;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(interval);
    };
  }, [reload, sync]);

  const addExpense = useCallback(
    async (input: NewExpense) => {
      const trip = bootstrap?.trip;
      if (!trip) return;
      const rate = bootstrap.rates[input.currency] ?? 1;
      const expense: LocalExpense = {
        clientId: crypto.randomUUID(),
        tripId: trip.id,
        categoryId: input.categoryId,
        amount: input.amount,
        currency: input.currency,
        rate,
        amountSek: Math.round(input.amount * rate),
        payer: input.payer,
        note: input.note,
        spentAt: input.spentAt,
        createdAt: new Date().toISOString(),
      };
      await idbPutExpense(expense);
      await idbQueue(expense.clientId, "upsert");
      await reload();
      void sync();
    },
    [bootstrap, reload, sync],
  );

  const updateExpense = useCallback(
    async (clientId: string, patch: ExpensePatch) => {
      const existing = await idbGetExpense(clientId);
      if (!existing) return;
      const amounts = applyExpensePatch(
        existing,
        { amount: patch.amount, currency: patch.currency },
        bootstrap?.rates ?? {},
      );
      const updated: LocalExpense = {
        ...existing,
        ...amounts,
        categoryId: patch.categoryId ?? existing.categoryId,
        payer: patch.payer ?? existing.payer,
        note: patch.note !== undefined ? patch.note : existing.note,
        spentAt: patch.spentAt ?? existing.spentAt,
      };
      await idbPutExpense(updated);
      await idbQueue(clientId, "upsert");
      await reload();
      void sync();
    },
    [bootstrap, reload, sync],
  );

  const deleteExpense = useCallback(
    async (clientId: string) => {
      const existing = await idbGetExpense(clientId);
      if (!existing) return;
      await idbPutExpense({ ...existing, deleted: true });
      await idbQueue(clientId, "delete");
      await reload();
      void sync();
    },
    [reload, sync],
  );

  // Ångra borttagning: skriv tillbaka en sparad kopia och köa en ny upsert.
  // Kopian kommer från UI:t (undo-toasten) eftersom IndexedDB-posten kan ha
  // städats bort så fort delete-synken gått klart. Upserten återskapar
  // utgiften på servern även om delete redan hunnit fram.
  const restoreExpense = useCallback(
    async (expense: LocalExpense) => {
      await idbPutExpense({ ...expense, deleted: false });
      await idbQueue(expense.clientId, "upsert");
      await reload();
      void sync();
    },
    [reload, sync],
  );

  const expenses = useMemo(
    () =>
      allExpenses
        .filter((e) => !e.deleted)
        .sort((a, b) => new Date(b.spentAt).getTime() - new Date(a.spentAt).getTime()),
    [allExpenses],
  );

  const categories = useMemo<CategoryWithSpent[]>(() => {
    const spent = new Map<string, number>();
    for (const e of expenses) {
      spent.set(e.categoryId, (spent.get(e.categoryId) ?? 0) + e.amountSek);
    }
    return (bootstrap?.categories ?? [])
      .map((c) => ({ ...c, spentSek: spent.get(c.id) ?? 0 }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [bootstrap, expenses]);

  const value: TripContextValue = {
    ready,
    online,
    trip: bootstrap?.trip ?? null,
    categories,
    rates: bootstrap?.rates ?? {},
    expenses,
    pending,
    addExpense,
    updateExpense,
    deleteExpense,
    restoreExpense,
    refresh: sync,
  };

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}
