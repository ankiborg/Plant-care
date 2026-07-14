"use client";

import type { PadKey } from "@/lib/numpad";
import { BackspaceIcon } from "./icons";

const ROWS: PadKey[][] = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  [",", "0", "back"],
];

export function Numpad({ onKey }: { onKey: (key: PadKey) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {ROWS.flat().map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onKey(key)}
          className="num flex h-12 items-center justify-center rounded-xl border border-line bg-card text-xl active:bg-line"
          aria-label={key === "back" ? "Radera" : key}
        >
          {key === "back" ? <BackspaceIcon className="h-5 w-5 text-ink-soft" /> : key}
        </button>
      ))}
    </div>
  );
}
