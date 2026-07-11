"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

function IconMoon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M20.5 14.3A8 8 0 1 1 9.7 3.5a6.5 6.5 0 0 0 10.8 10.8Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSun() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 2.5v2M12 19.5v2M4.5 12h-2M21.5 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M18.4 5.6l1.4-1.4M4.2 19.8l1.4-1.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || stored === "light") setTheme(stored);
    else
      setTheme(
        window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
      );
  }, []);

  function toggle() {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try {
        localStorage.setItem("theme", next);
      } catch {
        /* private mode — ignore */
      }
      return next;
    });
  }

  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-muted)] transition-colors hover:bg-[var(--color-sage)] hover:text-[var(--color-forest)]"
    >
      {theme === "dark" ? <IconSun /> : theme === "light" ? <IconMoon /> : null}
    </button>
  );
}

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

function IconIdentify({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
      <path
        d="M8 6.5 9.3 4.6c.25-.37.66-.6 1.11-.6h3.18c.45 0 .86.23 1.11.6L16 6.5h2.5A2.5 2.5 0 0 1 21 9v8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17V9a2.5 2.5 0 0 1 2.5-2.5H8Z"
        stroke="currentColor"
        strokeWidth={active ? 1.9 : 1.6}
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth={active ? 1.9 : 1.6} />
    </svg>
  );
}

function IconGarden({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
      {/* deciduous tree: crown + trunk */}
      <path
        d="M12 4a6 6 0 0 1 6 6c0 3-2.5 5.5-6 5.5S6 13 6 10a6 6 0 0 1 6-6Z"
        stroke="currentColor"
        strokeWidth={active ? 1.9 : 1.6}
        strokeLinejoin="round"
      />
      <path
        d="M12 15.5V21M12 18l2.5-2M12 19l-2-1.5"
        stroke="currentColor"
        strokeWidth={active ? 1.9 : 1.6}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function TopBar() {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--color-line)] bg-[var(--color-canvas)]/85 backdrop-blur">
      <div className="mx-auto flex max-w-xl items-center justify-between px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-sage)] text-[var(--color-forest)]">
            <LeafMark className="h-4 w-4" />
          </span>
          <span className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-[var(--color-forest)]">
            Fern
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href="/settings"
            aria-label="Settings"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-muted)] transition-colors hover:bg-[var(--color-sage)] hover:text-[var(--color-forest)]"
          >
            <IconGear />
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

function IconGear() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M18 6l-1.6 1.6M7.6 16.4 6 18M18 18l-1.6-1.6M7.6 7.6 6 6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

const TABS = [
  { href: "/", label: "Today", icon: IconToday },
  { href: "/plants", label: "Plants", icon: IconPlants },
  { href: "/garden", label: "Garden", icon: IconGarden },
  { href: "/identify", label: "Identify", icon: IconIdentify },
] as const;

export function TabBar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    // Adding a plant lives under the Plants tab (/plants/new).
    return pathname === href || pathname.startsWith(`${href}/`);
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
