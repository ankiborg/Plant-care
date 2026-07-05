import { PrismaClient, LightLevel, SoilType } from "@prisma/client";

const prisma = new PrismaClient();

const species: {
  commonName: string;
  scientificName: string;
  baseWaterDays: number;
  baseFertDays: number | null;
  lightPref: LightLevel;
  defaultSoil: SoilType;
  toxicToPets: boolean;
  notes?: string;
}[] = [
  {
    commonName: "Pothos",
    scientificName: "Epipremnum aureum",
    baseWaterDays: 7,
    baseFertDays: 30,
    lightPref: "BRIGHT_INDIRECT",
    defaultSoil: "STANDARD",
    toxicToPets: true,
    notes: "Very forgiving; let the top few cm of soil dry out.",
  },
  {
    commonName: "Monstera",
    scientificName: "Monstera deliciosa",
    baseWaterDays: 8,
    baseFertDays: 30,
    lightPref: "BRIGHT_INDIRECT",
    defaultSoil: "STANDARD",
    toxicToPets: true,
    notes: "Likes to dry out a bit between waterings; wipe the big leaves.",
  },
  {
    commonName: "Snake plant",
    scientificName: "Dracaena trifasciata",
    baseWaterDays: 18,
    baseFertDays: 60,
    lightPref: "LOW",
    defaultSoil: "DRAINING",
    toxicToPets: true,
    notes: "Tolerates neglect; overwatering is the main killer.",
  },
  {
    commonName: "ZZ plant",
    scientificName: "Zamioculcas zamiifolia",
    baseWaterDays: 18,
    baseFertDays: 60,
    lightPref: "LOW",
    defaultSoil: "DRAINING",
    toxicToPets: true,
    notes: "Rhizomes store water — err on the dry side.",
  },
  {
    commonName: "Peace lily",
    scientificName: "Spathiphyllum wallisii",
    baseWaterDays: 6,
    baseFertDays: 45,
    lightPref: "MEDIUM",
    defaultSoil: "RETAINING",
    toxicToPets: true,
    notes: "Droops dramatically when thirsty, recovers fast.",
  },
  {
    commonName: "Calathea",
    scientificName: "Goeppertia orbifolia",
    baseWaterDays: 5,
    baseFertDays: 30,
    lightPref: "MEDIUM",
    defaultSoil: "RETAINING",
    toxicToPets: false,
    notes: "Fussy: likes humidity and consistently moist (not wet) soil.",
  },
  {
    commonName: "Spider plant",
    scientificName: "Chlorophytum comosum",
    baseWaterDays: 7,
    baseFertDays: 30,
    lightPref: "BRIGHT_INDIRECT",
    defaultSoil: "STANDARD",
    toxicToPets: false,
    notes: "Easy; brown tips usually mean tap-water minerals or dryness.",
  },
  {
    commonName: "Philodendron",
    scientificName: "Philodendron hederaceum",
    baseWaterDays: 7,
    baseFertDays: 30,
    lightPref: "BRIGHT_INDIRECT",
    defaultSoil: "STANDARD",
    toxicToPets: true,
    notes: "Heartleaf type; similar care to pothos.",
  },
  {
    commonName: "Fiddle leaf fig",
    scientificName: "Ficus lyrata",
    baseWaterDays: 8,
    baseFertDays: 30,
    lightPref: "BRIGHT_INDIRECT",
    defaultSoil: "DRAINING",
    toxicToPets: true,
    notes: "Hates being moved; water thoroughly, then let it dry.",
  },
  {
    commonName: "Succulent (generic)",
    scientificName: "",
    baseWaterDays: 16,
    baseFertDays: 90,
    lightPref: "DIRECT",
    defaultSoil: "DRAINING",
    toxicToPets: false,
    notes: "Soak-and-dry; water only when soil is bone dry.",
  },
  {
    commonName: "Aloe vera",
    scientificName: "Aloe barbadensis miller",
    baseWaterDays: 16,
    baseFertDays: 90,
    lightPref: "DIRECT",
    defaultSoil: "DRAINING",
    toxicToPets: true,
    notes: "Wrinkled leaves = thirsty; mushy = overwatered.",
  },
  {
    commonName: "Fern (generic)",
    scientificName: "",
    baseWaterDays: 4,
    baseFertDays: 45,
    lightPref: "MEDIUM",
    defaultSoil: "RETAINING",
    toxicToPets: false,
    notes: "Keep evenly moist; loves bathroom humidity.",
  },
  {
    commonName: "Rubber plant",
    scientificName: "Ficus elastica",
    baseWaterDays: 9,
    baseFertDays: 30,
    lightPref: "BRIGHT_INDIRECT",
    defaultSoil: "STANDARD",
    toxicToPets: true,
    notes: "Wipe leaves so they can breathe; dry topsoil before watering.",
  },
  {
    commonName: "Orchid (phalaenopsis)",
    scientificName: "Phalaenopsis spp.",
    baseWaterDays: 9,
    baseFertDays: 30,
    lightPref: "BRIGHT_INDIRECT",
    defaultSoil: "DRAINING",
    toxicToPets: false,
    notes: "Bark medium, not soil; water by soaking, never leave wet feet.",
  },
  {
    commonName: "Basil",
    scientificName: "Ocimum basilicum",
    baseWaterDays: 3,
    baseFertDays: 21,
    lightPref: "DIRECT",
    defaultSoil: "STANDARD",
    toxicToPets: false,
    notes: "Thirsty herb; pinch flowers to keep leaves coming.",
  },
];

async function main() {
  for (const s of species) {
    const existing = await prisma.species.findFirst({
      where: { commonName: s.commonName },
    });
    if (existing) {
      await prisma.species.update({ where: { id: existing.id }, data: s });
    } else {
      await prisma.species.create({ data: s });
    }
  }
  const count = await prisma.species.count();
  console.log(`Seed complete — ${count} species in database.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
