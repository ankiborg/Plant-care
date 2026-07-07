export default function Loading() {
  return (
    <div className="animate-pulse space-y-6 pt-6">
      <div className="space-y-2">
        <div className="h-4 w-28 rounded bg-[var(--color-surface-2)]" />
        <div className="h-8 w-40 rounded bg-[var(--color-surface-2)]" />
      </div>
      <div className="space-y-2.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card flex items-center gap-3 p-3.5">
            <div className="h-11 w-11 shrink-0 rounded-full bg-[var(--color-surface-2)]" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 rounded bg-[var(--color-surface-2)]" />
              <div className="h-3 w-1/3 rounded bg-[var(--color-surface-2)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
