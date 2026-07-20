import { prisma } from "./prisma";

export type FavoriteIngredient = { name: string; grams: number; shop?: string };

export type FavoriteMealDTO = {
  id: string;
  name: string;
  mealTypes: string[];
  ingredients: FavoriteIngredient[] | null;
  recipe: string[] | null;
  portionG: number | null;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  prepMinutes: number | null;
  priceEur: number | null;
  maxPerWeek: number | null;
  note: string | null;
  active: boolean;
};

export type FavoriteInput = Omit<FavoriteMealDTO, "id">;

// Štartovací set – Samuelove reálne jedlá (dá sa importovať jedným ťuknutím a potom upraviť).
export const DEFAULT_FAVORITES: FavoriteInput[] = [
  {
    name: "Ovsené vločky s horkou čokoládou, čučoriedkami a banánom",
    mealTypes: ["BREAKFAST"],
    ingredients: [
      { name: "Ovsené vločky", grams: 80 },
      { name: "Čučoriedky", grams: 80 },
      { name: "Banán", grams: 120 },
      { name: "Horká čokoláda 85 %", grams: 15, shop: "Yeme (85 %+)" },
      { name: "Mlieko / voda", grams: 200 },
    ],
    recipe: [
      "Vločky zalej mliekom a nechaj 2–3 min napučať (alebo krátko prevar).",
      "Pridaj nakrájaný banán a čučoriedky.",
      "Navrch nastrúhaj horkú čokoládu 85 %.",
    ],
    portionG: 495,
    caloriesKcal: 647,
    proteinG: 20,
    carbsG: 95,
    fatG: 18,
    prepMinutes: 5,
    priceEur: 1.5,
    maxPerWeek: null,
    note: null,
    active: true,
  },
  {
    name: "Omeleta zo 4 vajec s celozrnným chlebom a avokádom",
    mealTypes: ["BREAKFAST"],
    ingredients: [
      { name: "Vajcia (4 ks)", grams: 220, shop: "Yeme (farmárske)" },
      { name: "Celozrnný chlieb", grams: 60 },
      { name: "Avokádo", grams: 70 },
      { name: "Kečup", grams: 20 },
      { name: "Olivový olej", grams: 5 },
    ],
    recipe: [
      "Vajcia rozšľahaj, osoľ a okoreň.",
      "Na olivovom oleji usmaž omeletu/praženicu na miernom ohni.",
      "Podávaj s opečeným celozrnným chlebom, plátkami avokáda a kečupom.",
    ],
    portionG: 375,
    caloriesKcal: 657,
    proteinG: 34,
    carbsG: 40,
    fatG: 38,
    prepMinutes: 10,
    priceEur: 2,
    maxPerWeek: null,
    note: null,
    active: true,
  },
  {
    name: "Grécky jogurt s vločkami, medom a ovocím",
    mealTypes: ["BREAKFAST", "SNACK"],
    ingredients: [
      { name: "Grécky jogurt (plnotučný)", grams: 200 },
      { name: "Ovsené vločky", grams: 40 },
      { name: "Med", grams: 15, shop: "Yeme (slovenský lesný)" },
      { name: "Ovocie", grams: 100 },
    ],
    recipe: ["Jogurt zmiešaj s vločkami.", "Pridaj ovocie a prelej medom."],
    portionG: 355,
    caloriesKcal: 448,
    proteinG: 22,
    carbsG: 55,
    fatG: 12,
    prepMinutes: 3,
    priceEur: 1.5,
    maxPerWeek: null,
    note: null,
    active: true,
  },
  {
    name: "Chrumkavé kuracie prsia s ryžou a miešaným šalátom",
    mealTypes: ["LUNCH", "DINNER"],
    ingredients: [
      { name: "Kuracie prsia", grams: 200 },
      { name: "Ryža (suchá)", grams: 80 },
      { name: "Miešaný šalát", grams: 100 },
      { name: "Olivový olej", grams: 10 },
    ],
    recipe: [
      "Ryžu uvar podľa návodu.",
      "Kuracie prsia okoreň a opeč na panvici do chrumkava (3–4 min z každej strany).",
      "Šalát pokvapkaj olivovým olejom a podávaj.",
    ],
    portionG: 490,
    caloriesKcal: 725,
    proteinG: 55,
    carbsG: 65,
    fatG: 22,
    prepMinutes: 25,
    priceEur: 3.5,
    maxPerWeek: null,
    note: null,
    active: true,
  },
  {
    name: "Losos s opečenými zemiakmi a šalátom",
    mealTypes: ["LUNCH", "DINNER"],
    ingredients: [
      { name: "Losos", grams: 180, shop: "Kaufland (čerstvý)" },
      { name: "Zemiaky", grams: 300 },
      { name: "Olivový olej", grams: 12 },
      { name: "Šalát", grams: 100 },
    ],
    recipe: [
      "Zemiaky nakrájaj, pokvapkaj olivovým olejom, osoľ a daj do rúry na 200 °C na 25 min.",
      "Lososa okoreň a opeč 3–4 min z každej strany (alebo spolu do rúry na 12 min).",
      "Podávaj so šalátom.",
    ],
    portionG: 592,
    caloriesKcal: 729,
    proteinG: 42,
    carbsG: 50,
    fatG: 38,
    prepMinutes: 30,
    priceEur: 5,
    maxPerWeek: null,
    note: null,
    active: true,
  },
  {
    name: "Hovädzí steak s opečenými zemiakmi a šalátom",
    mealTypes: ["LUNCH", "DINNER"],
    ingredients: [
      { name: "Hovädzí steak", grams: 200, shop: "Kaufland" },
      { name: "Zemiaky", grams: 300 },
      { name: "Olivový olej", grams: 12 },
      { name: "Šalát", grams: 100 },
    ],
    recipe: [
      "Zemiaky do rúry na 200 °C, 25 min s olivovým olejom.",
      "Steak opeč 2–3 min z každej strany, nechaj 5 min odpočinúť.",
      "Podávaj so šalátom.",
    ],
    portionG: 612,
    caloriesKcal: 799,
    proteinG: 52,
    carbsG: 50,
    fatG: 42,
    prepMinutes: 20,
    priceEur: 6,
    maxPerWeek: null,
    note: null,
    active: true,
  },
  {
    name: "Bravčová panenka s opečenými zemiakmi a šalátom",
    mealTypes: ["LUNCH", "DINNER"],
    ingredients: [
      { name: "Bravčová panenka", grams: 200 },
      { name: "Zemiaky", grams: 300 },
      { name: "Olivový olej", grams: 12 },
      { name: "Šalát", grams: 100 },
    ],
    recipe: [
      "Zemiaky do rúry na 200 °C, 25 min s olivovým olejom.",
      "Panenku opeč zo všetkých strán a dopeč v rúre 10 min.",
      "Nechaj odpočinúť, nakrájaj a podávaj so šalátom.",
    ],
    portionG: 612,
    caloriesKcal: 649,
    proteinG: 48,
    carbsG: 50,
    fatG: 26,
    prepMinutes: 30,
    priceEur: 4,
    maxPerWeek: null,
    note: null,
    active: true,
  },
  {
    name: "Butter chicken s garlic naan",
    mealTypes: ["LUNCH", "DINNER"],
    ingredients: [
      { name: "Kuracie prsia", grams: 200 },
      { name: "Paradajkovo-smotanová omáčka", grams: 120 },
      { name: "Garlic naan", grams: 100 },
      { name: "Maslo", grams: 10 },
    ],
    recipe: [
      "Kuracie nakrájaj na kocky a opeč na masle.",
      "Zalej paradajkovo-smotanovou omáčkou, okoreň (garam masala) a dus 10 min.",
      "Podávaj s naan chlebom.",
    ],
    portionG: 430,
    caloriesKcal: 852,
    proteinG: 52,
    carbsG: 70,
    fatG: 38,
    prepMinutes: 35,
    priceEur: 4,
    maxPerWeek: null,
    note: null,
    active: true,
  },
  {
    name: "Bryndzové halušky so slaninou",
    mealTypes: ["LUNCH", "DINNER"],
    ingredients: [
      { name: "Halušky", grams: 350 },
      { name: "Bryndza", grams: 100 },
      { name: "Slanina", grams: 40 },
    ],
    recipe: [
      "Halušky uvar vo vriacej osolenej vode.",
      "Slaninu opraž do chrumkava.",
      "Halušky zamiešaj s bryndzou a posyp slaninou.",
    ],
    portionG: 490,
    caloriesKcal: 940,
    proteinG: 35,
    carbsG: 85,
    fatG: 48,
    prepMinutes: 30,
    priceEur: 3,
    maxPerWeek: 1,
    note: "Ťažké jedlo, vysoký GI – max 1× týždenne.",
    active: true,
  },
  {
    name: "Domáci burger s opečenými batátmi",
    mealTypes: ["LUNCH", "DINNER"],
    ingredients: [
      { name: "Hovädzie mleté", grams: 180 },
      { name: "Celozrnná žemľa", grams: 90 },
      { name: "Šalát + paradajka", grams: 70 },
      { name: "Medovo-horčicová omáčka", grams: 20 },
      { name: "Batáty", grams: 250 },
      { name: "Olivový olej", grams: 10 },
    ],
    recipe: [
      "Batáty nakrájaj, pokvapkaj olivovým olejom a daj do rúry na 200 °C na 25 min.",
      "Z mletého vytvaruj fašírku, okoreň a opeč 3–4 min z každej strany.",
      "Zlož burger: žemľa, omáčka, mäso, šalát, paradajka.",
    ],
    portionG: 620,
    caloriesKcal: 995,
    proteinG: 45,
    carbsG: 95,
    fatG: 45,
    prepMinutes: 25,
    priceEur: 4.5,
    maxPerWeek: null,
    note: null,
    active: true,
  },
  {
    name: "Zelené anti-akné smoothie",
    mealTypes: ["SNACK"],
    ingredients: [
      { name: "Špenát", grams: 50 },
      { name: "Čučoriedky", grams: 80 },
      { name: "Banán", grams: 100 },
      { name: "Mandľové mlieko", grams: 250 },
      { name: "Srvátkový proteín", grams: 30 },
      { name: "Zázvor", grams: 5 },
    ],
    recipe: ["Všetko rozmixuj do hladka.", "Prípadne dolaď hustotu vodou."],
    portionG: 515,
    caloriesKcal: 311,
    proteinG: 28,
    carbsG: 38,
    fatG: 6,
    prepMinutes: 3,
    priceEur: 1.5,
    maxPerWeek: null,
    note: "Omega-3/zinok/antioxidanty – cielené na kožu.",
    active: true,
  },
  {
    name: "Regeneračné smoothie po tréningu",
    mealTypes: ["SNACK"],
    ingredients: [
      { name: "Jahody", grams: 120 },
      { name: "Banán", grams: 120 },
      { name: "Ľanové semienka", grams: 10 },
      { name: "Srvátkový proteín", grams: 30 },
      { name: "Kokosová voda", grams: 250 },
      { name: "Kurkuma", grams: 3 },
    ],
    recipe: ["Všetko rozmixuj.", "Vypi do 45 min po tréningu."],
    portionG: 533,
    caloriesKcal: 363,
    proteinG: 28,
    carbsG: 48,
    fatG: 8,
    prepMinutes: 3,
    priceEur: 1.5,
    maxPerWeek: null,
    note: "Rýchle sacharidy + bielkoviny na doplnenie glykogénu.",
    active: true,
  },
];

export const DEFAULT_FOOD_RULES = `Obchody: Lidl (základ), Kaufland (steak, čerstvý losos), Yeme (med slovenský lesný, farmárske vajcia, čokoláda 85 %+).
Rozpočet: 50–60 € týždenne.
Vždy doma: kuracie, zemiaky, ryža, vajcia, šalát.
Rotácia mäsa: losos / steak / bravčová panenka / kuracie – striedať.
Zemiaky VŽDY v rúre s olivovým olejom (200 °C, 25 min) – nikdy vyprážané.
NEZARAĎOVAŤ: hranolky z fritézy, vyprážaný syr (akné trigger).
Palacinky so šľahačkou a nutellou = cheat meal, max 1× za 2 týždne.
Cieľ: minimum rôznych ingrediencií – menej plytvania, nižšie náklady.`;

function toDTO(m: {
  id: string;
  name: string;
  mealTypes: string[];
  ingredients: unknown;
  recipe: unknown;
  portionG: number | null;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  prepMinutes: number | null;
  priceEur: number | null;
  maxPerWeek: number | null;
  note: string | null;
  active: boolean;
}): FavoriteMealDTO {
  return {
    id: m.id,
    name: m.name,
    mealTypes: m.mealTypes,
    ingredients: (m.ingredients as FavoriteIngredient[] | null) ?? null,
    recipe: (m.recipe as string[] | null) ?? null,
    portionG: m.portionG,
    caloriesKcal: m.caloriesKcal,
    proteinG: m.proteinG,
    carbsG: m.carbsG,
    fatG: m.fatG,
    prepMinutes: m.prepMinutes,
    priceEur: m.priceEur,
    maxPerWeek: m.maxPerWeek,
    note: m.note,
    active: m.active,
  };
}

export async function listFavorites(userId: string): Promise<FavoriteMealDTO[]> {
  const rows = await prisma.favoriteMeal.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toDTO);
}

export async function createFavorite(userId: string, data: FavoriteInput): Promise<FavoriteMealDTO> {
  const row = await prisma.favoriteMeal.create({
    data: {
      userId,
      name: data.name,
      mealTypes: data.mealTypes,
      ingredients: data.ingredients ?? undefined,
      recipe: data.recipe ?? undefined,
      portionG: data.portionG,
      caloriesKcal: data.caloriesKcal,
      proteinG: data.proteinG,
      carbsG: data.carbsG,
      fatG: data.fatG,
      prepMinutes: data.prepMinutes,
      priceEur: data.priceEur,
      maxPerWeek: data.maxPerWeek,
      note: data.note,
      active: data.active,
    },
  });
  return toDTO(row);
}

export async function updateFavorite(
  userId: string,
  id: string,
  data: Partial<FavoriteInput>,
): Promise<FavoriteMealDTO | null> {
  const existing = await prisma.favoriteMeal.findFirst({ where: { id, userId } });
  if (!existing) return null;
  const row = await prisma.favoriteMeal.update({
    where: { id },
    data: {
      name: data.name ?? undefined,
      mealTypes: data.mealTypes ?? undefined,
      ingredients: data.ingredients === undefined ? undefined : (data.ingredients ?? undefined),
      recipe: data.recipe === undefined ? undefined : (data.recipe ?? undefined),
      portionG: data.portionG === undefined ? undefined : data.portionG,
      caloriesKcal: data.caloriesKcal ?? undefined,
      proteinG: data.proteinG ?? undefined,
      carbsG: data.carbsG ?? undefined,
      fatG: data.fatG ?? undefined,
      prepMinutes: data.prepMinutes === undefined ? undefined : data.prepMinutes,
      priceEur: data.priceEur === undefined ? undefined : data.priceEur,
      maxPerWeek: data.maxPerWeek === undefined ? undefined : data.maxPerWeek,
      note: data.note === undefined ? undefined : data.note,
      active: data.active ?? undefined,
    },
  });
  return toDTO(row);
}

export async function deleteFavorite(userId: string, id: string): Promise<void> {
  await prisma.favoriteMeal.deleteMany({ where: { id, userId } });
}

// Naimportuje štartovací set (len ak používateľ ešte nemá žiadne jedlá).
export async function importDefaultFavorites(userId: string): Promise<number> {
  const count = await prisma.favoriteMeal.count({ where: { userId } });
  if (count > 0) return 0;
  await prisma.favoriteMeal.createMany({
    data: DEFAULT_FAVORITES.map((f) => ({
      userId,
      name: f.name,
      mealTypes: f.mealTypes,
      ingredients: f.ingredients ?? undefined,
      recipe: f.recipe ?? undefined,
      portionG: f.portionG,
      caloriesKcal: f.caloriesKcal,
      proteinG: f.proteinG,
      carbsG: f.carbsG,
      fatG: f.fatG,
      prepMinutes: f.prepMinutes,
      priceEur: f.priceEur,
      maxPerWeek: f.maxPerWeek,
      note: f.note,
      active: f.active,
    })),
  });
  // Ak ešte nemá pravidlá, doplň predvolené.
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { foodRules: true } });
  if (!user?.foodRules) {
    await prisma.user.update({ where: { id: userId }, data: { foodRules: DEFAULT_FOOD_RULES } });
  }
  return DEFAULT_FAVORITES.length;
}

// Koľkokrát bolo jedlo zapísané za posledných 7 dní (na rotáciu).
export async function recentMealCounts(userId: string): Promise<Record<string, number>> {
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const logs = await prisma.foodLog.findMany({
    where: { userId, loggedAt: { gte: since } },
    include: { food: { select: { name: true } } },
  });
  const counts: Record<string, number> = {};
  for (const l of logs) {
    const n = l.food.name.toLowerCase();
    counts[n] = (counts[n] ?? 0) + 1;
  }
  return counts;
}
