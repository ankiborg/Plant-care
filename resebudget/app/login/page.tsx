"use client";

import { useState } from "react";
import { PAYER_NAMES, type Payer } from "@/lib/payer";
import { cn } from "@/lib/cn";

export default function LoginPage() {
  const [pin, setPin] = useState("");
  const [payer, setPayer] = useState<Payer>("A");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin, payer }),
      });
      if (res.ok) {
        window.location.assign("/");
        return;
      }
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Något gick fel.");
    } catch {
      setError("Kunde inte nå servern.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-1 flex-col justify-center gap-6 pb-24">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Resebudget</h1>
        <p className="mt-1 text-sm text-ink-soft">Italien &amp; Schweiz</p>
      </div>

      <div>
        <p className="mb-2 text-center text-[13px] font-medium text-ink-soft">Vem är du?</p>
        <div className="flex gap-2">
          {(Object.keys(PAYER_NAMES) as Payer[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPayer(p)}
              className={cn(
                "flex-1 rounded-2xl border py-4 text-[17px] font-semibold",
                payer === p ? "border-2 border-ink bg-card" : "border-line bg-card text-ink-soft",
              )}
            >
              {PAYER_NAMES[p]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-center text-[13px] font-medium text-ink-soft">PIN-kod</p>
        <input
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          value={pin}
          onChange={(e) => {
            setPin(e.target.value);
            setError(null);
          }}
          className="num w-full rounded-2xl border border-line bg-card px-4 py-3 text-center text-2xl tracking-[0.5em]"
        />
      </div>

      {error && <p className="text-center text-sm font-medium text-danger">{error}</p>}

      <button
        type="submit"
        disabled={busy || pin === ""}
        className="h-13 min-h-12 rounded-2xl bg-ink text-[17px] font-bold text-paper disabled:opacity-30"
      >
        Logga in
      </button>
    </form>
  );
}
