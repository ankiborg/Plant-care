import { openDB, type IDBPDatabase } from "idb";
import type { CategoryDto, ExpenseDto, TripDto } from "./types";

// IndexedDB är sanningen på klienten. UI:t läser alltid härifrån; synken
// tömmer outboxen mot API:et och speglar tillbaka serverns data.

export type LocalExpense = ExpenseDto & {
  // Tombstone: borttagen lokalt, väntar på att delete ska nå servern.
  deleted?: boolean;
};

export type OutboxOp = "upsert" | "delete";

export type OutboxEntry = {
  clientId: string;
  op: OutboxOp;
  queuedAt: number;
};

export type Bootstrap = {
  trip: TripDto | null;
  categories: CategoryDto[];
  rates: Record<string, number>;
  fetchedAt: number;
};

type Db = IDBPDatabase<unknown>;
let dbPromise: Promise<Db> | null = null;

function getDb(): Promise<Db> {
  if (!dbPromise) {
    dbPromise = openDB("resebudget", 1, {
      upgrade(db) {
        db.createObjectStore("expenses", { keyPath: "clientId" });
        db.createObjectStore("outbox", { keyPath: "clientId" });
        db.createObjectStore("meta");
      },
    });
  }
  return dbPromise;
}

export async function idbGetAllExpenses(): Promise<LocalExpense[]> {
  const db = await getDb();
  return (await db.getAll("expenses")) as LocalExpense[];
}

export async function idbGetExpense(clientId: string): Promise<LocalExpense | undefined> {
  const db = await getDb();
  return (await db.get("expenses", clientId)) as LocalExpense | undefined;
}

export async function idbPutExpense(expense: LocalExpense): Promise<void> {
  const db = await getDb();
  await db.put("expenses", expense);
}

export async function idbDeleteExpense(clientId: string): Promise<void> {
  const db = await getDb();
  await db.delete("expenses", clientId);
}

// Köa en mutation. En post per clientId — en nyare operation ersätter den
// gamla (upsert efter upsert = en POST; delete efter upsert = bara delete).
export async function idbQueue(clientId: string, op: OutboxOp): Promise<void> {
  const db = await getDb();
  await db.put("outbox", { clientId, op, queuedAt: Date.now() } satisfies OutboxEntry);
}

export async function idbGetOutbox(): Promise<OutboxEntry[]> {
  const db = await getDb();
  const entries = (await db.getAll("outbox")) as OutboxEntry[];
  return entries.sort((a, b) => a.queuedAt - b.queuedAt);
}

export async function idbOutboxCount(): Promise<number> {
  const db = await getDb();
  return db.count("outbox");
}

// Ta bort en outbox-post, men bara om den inte hunnit ersättas av en nyare
// operation medan nätverksanropet pågick. Returnerar true om den togs bort.
export async function idbRemoveOutbox(clientId: string, ifQueuedAt: number): Promise<boolean> {
  const db = await getDb();
  const tx = db.transaction("outbox", "readwrite");
  const entry = (await tx.store.get(clientId)) as OutboxEntry | undefined;
  if (entry && entry.queuedAt === ifQueuedAt) {
    await tx.store.delete(clientId);
    await tx.done;
    return true;
  }
  await tx.done;
  return false;
}

export async function idbGetBootstrap(): Promise<Bootstrap | null> {
  const db = await getDb();
  return ((await db.get("meta", "bootstrap")) as Bootstrap | undefined) ?? null;
}

export async function idbSetBootstrap(bootstrap: Bootstrap): Promise<void> {
  const db = await getDb();
  await db.put("meta", bootstrap, "bootstrap");
}

// Spegla serverns utgiftslista: allt som inte har en väntande lokal ändring
// ersätts med serverns version; poster som försvunnit på servern tas bort.
export async function idbReplaceSynced(serverExpenses: ExpenseDto[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(["expenses", "outbox"], "readwrite");
  const pendingKeys = new Set((await tx.objectStore("outbox").getAllKeys()) as string[]);
  const expenseStore = tx.objectStore("expenses");
  const localKeys = (await expenseStore.getAllKeys()) as string[];
  const serverKeys = new Set(serverExpenses.map((e) => e.clientId));

  for (const key of localKeys) {
    if (!pendingKeys.has(key) && !serverKeys.has(key)) {
      await expenseStore.delete(key);
    }
  }
  for (const expense of serverExpenses) {
    if (!pendingKeys.has(expense.clientId)) {
      await expenseStore.put(expense);
    }
  }
  await tx.done;
}
