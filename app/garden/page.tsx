import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  SAVED_CATEGORIES,
  SAVED_CATEGORY_KEYS,
  parseSavedCategory,
} from "@/lib/saved-plants";
import { WikiImage } from "../identify/wiki-image";

export const dynamic = "force-dynamic";
export const metadata = { title: "Garden" };

export default async function GardenPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const { cat } = await searchParams;
  const activeCat = parseSavedCategory(cat);

  const allPlants = await prisma.savedPlant.findMany({
    orderBy: { createdAt: "desc" },
  });
  const plants = activeCat
    ? allPlants.filter((p) => p.category === activeCat)
    : allPlants;

  const chipBase =
    "pill shrink-0 whitespace-nowrap px-3.5 py-1.5 text-[0.8rem] transition-colors";
  const chipOn = "bg-[var(--color-forest)] text-[var(--color-canvas)]";
  const chipOff =
    "bg-[var(--color-surface)] text-[var(--color-muted)] border border-[var(--color-line)]";

  return (
    <div className="space-y-6 pt-3">
      <header className="space-y-1">
        <h1 className="text-[2rem] font-semibold leading-none text-[var(--color-ink)]">
          Garden
        </h1>
        <p className="text-[0.95rem] text-[var(--color-muted)]">
          {allPlants.length === 0
            ? "Plants you identify and save end up here."
            : activeCat
              ? `${plants.length} in ${SAVED_CATEGORIES[activeCat].label}`
              : `${allPlants.length} saved`}
        </p>
      </header>

      <nav
        aria-label="Filter by category"
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
      >
        <Link href="/garden" className={`${chipBase} ${!activeCat ? chipOn : chipOff}`}>
          All
        </Link>
        {SAVED_CATEGORY_KEYS.map((key) => (
          <Link
            key={key}
            href={`/garden?cat=${key}`}
            className={`${chipBase} ${activeCat === key ? chipOn : chipOff}`}
          >
            {SAVED_CATEGORIES[key].emoji} {SAVED_CATEGORIES[key].label}
          </Link>
        ))}
      </nav>

      {plants.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-sage)] text-3xl">
            🌳
          </span>
          <p className="font-[family-name:var(--font-display)] text-lg">
            Nothing saved yet
          </p>
          <p className="text-sm text-[var(--color-muted)]">
            Identify a plant and tap its card to save it to your garden,
            wishlist or spotted list.
          </p>
          <Link href="/identify" className="btn btn-primary">
            Identify a plant
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {plants.map((p) => (
            <Link
              key={p.id}
              href={`/garden/${p.id}`}
              className="card space-y-2 p-3 transition-shadow hover:shadow-md"
            >
              {p.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.photoUrl}
                  alt={p.scientificName}
                  loading="lazy"
                  className="h-28 w-full rounded-xl bg-[var(--color-surface-2)] object-cover"
                />
              ) : (
                <WikiImage
                  scientificName={p.scientificName}
                  fallbackSrc="/species/generic.svg"
                  alt={p.scientificName}
                  className="h-28 w-full rounded-xl bg-[var(--color-surface-2)] object-cover"
                />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
                  {p.swedishName || p.englishName}
                </p>
                <p className="truncate text-xs italic text-[var(--color-muted)]">
                  {p.scientificName}
                </p>
                <p className="mt-1 text-xs text-[var(--color-faint)]">
                  {SAVED_CATEGORIES[p.category].emoji}{" "}
                  {SAVED_CATEGORIES[p.category].label}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
