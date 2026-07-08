// Illustrated example image for each seeded species. Files live in
// public/species/ and are generated in the app's design palette; anything
// not in the map falls back to a generic sprout.
const ART: Record<string, string> = {
  Pothos: "pothos",
  Monstera: "monstera",
  "Snake plant": "snake-plant",
  "ZZ plant": "zz-plant",
  "Peace lily": "peace-lily",
  Calathea: "calathea",
  "Spider plant": "spider-plant",
  Philodendron: "philodendron",
  "Fiddle leaf fig": "fiddle-leaf-fig",
  "Succulent (generic)": "succulent",
  "Aloe vera": "aloe-vera",
  "Fern (generic)": "fern",
  "Rubber plant": "rubber-plant",
  "Orchid (phalaenopsis)": "orchid",
  "Pilea (elefantöra)": "pilea",
  "Swedish ivy (karlbergare)": "swedish-ivy",
  Basil: "basil",
};

export function speciesArt(commonName: string): string {
  return `/species/${ART[commonName] ?? "generic"}.svg`;
}
