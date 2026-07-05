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
      <p className="text-sm text-gray-500">
        No photos yet — take one now so future-you can see the growth.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {photos.length} photo{photos.length === 1 ? "" : "s"}
        </p>
        {comparing ? (
          <button
            type="button"
            onClick={() => setComparing(false)}
            className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Done comparing
          </button>
        ) : (
          <button
            type="button"
            onClick={enterCompare}
            disabled={!canCompare}
            title={canCompare ? undefined : "Add at least 2 photos to compare"}
            className="rounded-lg bg-green-100 px-3 py-1.5 text-sm font-medium text-green-900 hover:bg-green-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Compare
          </button>
        )}
      </div>

      {comparing && !canCompare && (
        <p className="text-sm text-gray-500">
          Add at least 2 photos to compare growth.
        </p>
      )}

      {comparing && left && right && (
        <div className="rounded-lg bg-green-50 p-3">
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
                    className={`aspect-square w-full rounded-lg object-cover ${
                      activeSlot === slot ? "ring-2 ring-green-600" : ""
                    }`}
                  />
                </a>
                <figcaption className="mt-1 text-center text-xs text-gray-600">
                  {day(photo.takenAt)}
                </figcaption>
              </figure>
            ))}
          </div>
          <p className="mt-2 text-center text-sm font-semibold text-green-800">
            {daysApartLabel(left.takenAt, right.takenAt)}
          </p>
          <p className="mt-1 text-center text-xs text-gray-500">
            Tap a photo below to change the{" "}
            <span className="font-semibold">{activeSlot}</span> photo
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
              className={`aspect-square w-full rounded-lg object-cover ${
                badge ? "ring-2 ring-green-600" : ""
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
                <span className="absolute right-1 top-1 rounded bg-green-700 px-1.5 py-0.5 text-xs font-bold text-white">
                  {badge}
                </span>
              )}
              <p className="mt-1 text-xs text-gray-500">
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
