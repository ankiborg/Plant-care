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

export async function uploadPhoto(formData: FormData) {
  const plantId = String(formData.get("plantId"));
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return;

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

  await prisma.plantPhoto.create({
    data: {
      plantId,
      url: uploaded.secure_url,
      note: String(formData.get("note") ?? "").trim() || null,
    },
  });
  revalidatePath(`/plants/${plantId}`);
  revalidatePath("/plants");
}
