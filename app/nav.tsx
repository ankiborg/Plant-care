"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function LeafMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none">
      <path
        d="M12 21c0-6 0-9 6-13-1 6-2.5 9-6 10.5M12 21c0-4.5-.5-7-4.5-9.5C8 15 9.5 17 12 18.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconToday({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
      <path
        d="M12 20c0-5 1-8 6-11-1 5.5-2.5 8.5-6 9.5M12 20c0-4-.5-6.5-4-9 1.5 4 3 5.5 4 6.5"
        stroke="currentColor"
        strokeWidth={active ? 1.9 : 1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconPlants({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="7" height="7" rx="2" stroke="currentColor" strokeWidth={active ? 1.9 : 1.6} />
      <rect x="13" y="4" width="7" height="7" rx="2" stroke="currentColor" strokeWidth={active ? 1.9 : 1.6} />
      <rect x="4" y="13" width="7" height="7" rx="2" stroke="currentColor" strokeWidth={active ? 1.9 : 1.6} />
      <rect x="13" y="13" width="7" height="7" rx="2" stroke="currentColor" strokeWidth={active ? 1.9 : 1.6} />
    </svg>
  );
}

function IconAdd() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function TopBar() {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--color-line)] bg-[var(--color-canvas)]/85 backdrop-blur">
      <div className="mx-auto flex max-w-xl items-center gap-2 px-5 py-3.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-sage)] text-[var(--color-forest)]">
          <LeafMark className="h-4 w-4" />
        </span>
        <span className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-[var(--color-forest)]">
          Fern
        </span>
      </div>
    </header>
  );
}

const TABS = [
  { href: "/", label: "Today", icon: IconToday },
  { href: "/plants", label: "Plants", icon: IconPlants },
  { href: "/plants/new", label: "Add", icon: IconAdd },
] as const;

export function TabBar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/plants/new") return pathname === "/plants/new";
    return pathname === "/plants" || (pathname.startsWith("/plants/") && pathname !== "/plants/new");
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--color-line)] bg-[var(--color-surface)]/95 backdrop-blur">
      <div className="mx-auto flex max-w-xl items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {TABS.map((tab) => {
          const active = isActive(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[0.68rem] font-medium transition-colors ${
                active ? "text-[var(--color-forest)]" : "text-[var(--color-faint)]"
              }`}
            >
              <span
                className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors ${
                  active ? "bg-[var(--color-sage)]" : ""
                }`}
              >
                <Icon active={active} />
              </span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
