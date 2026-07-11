-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL DEFAULT 'app',
    "homeLocation" TEXT,
    "hardinessZone" INTEGER,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);
