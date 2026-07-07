"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";

export interface PhotoItem {
  id: string;
  url: string;
  /** ISO string (serialized across the server/client boundary). */
  takenAt: string;
  note: string | null;
}

type Slot = "left" | "right";

const day = (iso: string) => iso.slice(0, 10);

function daysApartLabel(aIso: string, bIso: string): string {
  const days = Math.round(
    Math.abs(new Date(bIso).getTime() - new Date(aIso).getTime()) / 86_400_000
  );
  if (days === 0) return "same day";
  if (days === 1) return "1 day apart";
  return `${days} days apart`;
}

/** Dated photo gallery with an optional two-photo side-by-side compare mode. */
export function PhotoGallery({ photos }: { photos: PhotoItem[] }) {
  // photos arrive newest-first from the page query
  const newest = photos[0];
  const oldest = photos[photos.length - 1];

  const [comparing, setComparing] = useState(false);
  const [leftId, setLeftId] = useState<string | null>(null);
  const [rightId, setRightId] = useState<string | null>(null);
  const [activeSlot, setActiveSlot] = useState<Slot>("left");

  const canCompare = photos.length >= 2;
  const left = photos.find((p) => p.id === leftId) ?? null;
  const right = photos.find((p) => p.id === rightId) ?? null;

  function enterCompare() {
    setLeftId(oldest.id);
    setRightId(newest.id);
    setActiveSlot("left");
    setComparing(true);
  }

  function pick(photoId: string) {
    if (activeSlot === "left") {
      setLeftId(photoId);
      setActiveSlot("right");
    } else {
      setRightId(photoId);
      setActiveSlot("left");
    }
  }

  if (photos.length === 0) {
    return (
      <p className="text-sm text-[var(--color-faint)]">
        No photos yet — take one now so future-you can see the growth.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--color-faint)]">
          {photos.length} photo{photos.length === 1 ? "" : "s"}
        </p>
        {comparing ? (
          <button
            type="button"
            onClick={() => setComparing(false)}
            className="rounded-full bg-[var(--color-surface-2)] px-3 py-1.5 text-sm font-medium text-[var(--color-muted)] hover:bg-[var(--color-line)]"
          >
            Done
          </button>
        ) : (
          <button
            type="button"
            onClick={enterCompare}
            disabled={!canCompare}
            title={canCompare ? undefined : "Add at least 2 photos to compare"}
            className="rounded-full bg-[var(--color-sage)] px-3 py-1.5 text-sm font-medium text-[var(--color-forest)] hover:bg-[#d3e0cf] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Compare growth
          </button>
        )}
      </div>

      {comparing && !canCompare && (
        <p className="text-sm text-[var(--color-faint)]">
          Add at least 2 photos to compare growth.
        </p>
      )}

      {comparing && left && right && (
        <div className="rounded-2xl bg-[var(--color-sage)]/60 p-3">
          <div className="grid grid-cols-2 gap-2">
            {([
              ["left", left],
              ["right", right],
            ] as const).map(([slot, photo]) => (
              <figure key={slot} className="min-w-0">
                <a href={photo.url} target="_blank" rel="noreferrer">
                  <img
                    src={photo.url}
                    alt={photo.note ?? day(photo.takenAt)}
                    className={`aspect-square w-full rounded-xl object-cover ${
                      activeSlot === slot ? "ring-2 ring-[var(--color-forest)]" : ""
                    }`}
                  />
                </a>
                <figcaption className="mt-1.5 text-center text-xs font-medium text-[var(--color-muted)]">
                  {day(photo.takenAt)}
                </figcaption>
              </figure>
            ))}
          </div>
          <p className="mt-2.5 text-center font-[family-name:var(--font-display)] text-base font-semibold text-[var(--color-forest)]">
            {daysApartLabel(left.takenAt, right.takenAt)}
          </p>
          <p className="mt-0.5 text-center text-xs text-[var(--color-muted)]">
            Tap a photo below to change the{" "}
            <span className="font-semibold">{activeSlot}</span> image
          </p>
        </div>
      )}

      <ul className="grid grid-cols-3 gap-2">
        {photos.map((photo) => {
          const badge =
            comparing && photo.id === leftId
              ? "L"
              : comparing && photo.id === rightId
                ? "R"
                : null;
          const image = (
            <img
              src={photo.url}
              alt={photo.note ?? day(photo.takenAt)}
              className={`aspect-square w-full rounded-xl object-cover ${
                badge ? "ring-2 ring-[var(--color-forest)]" : ""
              }`}
            />
          );
          return (
            <li key={photo.id} className="relative">
              {comparing ? (
                <button
                  type="button"
                  onClick={() => pick(photo.id)}
                  className="block w-full"
                >
                  {image}
                </button>
              ) : (
                <a href={photo.url} target="_blank" rel="noreferrer">
                  {image}
                </a>
              )}
              {badge && (
                <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-forest)] text-[0.7rem] font-bold text-white">
                  {badge}
                </span>
              )}
              <p className="mt-1 truncate text-[0.7rem] text-[var(--color-faint)]">
                {day(photo.takenAt)}
                {photo.note ? ` · ${photo.note}` : ""}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
