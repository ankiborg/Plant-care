"use client";

import { useState } from "react";

const NEW = "__new__";

/**
 * Location picker: a dropdown of the places already in use, with an escape
 * hatch to type a brand-new one. Falls back to a plain text input when no
 * locations exist yet.
 */
export function LocationField({
  locations,
  defaultValue,
}: {
  locations: string[];
  defaultValue?: string;
}) {
  const [custom, setCustom] = useState(locations.length === 0);

  if (custom) {
    return (
      <div className="flex gap-2">
        <input
          name="location"
          maxLength={80}
          defaultValue=""
          placeholder="Living room, east window"
          autoFocus={locations.length > 0}
          className="field"
        />
        {locations.length > 0 && (
          <button
            type="button"
            onClick={() => setCustom(false)}
            className="btn btn-ghost shrink-0"
          >
            Pick
          </button>
        )}
      </div>
    );
  }

  return (
    <select
      name="location"
      defaultValue={defaultValue ?? ""}
      onChange={(e) => {
        if (e.target.value === NEW) setCustom(true);
      }}
      className="field"
    >
      <option value="">No place set</option>
      {locations.map((l) => (
        <option key={l} value={l}>
          {l}
        </option>
      ))}
      <option value={NEW}>＋ New place…</option>
    </select>
  );
}
