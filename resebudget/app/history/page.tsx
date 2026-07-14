"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTrip } from "@/components/trip-provider";
import { EditSheet } from "@/components/edit-sheet";
import { SyncBadge } from "@/components/sync-badge";
import { BackIcon } from "@/components/icons";
import { groupExpensesByDay } from "@/lib/history";
import { formatClock } from "@/lib/dates";
import { formatMoney, formatSek } from "@/lib/money";
import { PAYER_NAMES } from "@/lib/payer";
import type { LocalExpense } from "@/lib/idb";

// Historik: utgifter nyast först, grupperade per dag med dagsummor.
export default function HistoryPage() {
  const { ready, expenses, categories, deleteExpense, restoreExpense } = useTrip();
  const [editing, setEditing] = useState<LocalExpense | null>(null);
  // Hela utgiften sparas för ångra — IndexedDB-posten kan vara bortstädad
  // så fort delete-synken gått klart.
  const [undoExpense, setUndoExpense] = useState<LocalExpense | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );
  const groups = useMemo(() => groupExpensesByDay(expenses), [expenses]);

  function handleDelete(clientId: string) {
    const expense = expenses.find((e) => e.clientId === clientId) ?? null;
    setEditing(null);
    void deleteExpense(clientId);
    setUndoExpense(expense);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndoExpense(null), 6000);
  }

  function handleUndo() {
    if (!undoExpense) return;
    void restoreExpense(undoExpense);
    setUndoExpense(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center gap-2 py-2">
        <Link href="/" className="-ml-2 rounded-lg p-2 text-ink-soft active:bg-line" aria-label="Tillbaka">
          <BackIcon className="h-5 w-5" />
        </Link>
        <h1 className="flex-1 text-[17px] font-bold">Historik</h1>
        <SyncBadge />
      </header>

      {ready && groups.length === 0 && (
        <p className="mt-16 text-center text-sm text-ink-soft">Inga utgifter än.</p>
      )}

      {groups.map((group) => (
        <section key={group.key} className="mb-1">
          <div className="flex items-baseline justify-between pb-1 pt-3">
            <h2 className="text-[13px] font-semibold text-ink-soft">{group.label}</h2>
            <span className="num text-[13px] font-semibold">{formatSek(group.totalSek)}</span>
          </div>
          <div className="overflow-hidden rounded-2xl border border-line bg-card">
            {group.items.map((expense, i) => {
              const cat = categoryById.get(expense.categoryId);
              return (
                <button
                  key={expense.clientId}
                  type="button"
                  onClick={() => setEditing(expense)}
                  className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left active:bg-line/50 ${
                    i > 0 ? "border-t border-line" : ""
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: cat?.color ?? "#999" }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">
                      {cat?.name ?? "Okänd kategori"}
                      {expense.note ? (
                        <span className="font-normal text-ink-soft"> · {expense.note}</span>
                      ) : null}
                    </span>
                    <span className="block text-[12px] text-ink-soft">
                      {PAYER_NAMES[expense.payer]} · {formatClock(expense.spentAt)}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="num block text-[15px] font-semibold">
                      {formatMoney(expense.amount, expense.currency)}
                    </span>
                    {expense.currency !== "SEK" && (
                      <span className="num block text-[12px] text-ink-soft">
                        {formatSek(expense.amountSek)}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {editing && (
        <EditSheet
          expense={editing}
          onClose={() => setEditing(null)}
          onDelete={handleDelete}
        />
      )}

      {undoExpense && (
        <div className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+16px)] z-40 mx-auto flex max-w-md items-center justify-between rounded-2xl bg-ink px-4 py-3 text-paper shadow-lg">
          <span className="text-[14px]">Utgiften togs bort</span>
          <button type="button" onClick={handleUndo} className="text-[14px] font-bold underline">
            Ångra
          </button>
        </div>
      )}
    </div>
  );
}
