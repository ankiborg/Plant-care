import {
  idbDeleteExpense,
  idbGetExpense,
  idbGetOutbox,
  idbOutboxCount,
  idbRemoveOutbox,
  idbReplaceSynced,
  idbSetBootstrap,
} from "./idb";
import type { ActiveTripDto } from "./types";

export type SyncResult = { ok: boolean; pending: number };

let inFlight: Promise<SyncResult> | null = null;

// Töm outboxen mot API:et och hämta serverns aktuella data. Körs vid
// appstart, online-event, efter varje mutation och med jämna mellanrum.
// Single-flight: parallella anrop återanvänder pågående synk.
export function syncNow(): Promise<SyncResult> {
  if (!inFlight) {
    inFlight = doSync().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

async function doSync(): Promise<SyncResult> {
  try {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return { ok: false, pending: await idbOutboxCount() };
    }

    for (const entry of await idbGetOutbox()) {
      const expense = await idbGetExpense(entry.clientId);

      if (entry.op === "upsert") {
        if (!expense || expense.deleted) {
          // Hann tas bort lokalt — delete-posten (om någon) hanterar resten.
          await idbRemoveOutbox(entry.clientId, entry.queuedAt);
          continue;
        }
        const res = await fetch("/api/expenses", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            clientId: expense.clientId,
            tripId: expense.tripId,
            categoryId: expense.categoryId,
            amount: expense.amount,
            currency: expense.currency,
            rate: expense.rate,
            payer: expense.payer,
            note: expense.note,
            spentAt: expense.spentAt,
          }),
        });
        if (res.status === 401) return unauthorized();
        if (res.status >= 500) throw new Error(`server ${res.status}`);
        if (!res.ok) {
          // Permanent klientfel (t.ex. borttagen kategori) — släpp posten
          // så att den inte blockerar resten av kön för evigt.
          console.warn("resebudget: släpper osynkbar utgift", entry.clientId, res.status);
        }
        await idbRemoveOutbox(entry.clientId, entry.queuedAt);
      } else {
        const res = await fetch(`/api/expenses/${entry.clientId}`, { method: "DELETE" });
        if (res.status === 401) return unauthorized();
        if (!res.ok && res.status !== 404) throw new Error(`server ${res.status}`);
        const removed = await idbRemoveOutbox(entry.clientId, entry.queuedAt);
        // Städa bort tombstonen — om inte en ångra-åtgärd hann köa en ny upsert.
        if (removed) await idbDeleteExpense(entry.clientId);
      }
    }

    const res = await fetch("/api/trip/active");
    if (res.status === 401) return unauthorized();
    if (res.ok) {
      const data = (await res.json()) as ActiveTripDto;
      await idbSetBootstrap({
        trip: data.trip,
        categories: data.categories,
        rates: data.rates,
        fetchedAt: Date.now(),
      });
      await idbReplaceSynced(data.expenses);
    }

    return { ok: res.ok, pending: await idbOutboxCount() };
  } catch {
    // Nätverksfel eller serverfel — kön ligger kvar och försöker igen senare.
    return { ok: false, pending: await idbOutboxCount() };
  }
}

function unauthorized(): SyncResult {
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
  return { ok: false, pending: 0 };
}
