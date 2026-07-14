"use client";

import { useTrip } from "./trip-provider";

// Diskret offline-/synkstatus: en liten prick + räknare när outboxen inte är
// tom. Ingen spinner, ingen felmodal — offline ska inte kännas.
export function SyncBadge() {
  const { pending, online } = useTrip();
  if (pending > 0) {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-amber/10 px-2 py-0.5 text-[11px] font-medium text-amber">
        <span className="h-1.5 w-1.5 rounded-full bg-amber" />
        {pending} väntar på synk
      </span>
    );
  }
  if (!online) {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-line/60 px-2 py-0.5 text-[11px] font-medium text-ink-soft">
        <span className="h-1.5 w-1.5 rounded-full bg-ink-faint" />
        offline
      </span>
    );
  }
  return null;
}
