"use client";

import { useState } from "react";
import { useTrip } from "./trip-provider";
import { formatInt, formatSek } from "@/lib/money";
import { ChevronDownIcon } from "./icons";
import { cn } from "@/lib/cn";

// Hopfällbart totalkort: en rad med staplad bar som default, tap fäller ut
// detaljer per kategori.
export function TotalCard() {
  const { categories } = useTrip();
  const [open, setOpen] = useState(false);

  const totalBudget = categories.reduce((sum, c) => sum + c.budgetSek, 0);
  const totalSpent = categories.reduce((sum, c) => sum + c.spentSek, 0);
  const over = totalSpent > totalBudget;

  return (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      className="w-full rounded-2xl border border-line bg-card px-3.5 py-2.5 text-left"
      aria-expanded={open}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-ink-soft">Totalt</span>
        <span className="flex items-center gap-1.5">
          <span className={cn("num text-[13px]", over ? "font-semibold text-danger" : "text-ink")}>
            <span className="font-semibold">{formatInt(totalSpent)}</span>
            <span className="text-ink-faint"> / {formatSek(totalBudget)}</span>
          </span>
          <ChevronDownIcon className={cn("h-3.5 w-3.5 text-ink-faint transition-transform", open && "rotate-180")} />
        </span>
      </div>

      <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-line">
        {categories.map((c) =>
          c.spentSek > 0 && totalBudget > 0 ? (
            <div
              key={c.id}
              style={{
                width: `${Math.min(100, (c.spentSek / totalBudget) * 100)}%`,
                backgroundColor: c.color,
              }}
            />
          ) : null,
        )}
      </div>

      {open && (
        <div className="mt-3 flex flex-col gap-2 border-t border-line pt-2.5">
          {categories.map((c) => {
            const pct = c.budgetSek > 0 ? (c.spentSek / c.budgetSek) * 100 : 0;
            return (
              <div key={c.id} className="flex items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="flex-1 truncate text-[13px]">{c.name}</span>
                <span className={cn("num text-[12px]", pct > 100 ? "font-semibold text-danger" : "text-ink-soft")}>
                  {formatInt(c.spentSek)}
                  <span className="text-ink-faint"> / {formatInt(c.budgetSek)}</span>
                </span>
                <span className="h-1 w-14 shrink-0 overflow-hidden rounded-full" style={{ backgroundColor: c.softColor }}>
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${Math.min(100, pct)}%`,
                      backgroundColor: pct > 100 ? "var(--color-danger)" : c.color,
                    }}
                  />
                </span>
              </div>
            );
          })}
        </div>
      )}
    </button>
  );
}
