"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTrip } from "@/components/trip-provider";
import { Segmented } from "@/components/segmented";
import { SyncBadge } from "@/components/sync-badge";
import { BackIcon } from "@/components/icons";
import { parseAmount } from "@/lib/money";
import { PAYER_NAMES, type Payer } from "@/lib/payer";
import { readPayerCookie, writePayerCookie } from "@/lib/payer-cookie";

// Inställningar: payer, budgetar per kategori, lägg till/ta bort kategori,
// valutakurser. Kräver nät — utgiftsflödet är det enda som är offline-först.
export default function SettingsPage() {
  const { ready, trip, categories, rates, expenses, refresh } = useTrip();
  const [payer, setPayer] = useState<Payer>("A");
  const [budgets, setBudgets] = useState<Record<string, string>>({});
  const [rateInputs, setRateInputs] = useState<{ EUR: string; CHF: string }>({ EUR: "", CHF: "" });
  const [newName, setNewName] = useState("");
  const [newBudget, setNewBudget] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPayer(readPayerCookie());
  }, []);

  // Fyll formulären när datat kommer, men skriv inte över pågående inmatning.
  useEffect(() => {
    setBudgets((prev) => {
      const next = { ...prev };
      for (const c of categories) {
        if (!(c.id in next)) next[c.id] = String(c.budgetSek);
      }
      return next;
    });
  }, [categories]);

  useEffect(() => {
    setRateInputs((prev) => ({
      EUR: prev.EUR || (rates.EUR !== undefined ? String(rates.EUR).replace(".", ",") : ""),
      CHF: prev.CHF || (rates.CHF !== undefined ? String(rates.CHF).replace(".", ",") : ""),
    }));
  }, [rates]);

  const expenseCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of expenses) counts.set(e.categoryId, (counts.get(e.categoryId) ?? 0) + 1);
    return counts;
  }, [expenses]);

  function selectPayer(next: Payer) {
    setPayer(next);
    writePayerCookie(next);
  }

  async function call(fn: () => Promise<Response>, okMessage: string) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fn();
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setMessage(body?.error ?? "Något gick fel — är du online?");
      } else {
        setMessage(okMessage);
        await refresh();
      }
    } catch {
      setMessage("Kunde inte nå servern — är du online?");
    } finally {
      setBusy(false);
    }
  }

  async function saveBudgets() {
    setBusy(true);
    setMessage(null);
    try {
      for (const c of categories) {
        const value = Number(budgets[c.id]);
        if (Number.isInteger(value) && value >= 0 && value !== c.budgetSek) {
          const res = await fetch(`/api/categories/${c.id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ budgetSek: value }),
          });
          if (!res.ok) throw new Error();
        }
      }
      setMessage("Budgetar sparade.");
      await refresh();
    } catch {
      setMessage("Kunde inte spara — är du online?");
    } finally {
      setBusy(false);
    }
  }

  async function saveRates() {
    const eur = parseAmount(rateInputs.EUR);
    const chf = parseAmount(rateInputs.CHF);
    if (eur === null || chf === null || eur <= 0 || chf <= 0) {
      setMessage("Ogiltig kurs.");
      return;
    }
    await call(
      () =>
        fetch("/api/rates", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ EUR: eur, CHF: chf }),
        }),
      "Kurser sparade. Påverkar bara nya utgifter.",
    );
  }

  async function addCategory() {
    if (!trip) return;
    const budget = Number(newBudget);
    if (newName.trim() === "" || !Number.isInteger(budget) || budget < 0) {
      setMessage("Ange namn och budget i hela kronor.");
      return;
    }
    await call(
      () =>
        fetch("/api/categories", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ tripId: trip.id, name: newName.trim(), budgetSek: budget }),
        }),
      "Kategori tillagd.",
    );
    setNewName("");
    setNewBudget("");
  }

  async function removeCategory(id: string, name: string) {
    const count = expenseCount.get(id) ?? 0;
    if (count === 0) {
      if (!confirm(`Ta bort kategorin ${name}?`)) return;
      await call(() => fetch(`/api/categories/${id}`, { method: "DELETE" }), "Kategori borttagen.");
      return;
    }
    const target = categories.find((c) => c.name === "Övrigt" && c.id !== id);
    if (!target) {
      setMessage(`${name} har ${count} utgifter och det finns ingen Övrigt-kategori att flytta dem till.`);
      return;
    }
    if (!confirm(`${name} har ${count} utgifter. Flytta dem till Övrigt och ta bort kategorin?`)) return;
    await call(
      () => fetch(`/api/categories/${id}?moveTo=${target.id}`, { method: "DELETE" }),
      "Utgifterna flyttades till Övrigt och kategorin togs bort.",
    );
  }

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" }).catch(() => {});
    window.location.assign("/login");
  }

  return (
    <div className="flex flex-1 flex-col pb-6">
      <header className="flex items-center gap-2 py-2">
        <Link href="/" className="-ml-2 rounded-lg p-2 text-ink-soft active:bg-line" aria-label="Tillbaka">
          <BackIcon className="h-5 w-5" />
        </Link>
        <h1 className="flex-1 text-[17px] font-bold">Inställningar</h1>
        <SyncBadge />
      </header>

      {!ready ? (
        <p className="mt-16 text-center text-sm text-ink-soft">Laddar …</p>
      ) : (
        <div className="flex flex-col gap-5">
          <section>
            <h2 className="mb-1.5 text-[13px] font-semibold text-ink-soft">Jag är</h2>
            <Segmented
              options={(Object.keys(PAYER_NAMES) as Payer[]).map((p) => ({
                value: p,
                label: PAYER_NAMES[p],
              }))}
              value={payer}
              onChange={selectPayer}
            />
          </section>

          <section>
            <h2 className="mb-1.5 text-[13px] font-semibold text-ink-soft">Budgetar (SEK)</h2>
            <div className="overflow-hidden rounded-2xl border border-line bg-card">
              {categories.map((c, i) => (
                <div
                  key={c.id}
                  className={`flex items-center gap-2 px-3.5 py-2 ${i > 0 ? "border-t border-line" : ""}`}
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                  <span className="flex-1 truncate text-[14px] font-medium">{c.name}</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={budgets[c.id] ?? ""}
                    onChange={(e) => setBudgets((prev) => ({ ...prev, [c.id]: e.target.value }))}
                    className="num w-24 rounded-lg border border-line bg-paper px-2 py-1 text-right text-[14px]"
                  />
                  <button
                    type="button"
                    onClick={() => removeCategory(c.id, c.name)}
                    className="px-1 text-[12px] font-medium text-danger"
                    disabled={busy}
                  >
                    Ta bort
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={saveBudgets}
              disabled={busy}
              className="mt-2 w-full rounded-xl bg-ink py-2.5 text-[14px] font-bold text-paper disabled:opacity-40"
            >
              Spara budgetar
            </button>
          </section>

          <section>
            <h2 className="mb-1.5 text-[13px] font-semibold text-ink-soft">Ny kategori</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Namn"
                className="min-w-0 flex-1 rounded-xl border border-line bg-card px-3 py-2 text-[14px]"
              />
              <input
                type="text"
                inputMode="numeric"
                value={newBudget}
                onChange={(e) => setNewBudget(e.target.value)}
                placeholder="Budget"
                className="num w-24 rounded-xl border border-line bg-card px-3 py-2 text-right text-[14px]"
              />
              <button
                type="button"
                onClick={addCategory}
                disabled={busy}
                className="rounded-xl border border-line bg-card px-3 text-[14px] font-semibold disabled:opacity-40"
              >
                Lägg till
              </button>
            </div>
          </section>

          <section>
            <h2 className="mb-1.5 text-[13px] font-semibold text-ink-soft">Valutakurser (SEK per enhet)</h2>
            <div className="flex gap-2">
              {(["EUR", "CHF"] as const).map((cur) => (
                <label key={cur} className="flex flex-1 items-center gap-2 rounded-xl border border-line bg-card px-3 py-2">
                  <span className="text-[13px] font-semibold text-ink-soft">{cur}</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={rateInputs[cur]}
                    onChange={(e) => setRateInputs((prev) => ({ ...prev, [cur]: e.target.value }))}
                    className="num w-full bg-transparent text-right text-[14px] outline-none"
                  />
                </label>
              ))}
              <button
                type="button"
                onClick={saveRates}
                disabled={busy}
                className="rounded-xl border border-line bg-card px-3 text-[14px] font-semibold disabled:opacity-40"
              >
                Spara
              </button>
            </div>
            <p className="mt-1.5 text-[12px] text-ink-soft">
              Kursändringar påverkar bara nya utgifter — varje utgift behåller kursen den sparades med.
            </p>
          </section>

          {message && <p className="text-[13px] font-medium text-ink-soft">{message}</p>}

          <button type="button" onClick={logout} className="self-start text-[13px] font-medium text-danger">
            Logga ut
          </button>
        </div>
      )}
    </div>
  );
}
