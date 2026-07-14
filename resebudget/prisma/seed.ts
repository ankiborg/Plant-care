import { PrismaClient } from "@prisma/client";
import { DEFAULT_RATES } from "../lib/rates";

const prisma = new PrismaClient();

// Idempotent: upsert med update:{} så att ändringar gjorda i appen
// (budgetar, kurser) inte skrivs över vid omdeploy.
const TRIP_NAME = "Italien & Schweiz";

const CATEGORIES = [
  { name: "Mat", budgetSek: 10000, color: "#6E9E58", softColor: "#EAF2E4", quick: [15, 30, 60, 90] },
  { name: "Aktiviteter", budgetSek: 5000, color: "#3D7A9E", softColor: "#E4EEF4", quick: [10, 25, 45, 80] },
  { name: "Glass", budgetSek: 1000, color: "#D9799C", softColor: "#F9E9EF", quick: [3, 4.5, 6, 9] },
  { name: "Prylar", budgetSek: 2000, color: "#C98A2E", softColor: "#F6EDDD", quick: [5, 15, 30, 60] },
  { name: "Transport", budgetSek: 3000, color: "#5E6FA3", softColor: "#E9EBF4", quick: [4, 10, 25, 50] },
  { name: "Övrigt", budgetSek: 1500, color: "#8A8578", softColor: "#EFEEEA", quick: [5, 10, 20, 40] },
];

async function main() {
  for (const [currency, rateSek] of Object.entries(DEFAULT_RATES)) {
    await prisma.fxRate.upsert({
      where: { currency },
      update: {},
      create: { currency, rateSek },
    });
  }

  const trip = await prisma.trip.upsert({
    where: { name: TRIP_NAME },
    update: {},
    create: {
      name: TRIP_NAME,
      startDate: new Date("2026-07-20T00:00:00Z"),
      endDate: new Date("2026-07-30T23:59:59Z"),
      isActive: true,
    },
  });

  for (const [i, cat] of CATEGORIES.entries()) {
    await prisma.category.upsert({
      where: { tripId_name: { tripId: trip.id, name: cat.name } },
      update: {},
      create: { ...cat, tripId: trip.id, sortOrder: i },
    });
  }

  console.log(`Seed klar: resan "${TRIP_NAME}" med ${CATEGORIES.length} kategorier.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
