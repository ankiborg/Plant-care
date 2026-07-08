import Link from "next/link";
import { notFound } from "next/navigation";
import {
  archivePlant,
  logCareWithNote,
  updatePlant,
} from "@/lib/actions";
import {
  formatDate,
  lastCareDate,
  nextFertFor,
  nextWaterFor,
  PlantWithRelations,
} from "@/lib/care";
import { daysBetween, startOfUTCDay } from "@/lib/schedule";
import { prisma } from "@/lib/prisma";
import { speciesArt } from "@/lib/species-art";
import { LocationField } from "../../location-field";
import { PhotoGallery } from "./photo-gallery";
import { PhotoUploadForm } from "./photo-upload-form";
import { ArchiveButton } from "./archive-button";
import { DiagnosePanel } from "./diagnose-panel";
import { SubmitButton } from "../../submit-button";

export const dynamic = "force-dynamic";

const CARE_BUTTONS: { type: string; label: string }[] = [
  { type: "WATER", label: "💧 Water" },
  { type: "FERTILIZE", label: "🌱 Fertilize" },
  { type: "REPOT", label: "🪴 Repot" },
  { type: "PRUNE", label: "✂️ Prune" },
  { type: "CLEAN", label: "🧽 Clean" },
  { type: "NOTE", label: "📝 Note" },
];

const CARE_EMOJI: Record<string, string> = {
  WATER: "💧",
  FERTILIZE: "🌱",
  REPOT: "🪴",
  PRUNE: "✂️",
  CLEAN: "🧽",
  NOTE: "📝",
};

function relative(next: Date): string {
  const days = daysBetween(startOfUTCDay(new Date()), next);
  if (days < 0) return `${-days} day${days === -1 ? "" : "s"} overdue`;
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

function StatCard({
  label,
  glyph,
  date,
  last,
}: {
  label: string;
  glyph: string;
  date: Date | null;
  last?: Date;
}) {
  const overdue = date ? daysBetween(startOfUTCDay(new Date()), date) < 0 : false;
  return (
    <div className="card p-4">
      <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-muted)]">
        <span>{glyph}</span>
        {label}
      </p>
      {date ? (
        <>
          <p className="mt-1.5 font-[family-name:var(--font-display)] text-lg font-semibold leading-tight text-[var(--color-ink)]">
            {date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </p>
          <p
            className={`text-xs ${
              overdue ? "font-semibold text-[var(--color-clay)]" : "text-[var(--color-faint)]"
            }`}
          >
            {relative(date)}
          </p>
        </>
      ) : (
        <p className="mt-1.5 text-sm text-[var(--color-faint)]">Not needed</p>
      )}
      {date && last && (
        <p className="mt-2 border-t border-[var(--color-line)] pt-2 text-[0.68rem] text-[var(--color-faint)]">
          last {formatDate(last)}
        </p>
      )}
    </div>
  );
}

const SELECT = "field";

export default async function PlantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const plant = (await prisma.plant.findUnique({
    where: { id },
    include: {
      species: true,
      logs: { orderBy: { doneAt: "desc" } },
      photos: { orderBy: { takenAt: "desc" } },
    },
  })) as PlantWithRelations | null;

  if (!plant || plant.archived) notFound();

  const locationRows = await prisma.plant.findMany({
    where: { archived: false, location: { not: null } },
    select: { location: true },
    distinct: ["location"],
    orderBy: { location: "asc" },
  });
  const locations = locationRows
    .map((r) => r.location)
    .filter((l): l is string => Boolean(l));

  const nextWater = nextWaterFor(plant);
  const nextFert = nextFertFor(plant);

  return (
    <div className="space-y-6 pt-3">
      <Link
        href="/plants"
        className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-forest)]"
      >
        ← Plants
      </Link>

      {/* Hero */}
      <header className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={plant.photos[0]?.url ?? speciesArt(plant.species.commonName)}
          alt=""
          className="h-20 w-20 shrink-0 rounded-2xl object-cover shadow-[0_4px_14px_rgba(26,42,32,0.12)]"
        />
        <div className="min-w-0 space-y-1.5">
          <h1 className="text-[1.9rem] font-semibold leading-tight text-[var(--color-ink)]">
            {plant.nickname}
          </h1>
          <p className="text-[0.95rem] text-[var(--color-muted)]">
            <span className="italic">{plant.species.commonName}</span>
            {plant.location && <span> · {plant.location}</span>}
          </p>
          {plant.species.toxicToPets && (
            <span className="pill bg-[var(--color-clay-soft)] text-[var(--color-clay)]">
              ⚠ Toxic to pets
            </span>
          )}
        </div>
      </header>

      {/* Next care */}
      <div className="grid grid-cols-2 gap-3.5">
        <StatCard
          label="Water"
          glyph="💧"
          date={nextWater}
          last={lastCareDate(plant, "WATER")}
        />
        <StatCard
          label="Fertilize"
          glyph="🌱"
          date={nextFert}
          last={nextFert ? lastCareDate(plant, "FERTILIZE") : undefined}
        />
      </div>

      {/* Log care */}
      <section className="card p-5">
        <h2 className="mb-3 text-base font-semibold text-[var(--color-ink)]">
          Log care
        </h2>
        <form action={logCareWithNote} className="space-y-3">
          <input type="hidden" name="plantId" value={plant.id} />
          <div className="grid grid-cols-3 gap-2">
            {CARE_BUTTONS.map((b) => (
              <button
                key={b.type}
                type="submit"
                name="type"
                value={b.type}
                className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-2.5 text-sm font-medium text-[var(--color-ink)] transition-colors hover:border-[var(--color-moss)] hover:bg-[var(--color-sage)]"
              >
                {b.label}
              </button>
            ))}
          </div>
          <input
            name="note"
            maxLength={200}
            placeholder="Add a note (optional)…"
            className="field"
          />
        </form>
      </section>

      {/* Photos */}
      <section className="card p-5">
        <h2 className="mb-3 text-base font-semibold text-[var(--color-ink)]">
          Photos
        </h2>
        <PhotoUploadForm plantId={plant.id} />

        <PhotoGallery
          photos={plant.photos.map((photo) => ({
            id: photo.id,
            url: photo.url,
            takenAt: photo.takenAt.toISOString(),
            note: photo.note,
          }))}
        />

        <DiagnosePanel plantId={plant.id} hasPhoto={plant.photos.length > 0} />
      </section>

      {/* Details (progressive disclosure) */}
      <details className="card group p-5">
        <summary className="flex cursor-pointer list-none items-center justify-between text-base font-semibold text-[var(--color-ink)]">
          Details
          <span className="text-[var(--color-faint)] transition-transform group-open:rotate-180">
            ⌄
          </span>
        </summary>
        <form action={updatePlant} className="mt-4 space-y-4">
          <input type="hidden" name="plantId" value={plant.id} />
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Nickname</span>
            <input
              name="nickname"
              defaultValue={plant.nickname}
              required
              maxLength={60}
              className="field"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Location</span>
            <LocationField
              locations={locations}
              defaultValue={plant.location ?? ""}
            />
          </label>
          <div className="grid grid-cols-3 gap-3">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Pot</span>
              <select name="potSize" defaultValue={plant.potSize} className={SELECT}>
                <option value="SMALL">Small</option>
                <option value="MEDIUM">Medium</option>
                <option value="LARGE">Large</option>
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Soil</span>
              <select name="soil" defaultValue={plant.soil} className={SELECT}>
                <option value="DRAINING">Draining</option>
                <option value="STANDARD">Standard</option>
                <option value="RETAINING">Retaining</option>
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Light</span>
              <select name="light" defaultValue={plant.light} className={SELECT}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="BRIGHT_INDIRECT">Bright</option>
                <option value="DIRECT">Direct</option>
              </select>
            </label>
          </div>
          <SubmitButton className="btn btn-primary" pendingText="Saving…">
            Save changes
          </SubmitButton>
        </form>
      </details>

      {/* Care history (progressive disclosure) */}
      <details className="card group p-5">
        <summary className="flex cursor-pointer list-none items-center justify-between text-base font-semibold text-[var(--color-ink)]">
          Care history
          <span className="pill bg-[var(--color-surface-2)] text-[var(--color-muted)]">
            {plant.logs.length}
          </span>
        </summary>
        {plant.logs.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--color-faint)]">
            No care logged yet.
          </p>
        ) : (
          <ul className="mt-4 space-y-0">
            {plant.logs.map((log) => (
              <li
                key={log.id}
                className="flex justify-between gap-3 border-b border-[var(--color-line)] py-2.5 text-sm last:border-0"
              >
                <span className="text-[var(--color-ink)]">
                  {CARE_EMOJI[log.type] ?? ""}{" "}
                  <span className="capitalize">{log.type.toLowerCase()}</span>
                  {log.note && (
                    <span className="text-[var(--color-muted)]"> — {log.note}</span>
                  )}
                </span>
                <span className="shrink-0 text-[var(--color-faint)]">
                  {formatDate(log.doneAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </details>

      <form action={archivePlant} className="pt-1 text-center">
        <input type="hidden" name="plantId" value={plant.id} />
        <ArchiveButton />
      </form>
    </div>
  );
}
