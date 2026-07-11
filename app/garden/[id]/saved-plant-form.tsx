"use client";

import { useState, useTransition } from "react";
import { deleteSavedPlant, updateSavedPlant } from "@/lib/actions";
import {
  SAVED_CATEGORIES,
  SAVED_CATEGORY_KEYS,
  SavedCategoryKey,
} from "@/lib/saved-plants";

/** Edit category + note, or delete, on a saved plant's detail page. */
export function SavedPlantForm({
  id,
  category,
  note,
}: {
  id: string;
  category: SavedCategoryKey;
  note: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [savedFlash, setSavedFlash] = useState(false);

  function submit(formData: FormData) {
    startTransition(async () => {
      await updateSavedPlant(formData);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2500);
    });
  }

  function remove() {
    if (!confirm("Remove this plant from your saved list?")) return;
    const fd = new FormData();
    fd.set("id", id);
    startTransition(async () => {
      await deleteSavedPlant(fd);
    });
  }

  return (
    <form action={submit} className="card space-y-3 p-4">
      <input type="hidden" name="id" value={id} />

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-[var(--color-ink)]">
          Category
        </span>
        <select name="category" defaultValue={category} className="field">
          {SAVED_CATEGORY_KEYS.map((key) => (
            <option key={key} value={key}>
              {SAVED_CATEGORIES[key].emoji} {SAVED_CATEGORIES[key].label}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-[var(--color-ink)]">
          Note <span className="text-[var(--color-faint)]">· optional</span>
        </span>
        <input
          name="note"
          defaultValue={note ?? ""}
          maxLength={200}
          placeholder="Where you saw it, planting spot…"
          className="field"
        />
      </label>

      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending} className="btn btn-primary flex-1">
          {pending ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          className="btn btn-ghost text-[var(--color-clay)]"
        >
          Remove
        </button>
      </div>
      {savedFlash && (
        <p className="text-sm text-[var(--color-forest)]">Saved. 🌿</p>
      )}
    </form>
  );
}
