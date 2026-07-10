import { IdentifyClient } from "./identify-client";

export const metadata = { title: "Identify a plant" };

export default function IdentifyPage() {
  return (
    <div className="space-y-6 pt-3">
      <header className="space-y-1">
        <h1 className="text-[2rem] font-semibold leading-none text-[var(--color-ink)]">
          Identify a plant
        </h1>
        <p className="text-[0.95rem] text-[var(--color-muted)]">
          Snap or upload a photo of any plant and get the most likely matches.
        </p>
      </header>

      <IdentifyClient />
    </div>
  );
}
