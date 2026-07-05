-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "LightLevel" AS ENUM ('LOW', 'MEDIUM', 'BRIGHT_INDIRECT', 'DIRECT');

-- CreateEnum
CREATE TYPE "SoilType" AS ENUM ('DRAINING', 'STANDARD', 'RETAINING');

-- CreateEnum
CREATE TYPE "PotSize" AS ENUM ('SMALL', 'MEDIUM', 'LARGE');

-- CreateEnum
CREATE TYPE "CareType" AS ENUM ('WATER', 'FERTILIZE', 'REPOT', 'PRUNE', 'CLEAN', 'NOTE');

-- CreateTable
CREATE TABLE "Species" (
    "id" TEXT NOT NULL,
    "commonName" TEXT NOT NULL,
    "scientificName" TEXT,
    "baseWaterDays" INTEGER NOT NULL,
    "baseFertDays" INTEGER,
    "lightPref" "LightLevel" NOT NULL,
    "defaultSoil" "SoilType" NOT NULL DEFAULT 'STANDARD',
    "toxicToPets" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "Species_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plant" (
    "id" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "speciesId" TEXT NOT NULL,
    "location" TEXT,
    "potSize" "PotSize" NOT NULL DEFAULT 'MEDIUM',
    "soil" "SoilType" NOT NULL DEFAULT 'STANDARD',
    "light" "LightLevel" NOT NULL,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareLog" (
    "id" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "type" "CareType" NOT NULL,
    "doneAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "CareLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlantPhoto" (
    "id" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "PlantPhoto_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Plant" ADD CONSTRAINT "Plant_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "Species"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareLog" ADD CONSTRAINT "CareLog_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantPhoto" ADD CONSTRAINT "PlantPhoto_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

