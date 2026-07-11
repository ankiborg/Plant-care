-- CreateEnum
CREATE TYPE "SavedCategory" AS ENUM ('GARDEN', 'WISHLIST', 'SPOTTED');

-- CreateTable
CREATE TABLE "SavedPlant" (
    "id" TEXT NOT NULL,
    "category" "SavedCategory" NOT NULL,
    "scientificName" TEXT NOT NULL,
    "swedishName" TEXT NOT NULL,
    "englishName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "careSummary" TEXT NOT NULL,
    "toxicity" TEXT NOT NULL,
    "suitability" TEXT,
    "plantingTips" TEXT,
    "photoUrl" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedPlant_pkey" PRIMARY KEY ("id")
);
