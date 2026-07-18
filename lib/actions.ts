"use server";

import { CareType, LightLevel, PotSize, SoilType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { v2 as cloudinary } from "cloudinary";
import { prisma } from "./prisma";
import { MAX_PHOTO_MB, photoTooLargeMessage } from "./photo-limits";
import { parseSavedCategory } from "./saved-plants";
import { parseHardinessZone } from "./settings";

export async function logCare(plantId: string, type: CareType, note?: string) {
  await prisma.careLog.create({
    data: { plantId, type, note: note?.trim() || null },
  });
  revalidatePath("/");
  revalidatePath(`/plants/${plantId}`);
  revalidatePath("/plants");
}

export async function markDone(formData: FormData) {
  const plantId = String(formData.get("plantId"));
  const type = String(formData.get("type")) as CareType;
  await logCare(plantId, type);
}

export async function logCareWithNote(formData: FormData) {
  const plantId = String(formData.get("plantId"));
  const type = String(formData.get("type")) as CareType;
  const note = formData.get("note") ? String(formData.get("note")) : undefined;
  await logCare(plantId, type, note);
}

export async function createPlant(formData: FormData) {
  const speciesId = String(formData.get("speciesId"));
  const species = await prisma.species.findUniqueOrThrow({
    where: { id: speciesId },
  });

  const plant = await prisma.plant.create({
    data: {
      nickname: String(formData.get("nickname")).trim(),
      speciesId,
      location: String(formData.get("location") ?? "").trim() || null,
      potSize: String(formData.get("potSize")) as PotSize,
      soil: String(formData.get("soil") || species.defaultSoil) as SoilType,
      light: String(formData.get("light") || species.lightPref) as LightLevel,
    },
  });

  revalidatePath("/plants");
  revalidatePath("/");
  redirect(`/plants/${plant.id}`);
}

export async function updatePlant(formData: FormData) {
  const id = String(formData.get("plantId"));
  await prisma.plant.update({
    where: { id },
    data: {
      nickname: String(formData.get("nickname")).trim(),
      location: String(formData.get("location") ?? "").trim() || null,
      potSize: String(formData.get("potSize")) as PotSize,
      soil: String(formData.get("soil")) as SoilType,
      light: String(formData.get("light")) as LightLevel,
    },
  });
  revalidatePath(`/plants/${id}`);
  revalidatePath("/plants");
  revalidatePath("/");
}

export async function archivePlant(formData: FormData) {
  const id = String(formData.get("plantId"));
  await prisma.plant.update({ where: { id }, data: { archived: true } });
  revalidatePath("/plants");
  revalidatePath("/");
  redirect("/plants");
}

const CLOUDINARY_MISSING_MSG =
  "Photo storage isn't configured — add the CLOUDINARY_URL variable in Railway (Cloudinary dashboard → API Keys → \"API environment variable\").";
const CLOUDINARY_FAILED_MSG =
  "Photo upload failed — the CLOUDINARY_URL value in Railway looks wrong. Re-copy it from the Cloudinary dashboard (cloudinary://KEY:SECRET@CLOUDNAME).";

// Uploads image bytes to Cloudinary and returns the hosted URL, or a
// user-showable error message. Never throws.
async function uploadToCloudinary(
  file: File
): Promise<{ url: string } | { error: string }> {
  if (!process.env.CLOUDINARY_URL) {
    console.error("[upload] CLOUDINARY_URL is not set");
    return { error: CLOUDINARY_MISSING_MSG };
  }
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await new Promise<{ secure_url: string }>(
      (resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            { folder: "plant-care", resource_type: "image" },
            (error, result) => {
              if (error || !result) reject(error ?? new Error("upload failed"));
              else resolve(result);
            }
          )
          .end(buffer);
      }
    );
    return { url: uploaded.secure_url };
  } catch (e) {
    console.error("[upload] Cloudinary upload failed:", e);
    return { error: CLOUDINARY_FAILED_MSG };
  }
}

export type UploadState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "done" };

/** Upload a photo to a plant's gallery. Returns state instead of throwing. */
export async function uploadPhotoAction(
  formData: FormData
): Promise<UploadState> {
  const plantId = String(formData.get("plantId"));
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Choose a photo first." };
  }
  if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
    return { status: "error", message: photoTooLargeMessage(file.size) };
  }

  const uploaded = await uploadToCloudinary(file);
  if ("error" in uploaded) return { status: "error", message: uploaded.error };

  await prisma.plantPhoto.create({
    data: {
      plantId,
      url: uploaded.url,
      note: String(formData.get("note") ?? "").trim() || null,
    },
  });
  revalidatePath(`/plants/${plantId}`);
  revalidatePath("/plants");
  return { status: "done" };
}

// --- AI photo recognition (Claude vision) ---

export interface RankedSuggestion {
  scientificName: string;
  englishName: string;
  swedishName: string;
  confidence: "high" | "medium" | "low";
  description: string;
  careSummary: string;
  toxicity: string;
  suitability: string | null; // null when no home location is set
  plantingTips: string | null;
  matchedSpeciesId: string | null;
  matchedCommonName: string | null;
}

export type SuggestPlantsState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | {
      status: "done";
      isPlant: boolean;
      photoUrl: string;
      suggestions: RankedSuggestion[];
    };

/**
 * Open-ended identification for the Identify page: upload a photo of any
 * plant and get ranked suggestions. Marks suggestions that match a seeded
 * species so the UI can offer "Add to my plants".
 */
export async function suggestPlantsFromUpload(
  formData: FormData
): Promise<SuggestPlantsState> {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Choose a photo first." };
  }
  if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
    return { status: "error", message: photoTooLargeMessage(file.size) };
  }

  const uploaded = await uploadToCloudinary(file);
  if ("error" in uploaded) return { status: "error", message: uploaded.error };

  // With a home location set, suggestions also judge thrive-at-home fit.
  const settings = await prisma.appSettings.findUnique({
    where: { id: "app" },
  });
  const home = settings?.homeLocation
    ? {
        location: settings.homeLocation,
        zone: settings.hardinessZone ?? undefined,
      }
    : undefined;

  const { suggestPlants } = await import("./vision");
  const result = await suggestPlants(uploaded.url, { home });
  if ("error" in result) return { status: "error", message: result.error };

  const species = await prisma.species.findMany({
    select: { id: true, commonName: true, scientificName: true },
  });
  const byScientificName = new Map(
    species
      .filter((s) => s.scientificName)
      .map((s) => [s.scientificName!.trim().toLowerCase(), s])
  );

  return {
    status: "done",
    isPlant: result.isPlant,
    photoUrl: uploaded.url,
    suggestions: result.suggestions.map((s) => {
      const match = byScientificName.get(
        s.scientificName.trim().toLowerCase()
      );
      return {
        ...s,
        suitability: s.suitability?.trim() || null,
        plantingTips: s.plantingTips?.trim() || null,
        matchedSpeciesId: match?.id ?? null,
        matchedCommonName: match?.commonName ?? null,
      };
    }),
  };
}

// --- Saved plants (Garden tab: garden / wishlist / spotted) ---

export type SavePlantState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "done"; id: string };

/** Save an identification suggestion to the Garden tab. */
export async function saveIdentifiedPlant(
  formData: FormData
): Promise<SavePlantState> {
  const category = parseSavedCategory(formData.get("category"));
  if (!category) {
    return { status: "error", message: "Pick a category first." };
  }
  const scientificName = String(formData.get("scientificName") ?? "").trim();
  if (!scientificName) {
    return { status: "error", message: "Missing plant name — try again." };
  }
  const text = (key: string) => String(formData.get(key) ?? "").trim();
  const photoUrl = text("photoUrl");

  const saved = await prisma.savedPlant.create({
    data: {
      category,
      scientificName,
      swedishName: text("swedishName"),
      englishName: text("englishName"),
      description: text("description"),
      careSummary: text("careSummary"),
      toxicity: text("toxicity"),
      suitability: text("suitability") || null,
      plantingTips: text("plantingTips") || null,
      // Trust rules: only our own Cloudinary uploads / Wikimedia thumbnails.
      photoUrl: photoUrl.startsWith("https://res.cloudinary.com/")
        ? photoUrl
        : null,
      wikiImageUrl: text("wikiImageUrl").startsWith(
        "https://upload.wikimedia.org/"
      )
        ? text("wikiImageUrl")
        : null,
    },
  });
  revalidatePath("/garden");
  return { status: "done", id: saved.id };
}

/** Update a saved plant's category and/or note from its detail page. */
export async function updateSavedPlant(formData: FormData) {
  const id = String(formData.get("id"));
  const category = parseSavedCategory(formData.get("category"));
  if (!category) return;
  await prisma.savedPlant.update({
    where: { id },
    data: { category, note: String(formData.get("note") ?? "").trim() || null },
  });
  revalidatePath("/garden");
  revalidatePath(`/garden/${id}`);
}

export async function deleteSavedPlant(formData: FormData) {
  const id = String(formData.get("id"));
  await prisma.savedPlant.delete({ where: { id } });
  revalidatePath("/garden");
  redirect("/garden");
}

// --- Settings ---

/** Save where the user lives (single settings row, fixed id "app"). */
export async function updateSettings(formData: FormData) {
  const homeLocation =
    String(formData.get("homeLocation") ?? "").trim() || null;
  const hardinessZone = parseHardinessZone(formData.get("hardinessZone"));
  await prisma.appSettings.upsert({
    where: { id: "app" },
    update: { homeLocation, hardinessZone },
    create: { id: "app", homeLocation, hardinessZone },
  });
  revalidatePath("/settings");
  redirect("/settings?saved=1");
}

export type DiagnoseState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | {
      status: "done";
      overall: "looks_healthy" | "needs_attention";
      issues: string[];
      suggestions: string[];
    };

/** Diagnose a plant's most recent photo for visible health problems. */
export async function diagnoseLatestPhoto(
  formData: FormData
): Promise<DiagnoseState> {
  const plantId = String(formData.get("plantId"));
  const plant = await prisma.plant.findUnique({
    where: { id: plantId },
    include: {
      species: true,
      photos: { orderBy: { takenAt: "desc" }, take: 1 },
    },
  });
  if (!plant) return { status: "error", message: "Plant not found." };
  const photo = plant.photos[0];
  if (!photo) {
    return { status: "error", message: "Add a photo first, then diagnose." };
  }

  const { diagnosePlant } = await import("./vision");
  const result = await diagnosePlant(photo.url, {
    commonName: plant.species.commonName,
    light: plant.light,
    soil: plant.soil,
    potSize: plant.potSize,
  });
  if ("error" in result) return { status: "error", message: result.error };

  return {
    status: "done",
    overall: result.overall,
    issues: result.issues,
    suggestions: result.suggestions,
  };
}
