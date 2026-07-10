"use client";

import { useEffect, useState } from "react";

// Exported so tests can assert the list is sane, and so a future translation
// only has to swap this constant.
export const LOADING_MESSAGES = [
  "Counting the leaves…",
  "Consulting the botanists…",
  "Comparing 400,000 species…",
  "Checking for root gossip…",
  "Measuring the chlorophyll…",
  "Politely asking the plant its name…",
  "Leafing through the encyclopedia…",
  "Interviewing nearby pollinators…",
] as const;

/** Animated sprout + rotating quips shown while the AI identifies a photo. */
export function IdentifyLoading() {
  const [index, setIndex] = useState(() =>
    Math.floor(Math.random() * LOADING_MESSAGES.length)
  );

  useEffect(() => {
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % LOADING_MESSAGES.length),
      2500
    );
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="card flex flex-col items-center gap-3 p-6 text-center">
      <svg
        viewBox="0 0 64 64"
        className="h-20 w-20 motion-safe:animate-[sprout-sway_2.6s_ease-in-out_infinite]"
        style={{ transformOrigin: "50% 90%" }}
        fill="none"
        aria-hidden="true"
      >
        {/* pot */}
        <path
          d="M22 46h20l-2.5 12h-15L22 46Z"
          fill="var(--color-clay-soft)"
          stroke="var(--color-clay)"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        {/* stem */}
        <path
          d="M32 46V22"
          stroke="var(--color-forest)"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        {/* leaves, pulsing one after another */}
        <path
          className="motion-safe:animate-[leaf-pulse_2.6s_ease-in-out_infinite]"
          d="M32 38c-8 0-11-5-11-10 7 0 11 4 11 10Z"
          fill="var(--color-moss)"
        />
        <path
          className="motion-safe:animate-[leaf-pulse_2.6s_ease-in-out_.4s_infinite]"
          d="M32 32c8 0 11-5 11-10-7 0-11 4-11 10Z"
          fill="var(--color-forest)"
        />
        <path
          className="motion-safe:animate-[leaf-pulse_2.6s_ease-in-out_.8s_infinite]"
          d="M32 24c-6 0-8.5-4-8.5-8 5.5 0 8.5 3.2 8.5 8Z"
          fill="var(--color-moss)"
        />
      </svg>
      <p
        aria-live="polite"
        className="text-sm font-medium text-[var(--color-forest)]"
      >
        {LOADING_MESSAGES[index]}
      </p>
      <p className="text-xs text-[var(--color-faint)]">
        This usually takes a few seconds.
      </p>
    </div>
  );
}
