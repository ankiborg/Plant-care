"use client";

import Link from "next/link";
import { useState } from "react";

interface Species {
  id: string;
  commonName: string;
  scientificName: string | null;
  toxicToPets: boolean;
  art: string;
}

/**
 * Species picker for the add-plant form. Identification lives on the
 * Identify tab — its "Add to my plants" button comes back here with
 * `?speciesId=` preselected.
 */
export function SpeciesField({
  species,
  initialSpeciesId,
}: {
  species: Species[];
  initialSpeciesId?: string;
}) {
  const [speciesId, setSpeciesId] = useState(
    initialSpeciesId ?? species[0]?.id ?? ""
  );
  const selected = species.find((s) => s.id === speciesId);

  return (
    <div className="space-y-2">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-[var(--color-ink)]">Species</span>
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selected?.art ?? "/species/generic.svg"}
            alt=""
            className="h-14 w-14 shrink-0 rounded-xl"
          />
          <select
            name="speciesId"
            required
            value={speciesId}
            onChange={(e) => setSpeciesId(e.target.value)}
            className="field"
          >
            {species.map((s) => (
              <option key={s.id} value={s.id}>
                {s.commonName}
                {s.scientificName ? ` — ${s.scientificName}` : ""}
                {s.toxicToPets ? "  (toxic to pets)" : ""}
              </option>
            ))}
          </select>
        </div>
      </label>
      <p className="text-xs text-[var(--color-faint)]">
        Not sure what it is?{" "}
        <Link href="/identify" className="underline">
          Identify it from a photo
        </Link>{" "}
        — then tap &quot;Add to my plants&quot;.
      </p>
    </div>
  );
}
