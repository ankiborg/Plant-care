"use server";

import { CareType, LightLevel, PotSize, SoilType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { v2 as cloudinary } from "cloudinary";
import { prisma } from "./prisma";

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

// Uploads image bytes to Cloudinary and returns the hosted URL.
async function uploadToCloudinary(file: File): Promise<string> {
  if (!process.env.CLOUDINARY_URL) {
    throw new Error("CLOUDINARY_URL is not configured");
  }
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
  return uploaded.secure_url;
}

export async function uploadPhoto(formData: FormData) {
  const plantId = String(formData.get("plantId"));
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return;

  const url = await uploadToCloudinary(file);

  await prisma.plantPhoto.create({
    data: {
      plantId,
      url,
      note: String(formData.get("note") ?? "").trim() || null,
    },
  });
  revalidatePath(`/plants/${plantId}`);
  revalidatePath("/plants");
}

// --- AI photo recognition (Claude vision) ---

export type IdentifyState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | {
      status: "done";
      matchedSpeciesId: string | null;
      matchedName: string | null;
      guess: string;
      confidence: "high" | "medium" | "low";
    };

/**
 * Identify the plant in an uploaded photo and, when possible, map it to one of
 * the seeded species. Suggests only — does not create a plant. Shaped as a
 * useActionState reducer (prevState, formData).
 */
export async function identifyFromUpload(
  formData: FormData
): Promise<IdentifyState> {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Choose a photo first." };
  }

  let url: string;
  try {
    url = await uploadToCloudinary(file);
  } catch {
    return { status: "error", message: "Couldn't upload that photo." };
  }

  const species = await prisma.species.findMany({
    select: { id: true, commonName: true, scientificName: true },
    orderBy: { commonName: "asc" },
  });

  const { identifySpecies } = await import("./vision");
  const result = await identifySpecies(url, species);
  if ("error" in result) return { status: "error", message: result.error };

  const matched = result.matchedSpeciesId
    ? species.find((s) => s.id === result.matchedSpeciesId) ?? null
    : null;

  return {
    status: "done",
    matchedSpeciesId: matched?.id ?? null,
    matchedName: matched?.commonName ?? null,
    guess: result.guessCommonName || result.guessScientificName || "Unknown",
    confidence: result.confidence,
  };
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
