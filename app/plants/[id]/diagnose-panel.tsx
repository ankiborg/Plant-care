"use client";

import { useState, useTransition } from "react";
import { diagnoseLatestPhoto, DiagnoseState } from "@/lib/actions";

export function DiagnosePanel({
  plantId,
  hasPhoto,
}: {
  plantId: string;
  hasPhoto: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<DiagnoseState>({ status: "idle" });

  function diagnose() {
    const fd = new FormData();
    fd.set("plantId", plantId);
    startTransition(async () => {
      setState(await diagnoseLatestPhoto(fd));
    });
  }

  const healthy = state.status === "done" && state.overall === "looks_healthy";

  return (
    <div className="mt-4 border-t border-[var(--color-line)] pt-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--color-ink)]">
            🔍 Health check
          </p>
          <p className="text-xs text-[var(--color-faint)]">
            AI looks at your latest photo for visible problems.
          </p>
        </div>
        <button
          type="button"
          onClick={diagnose}
          disabled={pending || !hasPhoto}
          title={hasPhoto ? undefined : "Add a photo first"}
          className="btn btn-ghost shrink-0"
        >
          {pending ? "Checking…" : "Diagnose"}
        </button>
      </div>

      {state.status === "error" && (
        <p className="mt-3 text-sm text-[var(--color-clay)]">{state.message}</p>
      )}

      {state.status === "done" && (
        <div
          className={`mt-3 rounded-xl p-3 ${
            healthy
              ? "bg-[var(--color-sage)]/60"
              : "bg-[var(--color-honey-soft)]"
          }`}
        >
          <p
            className={`font-[family-name:var(--font-display)] text-base font-semibold ${
              healthy ? "text-[var(--color-forest)]" : "text-[var(--color-honey)]"
            }`}
          >
            {healthy ? "✅ Looks healthy" : "⚠️ Needs attention"}
          </p>

          {state.issues.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-faint)]">
                Seen
              </p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-[var(--color-ink)]">
                {state.issues.map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

          {state.suggestions.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-faint)]">
                Try
              </p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-[var(--color-ink)]">
                {state.suggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-2 text-[0.68rem] text-[var(--color-faint)]">
            AI guidance — use your own judgement.
          </p>
        </div>
      )}
    </div>
  );
}
