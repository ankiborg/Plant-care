"use client";

import { useEffect, useState } from "react";

/**
 * Registers the service worker and, when a new deploy takes over
 * (controllerchange after an update), offers a one-tap reload — no more
 * "clear site data" ritual after releases.
 */
export function RegisterServiceWorker() {
  const [updated, setUpdated] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Only a controller *change* means a new version took over; the first
    // controller on a fresh visit is not an update.
    const hadController = Boolean(navigator.serviceWorker.controller);
    function onControllerChange() {
      if (hadController) setUpdated(true);
    }
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange
    );

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // installability is a progressive enhancement; ignore failures
    });

    return () =>
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange
      );
  }, []);

  if (!updated) return null;

  return (
    <div className="fixed inset-x-0 bottom-16 z-30 mx-auto w-fit max-w-[90vw] pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center gap-3 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] py-2 pl-4 pr-2 shadow-lg">
        <span className="text-sm text-[var(--color-ink)]">
          Fern was updated 🌱
        </span>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="btn btn-primary px-3 py-1.5 text-sm"
        >
          Reload
        </button>
      </div>
    </div>
  );
}
