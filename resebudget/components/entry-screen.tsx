"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTrip } from "./trip-provider";
import { TotalCard } from "./total-card";
import { CategoryGrid } from "./category-grid";
import { Numpad } from "./numpad";
import { Segmented } from "./segmented";
import { SyncBadge } from "./sync-badge";
import { GearIcon, HistoryIcon } from "./icons";
import { pressKey, type PadKey } from "@/lib/numpad";
import { validateEntry } from "@/lib/expense-calc";
import { formatSek, toSek } from "@/lib/money";
import { CURRENCIES, isCurrency, type Currency } from "@/lib/rates";
import { PAYER_NAMES, type Payer } from "@/lib/payer";
import { readPayerCookie, writePayerCookie } from "@/lib/payer-cookie";
import { cn } from "@/lib/cn";

const CURRENCY_SUFFIX: Record<Currency, string> = { EUR: "€", CHF: "CHF", SEK: "kr" };

// Inmatningsvyn: välj kategori → snabbelopp eller numpad → Spara.
// Allt på en skärm, ingen scroll, tummen i botten.
export function EntryScreen() {
  const { ready, online, trip, categories, rates, addExpense } = useTrip();
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [currency, setCurrency] = useState<Currency>("EUR");
  const [payer, setPayer] = useState<Payer>("A");
  const [savedFlash, setSavedFlash] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setPayer(readPayerCookie());
    const stored = localStorage.getItem("rb_currency");
    if (stored && isCurrency(stored)) setCurrency(stored);
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

  const selected = useMemo(
    () => categories.find((c) => c.id === categoryId) ?? null,
    [categories, categoryId],
  );
  const amount = validateEntry(input);
  const rate = rates[currency] ?? 1;
  const sek = amount !== null ? toSek(amount, rate) : null;
  const canSave = selected !== null && amount !== null;

  function selectCurrency(next: Currency) {
    setCurrency(next);
    localStorage.setItem("rb_currency", next);
  }
  function selectPayer(next: Payer) {
    setPayer(next);
    writePayerCookie(next);
  }
  function onPad(key: PadKey) {
    setInput((cur) => pressKey(cur, key));
  }
  function onQuick(value: number) {
    setInput(String(value).replace(".", ","));
  }

  async function save() {
    if (!selected || amount === null) return;
    await addExpense({
      categoryId: selected.id,
      amount,
      currency,
      payer,
      note: null,
      spentAt: new Date().toISOString(),
    });
    setInput("");
    setSavedFlash(true);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setSavedFlash(false), 1100);
  }

  if (!ready) {
    return <div className="flex flex-1 items-center justify-center text-sm text-ink-soft">Laddar …</div>;
  }
  if (!trip) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="font-semibold">Ingen resa laddad</p>
        <p className="text-sm text-ink-soft">
          {online
            ? "Det finns ingen aktiv resa i databasen. Kör seeden eller kolla servern."
            : "Öppna appen med nätverk en första gång så hämtas resan."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-2.5">
      <header className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <h1 className="text-[17px] font-bold">{trip.name}</h1>
          <SyncBadge />
        </div>
        <nav className="flex items-center gap-1">
          <Link href="/history" className="rounded-lg p-2 text-ink-soft active:bg-line" aria-label="Historik">
            <HistoryIcon className="h-5 w-5" />
          </Link>
          <Link href="/settings" className="rounded-lg p-2 text-ink-soft active:bg-line" aria-label="Inställningar">
            <GearIcon className="h-5 w-5" />
          </Link>
        </nav>
      </header>

      <TotalCard />
      <CategoryGrid selectedId={categoryId} onSelect={setCategoryId} />

      <div className="flex items-center justify-between gap-3 px-1">
        <div className="min-w-0">
          <div className="num text-[38px]/[1.05] font-medium">
            {input === "" ? (
              <span className="text-ink-faint">0</span>
            ) : (
              <span>{input}</span>
            )}
            <span className="ml-1.5 text-[20px] text-ink-faint">{CURRENCY_SUFFIX[currency]}</span>
          </div>
          <div className="num h-4 text-[12px] text-ink-soft">
            {sek !== null && currency !== "SEK" ? `≈ ${formatSek(sek)}` : ""}
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-1.5">
          <Segmented
            options={CURRENCIES.map((c) => ({ value: c, label: c }))}
            value={currency}
            onChange={selectCurrency}
          />
          <Segmented
            options={(Object.keys(PAYER_NAMES) as Payer[]).map((p) => ({
              value: p,
              label: PAYER_NAMES[p],
            }))}
            value={payer}
            onChange={selectPayer}
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {(selected?.quick ?? []).slice(0, 4).map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onQuick(q)}
            className="num h-10 rounded-xl text-[15px] font-medium"
            style={{ backgroundColor: selected!.softColor, color: "var(--color-ink)" }}
          >
            {String(q).replace(".", ",")}
          </button>
        ))}
        {!selected &&
          [0, 1, 2, 3].map((i) => (
            <div key={i} className="h-10 rounded-xl border border-dashed border-line" />
          ))}
      </div>

      <Numpad onKey={onPad} />

      <button
        type="button"
        onClick={save}
        disabled={!canSave && !savedFlash}
        className={cn(
          "mt-auto h-13 min-h-12 rounded-2xl text-[17px] font-bold text-paper transition-colors",
          savedFlash ? "bg-ok" : "bg-ink disabled:opacity-30",
        )}
      >
        {savedFlash ? "Sparat ✓" : "Spara"}
      </button>
    </div>
  );
}
