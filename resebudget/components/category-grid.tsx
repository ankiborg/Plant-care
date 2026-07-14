"use client";

import { useTrip } from "./trip-provider";
import { formatInt } from "@/lib/money";
import { cn } from "@/lib/cn";

// Kategoriknappar med progress inbyggd: en tunn stapel längst ner i varje
// knapp visar hur mycket av budgeten som gått.
export function CategoryGrid({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { categories } = useTrip();

  return (
    <div className="grid grid-cols-3 gap-2">
      {categories.map((c) => {
        const selected = c.id === selectedId;
        const pct = c.budgetSek > 0 ? (c.spentSek / c.budgetSek) * 100 : 0;
        const over = pct > 100;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            className={cn(
              "relative overflow-hidden rounded-2xl border bg-card px-2.5 pt-2 pb-3.5 text-left",
              selected ? "border-2" : "border-line",
            )}
            style={
              selected
                ? { borderColor: c.color, backgroundColor: c.softColor }
                : undefined
            }
            aria-pressed={selected}
          >
            <div className="truncate text-[13px] font-semibold">{c.name}</div>
            <div className={cn("num mt-0.5 text-[11px]", over ? "font-semibold text-danger" : "text-ink-soft")}>
              {formatInt(c.spentSek)}
              <span className="text-ink-faint"> / {formatInt(c.budgetSek)}</span>
            </div>
            <div
              className="absolute inset-x-0 bottom-0 h-1"
              style={{ backgroundColor: selected ? "rgba(0,0,0,0.08)" : c.softColor }}
            >
              <div
                className="h-full"
                style={{
                  width: `${Math.min(100, pct)}%`,
                  backgroundColor: over ? "var(--color-danger)" : c.color,
                }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}
