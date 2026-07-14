"use client";

import { useState } from "react";
import { useTrip, type ExpensePatch } from "./trip-provider";
import { Segmented } from "./segmented";
import { parseAmount } from "@/lib/money";
import { fromLocalInputValue, toLocalInputValue } from "@/lib/dates";
import { CURRENCIES, type Currency } from "@/lib/rates";
import { PAYER_NAMES, type Payer } from "@/lib/payer";
import type { LocalExpense } from "@/lib/idb";
import { cn } from "@/lib/cn";

// Bottensheet för redigering av en utgift: belopp, valuta, kategori, payer,
// datum, anteckning — plus Ta bort (med ångra-toast i historikvyn).
export function EditSheet({
  expense,
  onClose,
  onDelete,
}: {
  expense: LocalExpense;
  onClose: () => void;
  onDelete: (clientId: string) => void;
}) {
  const { categories, updateExpense } = useTrip();
  const [amountInput, setAmountInput] = useState(String(expense.amount).replace(".", ","));
  const [currency, setCurrency] = useState<Currency>(expense.currency);
  const [categoryId, setCategoryId] = useState(expense.categoryId);
  const [payer, setPayer] = useState<Payer>(expense.payer);
  const [note, setNote] = useState(expense.note ?? "");
  const [spentAtLocal, setSpentAtLocal] = useState(toLocalInputValue(expense.spentAt));
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const amount = parseAmount(amountInput);
    if (amount === null || amount <= 0) {
      setError("Ogiltigt belopp.");
      return;
    }
    const patch: ExpensePatch = {
      amount,
      currency,
      categoryId,
      payer,
      note: note.trim() === "" ? null : note.trim(),
      spentAt: fromLocalInputValue(spentAtLocal),
    };
    await updateExpense(expense.clientId, patch);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Stäng"
        onClick={onClose}
        className="absolute inset-0 bg-black/30"
      />
      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-md rounded-t-3xl bg-paper p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-2xl">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />

        <label className="mb-1 block text-xs font-medium text-ink-soft">Belopp</label>
        <div className="mb-3 flex items-center gap-2">
          <input
            type="text"
            inputMode="decimal"
            value={amountInput}
            onChange={(e) => {
              setAmountInput(e.target.value);
              setError(null);
            }}
            className="num w-28 rounded-xl border border-line bg-card px-3 py-2 text-xl"
          />
          <Segmented
            options={CURRENCIES.map((c) => ({ value: c, label: c }))}
            value={currency}
            onChange={setCurrency}
            className="flex-1"
          />
        </div>

        <label className="mb-1 block text-xs font-medium text-ink-soft">Kategori</label>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryId(c.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[13px] font-medium",
                c.id === categoryId ? "border-2" : "border-line bg-card text-ink-soft",
              )}
              style={
                c.id === categoryId
                  ? { borderColor: c.color, backgroundColor: c.softColor }
                  : undefined
              }
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">Vem betalade</label>
            <Segmented
              options={(Object.keys(PAYER_NAMES) as Payer[]).map((p) => ({
                value: p,
                label: PAYER_NAMES[p],
              }))}
              value={payer}
              onChange={setPayer}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">När</label>
            <input
              type="datetime-local"
              value={spentAtLocal}
              onChange={(e) => setSpentAtLocal(e.target.value)}
              className="num w-full rounded-xl border border-line bg-card px-2 py-1.5 text-[13px]"
            />
          </div>
        </div>

        <label className="mb-1 block text-xs font-medium text-ink-soft">Anteckning</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Valfritt"
          className="mb-4 w-full rounded-xl border border-line bg-card px-3 py-2 text-[15px]"
        />

        {error && <p className="mb-2 text-sm font-medium text-danger">{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onDelete(expense.clientId)}
            className="rounded-2xl border border-danger/40 px-4 py-3 text-[15px] font-semibold text-danger active:bg-danger/10"
          >
            Ta bort
          </button>
          <button
            type="button"
            onClick={save}
            className="flex-1 rounded-2xl bg-ink py-3 text-[15px] font-bold text-paper"
          >
            Spara
          </button>
        </div>
      </div>
    </div>
  );
}
