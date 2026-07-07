"use client";

/** Archive submit button with a confirmation guard (archiving hides the plant). */
export function ArchiveButton() {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (
          !confirm(
            "Archive this plant? It'll be hidden from your collection and today's tasks."
          )
        ) {
          e.preventDefault();
        }
      }}
      className="text-sm text-[var(--color-faint)] underline decoration-[var(--color-line)] underline-offset-4 hover:text-[var(--color-clay)]"
    >
      Archive this plant
    </button>
  );
}
