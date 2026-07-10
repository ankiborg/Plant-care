"use client";

import { useRef, useState, useTransition } from "react";
import { identifyFromUpload, IdentifyState } from "@/lib/actions";
import { MAX_PHOTO_MB, photoTooLargeMessage } from "@/lib/photo-limits";

interface Species {
  id: string;
  commonName: string;
  scientificName: string | null;
  toxicToPets: boolean;
  art: string;
}

const confidenceLabel = {
  high: "high confidence",
  medium: "medium confidence",
  low: "low confidence",
} as const;

export function IdentifyField({
  species,
  initialSpeciesId,
}: {
  species: Species[];
  initialSpeciesId?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<IdentifyState>({ status: "idle" });
  const [speciesId, setSpeciesId] = useState(
    initialSpeciesId ?? species[0]?.id ?? ""
  );
  const selected = species.find((s) => s.id === speciesId);

  function identify() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setState({ status: "error", message: "Choose a photo first." });
      return;
    }
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      setState({ status: "error", message: photoTooLargeMessage(file.size) });
      return;
    }
    const fd = new FormData();
    fd.set("photo", file);
    startTransition(async () => {
      const result = await identifyFromUpload(fd);
      setState(result);
      if (result.status === "done" && result.matchedSpeciesId) {
        setSpeciesId(result.matchedSpeciesId);
      }
    });
  }

  return (
    <div className="space-y-3">
      {/* Identify from photo */}
      <div className="rounded-xl border border-dashed border-[var(--color-line)] bg-[var(--color-surface-2)]/40 p-3">
        <p className="mb-2 text-sm font-medium text-[var(--color-ink)]">
          📷 Identify from a photo{" "}
          <span className="font-normal text-[var(--color-faint)]">· optional</span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            name="photo"
            accept="image/*"
            className="min-w-0 flex-1 text-sm text-[var(--color-muted)] file:mr-3 file:rounded-full file:border-0 file:bg-[var(--color-sage)] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-[var(--color-forest)]"
          />
          <button
            type="button"
            onClick={identify}
            disabled={pending}
            className="btn btn-ghost shrink-0"
          >
            {pending ? "Identifying…" : "Identify"}
          </button>
        </div>

        {state.status === "error" && (
          <p className="mt-2 text-sm text-[var(--color-clay)]">{state.message}</p>
        )}
        {state.status === "done" && (
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            {state.matchedSpeciesId ? (
              <>
                <span className="font-semibold text-[var(--color-forest)]">
                  Detected: {state.matchedName}
                </span>{" "}
                · {confidenceLabel[state.confidence]} — selected below, change if
                wrong.
              </>
            ) : (
              <>
                Best guess:{" "}
                <span className="font-semibold">{state.guess}</span> (
                {confidenceLabel[state.confidence]}). Not in your list — pick the
                closest species below.
              </>
            )}
          </p>
        )}
      </div>

      {/* Keep the identify photo so createPlant can attach it to the plant */}
      {state.status === "done" && (
        <input type="hidden" name="identifyPhotoUrl" value={state.photoUrl} />
      )}

      {/* Species selection (part of the create-plant form) */}
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
    </div>
  );
}
