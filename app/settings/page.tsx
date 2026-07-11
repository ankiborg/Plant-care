import { updateSettings } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { MAX_ZONE, MIN_ZONE } from "@/lib/settings";
import { SubmitButton } from "../submit-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  const settings = await prisma.appSettings.findUnique({
    where: { id: "app" },
  });

  const zones = Array.from(
    { length: MAX_ZONE - MIN_ZONE + 1 },
    (_, i) => MIN_ZONE + i
  );

  return (
    <div className="space-y-6 pt-3">
      <header className="space-y-1">
        <h1 className="text-[2rem] font-semibold leading-none text-[var(--color-ink)]">
          Settings
        </h1>
        <p className="text-[0.95rem] text-[var(--color-muted)]">
          Tell the app where you live and plant identification will say
          whether a plant would thrive at your place.
        </p>
      </header>

      <form action={updateSettings} className="card space-y-5 p-5">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-[var(--color-ink)]">
            Where I live
          </span>
          <input
            name="homeLocation"
            defaultValue={settings?.homeLocation ?? ""}
            maxLength={80}
            placeholder="e.g. Umeå"
            className="field"
          />
          <span className="block text-xs text-[var(--color-faint)]">
            Town or area — used to judge climate and growing season.
          </span>
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-[var(--color-ink)]">
            Växtzon{" "}
            <span className="font-normal text-[var(--color-faint)]">
              · Swedish hardiness zone, optional
            </span>
          </span>
          <select
            name="hardinessZone"
            defaultValue={settings?.hardinessZone?.toString() ?? ""}
            className="field"
          >
            <option value="">Not sure</option>
            {zones.map((z) => (
              <option key={z} value={z}>
                Zon {z}
              </option>
            ))}
          </select>
        </label>

        <SubmitButton className="btn btn-primary w-full py-3" pendingText="Saving…">
          Save settings
        </SubmitButton>
        {saved && (
          <p className="text-sm text-[var(--color-forest)]">Settings saved. 🌿</p>
        )}
      </form>
    </div>
  );
}
