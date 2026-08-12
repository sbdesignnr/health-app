// Kurátorovaná databáza bežných (generických) potravín – čisté slovenské názvy,
// hodnoty na 100 g/ml a jednotky (kusy/porcie). Toto je to, čo Open Food Facts
// (databáza čiarových kódov) nepokrýva. Vyhľadávanie ich hľadá LOKÁLNE a okamžite.
//
// Hodnoty sú bežné referenčné hodnoty na 100 g jedlej časti (surové, ak nie je uvedené inak).

import type { FoodCategory } from "./food-categories";

export type CatalogUnit = { label: string; grams: number };

export type CatalogFood = {
  slug: string;
  name: string;
  category: FoodCategory;
  base: "g" | "ml";
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  units?: CatalogUnit[]; // porcie/kusy okrem základnej g/ml
  aliases?: string[];
};

// prettier-ignore
export const FOOD_CATALOG: CatalogFood[] = [
  // ── Vajcia a mliečne ──────────────────────────────────
  { slug: "vajce-slepacie", name: "Vajce slepačie (celé)", category: "egg_dairy", base: "g", kcal: 143, protein: 12.6, carbs: 0.7, fat: 9.5, units: [{ label: "ks (M)", grams: 58 }, { label: "ks (L)", grams: 68 }], aliases: ["vajcia", "vajec", "vajicko"] },
  { slug: "vajce-bielok", name: "Vaječný bielok", category: "egg_dairy", base: "g", kcal: 52, protein: 11, carbs: 0.7, fat: 0.2, units: [{ label: "ks", grams: 33 }], aliases: ["bielok", "bielka"] },
  { slug: "vajce-zltok", name: "Vaječný žĺtok", category: "egg_dairy", base: "g", kcal: 322, protein: 16, carbs: 3.6, fat: 27, units: [{ label: "ks", grams: 17 }], aliases: ["zltok"] },
  { slug: "mlieko-polotucne", name: "Mlieko polotučné 1,5 %", category: "egg_dairy", base: "ml", kcal: 47, protein: 3.3, carbs: 4.8, fat: 1.5, units: [{ label: "pohár (250 ml)", grams: 250 }], aliases: ["mlieko"] },
  { slug: "mlieko-plnotucne", name: "Mlieko plnotučné 3,5 %", category: "egg_dairy", base: "ml", kcal: 64, protein: 3.3, carbs: 4.7, fat: 3.5, units: [{ label: "pohár (250 ml)", grams: 250 }] },
  { slug: "tvaroh-polotucny", name: "Tvaroh polotučný", category: "egg_dairy", base: "g", kcal: 121, protein: 15, carbs: 3.5, fat: 5, aliases: ["tvaroh"] },
  { slug: "tvaroh-odtucneny", name: "Tvaroh nízkotučný", category: "egg_dairy", base: "g", kcal: 72, protein: 13, carbs: 3.5, fat: 0.5 },
  { slug: "biely-jogurt", name: "Biely jogurt 3 %", category: "egg_dairy", base: "g", kcal: 61, protein: 3.5, carbs: 4.7, fat: 3.2, units: [{ label: "téglik (150 g)", grams: 150 }], aliases: ["jogurt"] },
  { slug: "grecky-jogurt", name: "Grécky jogurt", category: "egg_dairy", base: "g", kcal: 97, protein: 9, carbs: 4, fat: 5, units: [{ label: "téglik (150 g)", grams: 150 }], aliases: ["grecky jogurt"] },
  { slug: "skyr", name: "Skyr", category: "egg_dairy", base: "g", kcal: 63, protein: 11, carbs: 4, fat: 0.2, units: [{ label: "téglik (150 g)", grams: 150 }] },
  { slug: "cottage", name: "Cottage syr", category: "egg_dairy", base: "g", kcal: 98, protein: 11, carbs: 3.4, fat: 4.3, units: [{ label: "balenie (180 g)", grams: 180 }], aliases: ["kottage", "cottage cheese"] },
  { slug: "mozzarella", name: "Mozzarella", category: "egg_dairy", base: "g", kcal: 253, protein: 18, carbs: 2.2, fat: 19, units: [{ label: "guľa (125 g)", grams: 125 }] },
  { slug: "eidam", name: "Eidam 30 %", category: "egg_dairy", base: "g", kcal: 280, protein: 26, carbs: 0, fat: 19, units: [{ label: "plátok", grams: 20 }], aliases: ["syr eidam", "syr"] },
  { slug: "parmezan", name: "Parmezán", category: "egg_dairy", base: "g", kcal: 392, protein: 36, carbs: 3.2, fat: 26, units: [{ label: "lyžica strúhaný", grams: 5 }] },
  { slug: "bryndza", name: "Bryndza", category: "egg_dairy", base: "g", kcal: 227, protein: 15, carbs: 2, fat: 18 },
  { slug: "maslo", name: "Maslo", category: "egg_dairy", base: "g", kcal: 745, protein: 0.7, carbs: 0.7, fat: 82, units: [{ label: "lyžička", grams: 5 }, { label: "kocka (10 g)", grams: 10 }] },
  { slug: "smotana-na-varenie", name: "Smotana na varenie 12 %", category: "egg_dairy", base: "ml", kcal: 125, protein: 2.8, carbs: 3.8, fat: 12 },

  // ── Mäso a hydina ─────────────────────────────────────
  { slug: "kuracie-prsia", name: "Kuracie prsia", category: "meat", base: "g", kcal: 108, protein: 23, carbs: 0, fat: 1.5, units: [{ label: "ks (~150 g)", grams: 150 }], aliases: ["kura", "kuracie", "kuracie maso", "prsia"] },
  { slug: "kuracie-stehno", name: "Kuracie stehno (bez kože)", category: "meat", base: "g", kcal: 121, protein: 19, carbs: 0, fat: 4.8, aliases: ["stehno"] },
  { slug: "morcacie-prsia", name: "Morčacie prsia", category: "meat", base: "g", kcal: 104, protein: 24, carbs: 0, fat: 1, aliases: ["morka", "morcacie"] },
  { slug: "hovadzi-steak", name: "Hovädzí steak (roštenka)", category: "meat", base: "g", kcal: 158, protein: 22, carbs: 0, fat: 7.5, units: [{ label: "steak (~200 g)", grams: 200 }], aliases: ["hovadzie", "steak", "rostenka"] },
  { slug: "hovadzie-mlete", name: "Hovädzie mleté (10 % tuk)", category: "meat", base: "g", kcal: 176, protein: 20, carbs: 0, fat: 10, aliases: ["mlete maso", "hovadzie mlete"] },
  { slug: "bravcova-panenka", name: "Bravčová panenka", category: "meat", base: "g", kcal: 143, protein: 21, carbs: 0, fat: 6, units: [{ label: "ks (~250 g)", grams: 250 }], aliases: ["panenka", "bravcove"] },
  { slug: "bravcova-karé", name: "Bravčové karé", category: "meat", base: "g", kcal: 197, protein: 21, carbs: 0, fat: 12, aliases: ["kare", "bravcove kare"] },
  { slug: "slanina", name: "Slanina", category: "meat", base: "g", kcal: 541, protein: 37, carbs: 1.4, fat: 42, units: [{ label: "plátok", grams: 12 }] },
  { slug: "sunka-kuracia", name: "Šunka kuracia", category: "meat", base: "g", kcal: 105, protein: 18, carbs: 1, fat: 3, units: [{ label: "plátok", grams: 15 }], aliases: ["sunka"] },
  { slug: "parky", name: "Párky", category: "meat", base: "g", kcal: 260, protein: 12, carbs: 2, fat: 23, units: [{ label: "ks", grams: 45 }] },

  // ── Ryby a morské plody ───────────────────────────────
  { slug: "losos", name: "Losos (čerstvý)", category: "fish", base: "g", kcal: 208, protein: 20, carbs: 0, fat: 13, units: [{ label: "filé (~150 g)", grams: 150 }], aliases: ["salmon", "losos filet"] },
  { slug: "tuniak-vlastna-stava", name: "Tuniak v náleve (odkvapkaný)", category: "fish", base: "g", kcal: 116, protein: 26, carbs: 0, fat: 1, units: [{ label: "konzerva (~112 g)", grams: 112 }], aliases: ["tuniak"] },
  { slug: "treska", name: "Treska", category: "fish", base: "g", kcal: 82, protein: 18, carbs: 0, fat: 0.7, aliases: ["treska filet"] },
  { slug: "pstruh", name: "Pstruh", category: "fish", base: "g", kcal: 119, protein: 20, carbs: 0, fat: 3.5 },
  { slug: "krevety", name: "Krevety", category: "fish", base: "g", kcal: 99, protein: 24, carbs: 0.2, fat: 0.3, aliases: ["kreveta", "shrimps"] },

  // ── Obilniny, pečivo a prílohy ────────────────────────
  { slug: "ryza-biela-varena", name: "Ryža biela (varená)", category: "grain", base: "g", kcal: 130, protein: 2.7, carbs: 28, fat: 0.3, aliases: ["ryza", "biela ryza"] },
  { slug: "ryza-biela-suva", name: "Ryža biela (suchá)", category: "grain", base: "g", kcal: 360, protein: 7, carbs: 79, fat: 0.6, aliases: ["ryza suva"] },
  { slug: "ryza-basmati-suva", name: "Ryža basmati (suchá)", category: "grain", base: "g", kcal: 349, protein: 8.5, carbs: 77, fat: 0.7, aliases: ["basmati"] },
  { slug: "zemiaky", name: "Zemiaky (surové)", category: "grain", base: "g", kcal: 77, protein: 2, carbs: 17, fat: 0.1, fiber: 2.2, units: [{ label: "ks stredný", grams: 150 }], aliases: ["zemiak", "zemiaky varene", "brambory"] },
  { slug: "batat", name: "Batáty (sladké zemiaky)", category: "grain", base: "g", kcal: 86, protein: 1.6, carbs: 20, fat: 0.1, fiber: 3, aliases: ["sladke zemiaky", "bataty"] },
  { slug: "cestoviny-suve", name: "Cestoviny (suché)", category: "grain", base: "g", kcal: 358, protein: 12, carbs: 71, fat: 1.5, aliases: ["cestoviny", "penne", "spagety", "testoviny"] },
  { slug: "cestoviny-varene", name: "Cestoviny (varené)", category: "grain", base: "g", kcal: 158, protein: 5.8, carbs: 31, fat: 0.9 },
  { slug: "ovsene-vlocky", name: "Ovsené vločky", category: "grain", base: "g", kcal: 372, protein: 13, carbs: 60, fat: 7, fiber: 10, units: [{ label: "porcia (50 g)", grams: 50 }], aliases: ["vlocky", "ovsienky", "oats"] },
  { slug: "musli", name: "Müsli", category: "grain", base: "g", kcal: 367, protein: 9, carbs: 60, fat: 8, fiber: 7, aliases: ["musli", "granola"] },
  { slug: "chlieb-cierny", name: "Chlieb ražný/celozrnný", category: "grain", base: "g", kcal: 250, protein: 8, carbs: 45, fat: 2.5, fiber: 6, units: [{ label: "krajec", grams: 35 }], aliases: ["chlieb", "razny chlieb", "cierny chlieb"] },
  { slug: "chlieb-biely", name: "Chlieb biely", category: "grain", base: "g", kcal: 265, protein: 8, carbs: 49, fat: 3, units: [{ label: "krajec", grams: 35 }] },
  { slug: "rozok", name: "Rožok", category: "grain", base: "g", kcal: 290, protein: 9, carbs: 55, fat: 3.5, units: [{ label: "ks", grams: 43 }], aliases: ["rozky", "pecivo"] },
  { slug: "toastovy-chlieb", name: "Toastový chlieb", category: "grain", base: "g", kcal: 265, protein: 8.5, carbs: 47, fat: 4, units: [{ label: "plátok", grams: 25 }], aliases: ["toast", "toastovy"] },
  { slug: "wrap-tortilla", name: "Tortilla / wrap", category: "grain", base: "g", kcal: 310, protein: 8, carbs: 52, fat: 7, units: [{ label: "ks", grams: 60 }], aliases: ["tortilla", "wrap"] },
  { slug: "kuskus-suvy", name: "Kuskus (suchý)", category: "grain", base: "g", kcal: 376, protein: 13, carbs: 77, fat: 0.6, aliases: ["kuskus"] },
  { slug: "kinoa-suva", name: "Quinoa (suchá)", category: "grain", base: "g", kcal: 368, protein: 14, carbs: 64, fat: 6, fiber: 7, aliases: ["quinoa", "kinoa"] },
  { slug: "pohanka-suva", name: "Pohánka (suchá)", category: "grain", base: "g", kcal: 343, protein: 13, carbs: 72, fat: 3.4, fiber: 10, aliases: ["pohanka"] },

  // ── Strukoviny ────────────────────────────────────────
  { slug: "sosovica-varena", name: "Šošovica (varená)", category: "legume", base: "g", kcal: 116, protein: 9, carbs: 20, fat: 0.4, fiber: 8, aliases: ["sosovica"] },
  { slug: "cizrna-varena", name: "Cícer (varený)", category: "legume", base: "g", kcal: 164, protein: 9, carbs: 27, fat: 2.6, fiber: 8, aliases: ["cicer", "cizrna", "hummus zaklad"] },
  { slug: "fazula-varena", name: "Fazuľa (varená)", category: "legume", base: "g", kcal: 127, protein: 9, carbs: 23, fat: 0.5, fiber: 6, aliases: ["fazula"] },
  { slug: "hrach", name: "Hrášok", category: "legume", base: "g", kcal: 81, protein: 5, carbs: 14, fat: 0.4, fiber: 5, aliases: ["hrasok", "hrach"] },
  { slug: "tofu", name: "Tofu", category: "legume", base: "g", kcal: 144, protein: 15, carbs: 2.8, fat: 8, aliases: ["tofu natural"] },

  // ── Zelenina ──────────────────────────────────────────
  { slug: "paradajka", name: "Paradajka", category: "vegetable", base: "g", kcal: 18, protein: 0.9, carbs: 3.9, fat: 0.2, units: [{ label: "ks stredná", grams: 120 }], aliases: ["paradajky", "rajcina"] },
  { slug: "uhorka", name: "Uhorka", category: "vegetable", base: "g", kcal: 15, protein: 0.7, carbs: 3.6, fat: 0.1, aliases: ["uhorky"] },
  { slug: "paprika", name: "Paprika", category: "vegetable", base: "g", kcal: 31, protein: 1, carbs: 6, fat: 0.3, units: [{ label: "ks", grams: 120 }] },
  { slug: "cibula", name: "Cibuľa", category: "vegetable", base: "g", kcal: 40, protein: 1.1, carbs: 9, fat: 0.1, aliases: ["cibula"] },
  { slug: "cesnak", name: "Cesnak", category: "vegetable", base: "g", kcal: 149, protein: 6.4, carbs: 33, fat: 0.5, units: [{ label: "strúčik", grams: 4 }] },
  { slug: "mrkva", name: "Mrkva", category: "vegetable", base: "g", kcal: 41, protein: 0.9, carbs: 10, fat: 0.2, fiber: 2.8, units: [{ label: "ks", grams: 80 }] },
  { slug: "brokolica", name: "Brokolica", category: "vegetable", base: "g", kcal: 34, protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.6, aliases: ["brokolica"] },
  { slug: "spenat", name: "Špenát", category: "vegetable", base: "g", kcal: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, aliases: ["spenat"] },
  { slug: "salat-listovy", name: "Šalát listový", category: "vegetable", base: "g", kcal: 15, protein: 1.4, carbs: 2.9, fat: 0.2, aliases: ["salat", "ladovy salat", "rukola"] },
  { slug: "cuketa", name: "Cuketa", category: "vegetable", base: "g", kcal: 17, protein: 1.2, carbs: 3.1, fat: 0.3, aliases: ["cuketa"] },
  { slug: "kapusta", name: "Kapusta", category: "vegetable", base: "g", kcal: 25, protein: 1.3, carbs: 6, fat: 0.1, fiber: 2.5 },
  { slug: "huby-sampinony", name: "Šampiňóny", category: "vegetable", base: "g", kcal: 22, protein: 3.1, carbs: 3.3, fat: 0.3, aliases: ["huby", "sampinony", "hriby"] },
  { slug: "kukurica", name: "Kukurica", category: "vegetable", base: "g", kcal: 86, protein: 3.2, carbs: 19, fat: 1.2, fiber: 2.7 },

  // ── Ovocie ────────────────────────────────────────────
  { slug: "banan", name: "Banán", category: "fruit", base: "g", kcal: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6, sugar: 12, units: [{ label: "ks stredný", grams: 120 }], aliases: ["banan", "banany"] },
  { slug: "jablko", name: "Jablko", category: "fruit", base: "g", kcal: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4, sugar: 10, units: [{ label: "ks stredné", grams: 150 }], aliases: ["jablka", "jablcko"] },
  { slug: "pomaranc", name: "Pomaranč", category: "fruit", base: "g", kcal: 47, protein: 0.9, carbs: 12, fat: 0.1, fiber: 2.4, units: [{ label: "ks", grams: 130 }], aliases: ["pomaranc"] },
  { slug: "cucoriedky", name: "Čučoriedky", category: "fruit", base: "g", kcal: 57, protein: 0.7, carbs: 14, fat: 0.3, fiber: 2.4, units: [{ label: "hrsť (~40 g)", grams: 40 }], aliases: ["cucoriedky", "borievky"] },
  { slug: "jahody", name: "Jahody", category: "fruit", base: "g", kcal: 32, protein: 0.7, carbs: 7.7, fat: 0.3, fiber: 2, aliases: ["jahoda"] },
  { slug: "maliny", name: "Maliny", category: "fruit", base: "g", kcal: 52, protein: 1.2, carbs: 12, fat: 0.7, fiber: 6.5 },
  { slug: "hrozno", name: "Hrozno", category: "fruit", base: "g", kcal: 69, protein: 0.7, carbs: 18, fat: 0.2, sugar: 16 },
  { slug: "cerny-cukr-datle", name: "Datle", category: "fruit", base: "g", kcal: 282, protein: 2.5, carbs: 75, fat: 0.4, fiber: 8, sugar: 63, units: [{ label: "ks", grams: 8 }], aliases: ["datle"] },
  { slug: "avokado", name: "Avokádo", category: "fruit", base: "g", kcal: 160, protein: 2, carbs: 9, fat: 15, fiber: 7, units: [{ label: "ks (dužina ~140 g)", grams: 140 }], aliases: ["avokado", "avocado"] },

  // ── Orechy a semená ───────────────────────────────────
  { slug: "vlasske-orechy", name: "Vlašské orechy", category: "nut", base: "g", kcal: 654, protein: 15, carbs: 14, fat: 65, fiber: 6.7, units: [{ label: "hrsť (~30 g)", grams: 30 }], aliases: ["vlasske orechy", "orechy"] },
  { slug: "mandle", name: "Mandle", category: "nut", base: "g", kcal: 579, protein: 21, carbs: 22, fat: 50, fiber: 12, units: [{ label: "hrsť (~30 g)", grams: 30 }], aliases: ["mandle"] },
  { slug: "kesu", name: "Kešu", category: "nut", base: "g", kcal: 553, protein: 18, carbs: 30, fat: 44, units: [{ label: "hrsť (~30 g)", grams: 30 }], aliases: ["kesu", "cashew"] },
  { slug: "arasidy", name: "Arašidy", category: "nut", base: "g", kcal: 567, protein: 26, carbs: 16, fat: 49, fiber: 8.5, units: [{ label: "hrsť (~30 g)", grams: 30 }], aliases: ["arasidy", "buraky"] },
  { slug: "arasidove-maslo", name: "Arašidové maslo", category: "nut", base: "g", kcal: 588, protein: 25, carbs: 20, fat: 50, units: [{ label: "lyžica", grams: 16 }], aliases: ["arasidove maslo", "peanut butter"] },
  { slug: "chia", name: "Chia semienka", category: "nut", base: "g", kcal: 486, protein: 17, carbs: 42, fat: 31, fiber: 34, units: [{ label: "lyžica", grams: 12 }], aliases: ["chia"] },
  { slug: "lanove-semienka", name: "Ľanové semienka", category: "nut", base: "g", kcal: 534, protein: 18, carbs: 29, fat: 42, fiber: 27, units: [{ label: "lyžica", grams: 10 }], aliases: ["lanove semienka", "ln"] },
  { slug: "tekvicove-semienka", name: "Tekvicové semienka", category: "nut", base: "g", kcal: 559, protein: 30, carbs: 11, fat: 49, units: [{ label: "hrsť (~30 g)", grams: 30 }], aliases: ["tekvicove semienka"] },

  // ── Tuky a oleje ──────────────────────────────────────
  { slug: "olivovy-olej", name: "Olivový olej extra virgin", category: "fat", base: "ml", kcal: 884, protein: 0, carbs: 0, fat: 100, units: [{ label: "lyžica", grams: 14 }, { label: "lyžička", grams: 5 }], aliases: ["olivovy olej", "olej"] },
  { slug: "kokosovy-olej", name: "Kokosový olej", category: "fat", base: "g", kcal: 892, protein: 0, carbs: 0, fat: 99, units: [{ label: "lyžica", grams: 13 }], aliases: ["kokosovy olej"] },
  { slug: "maslo-ghee", name: "Ghee (prepustené maslo)", category: "fat", base: "g", kcal: 900, protein: 0, carbs: 0, fat: 100, units: [{ label: "lyžica", grams: 14 }], aliases: ["ghee"] },

  // ── Sladké ────────────────────────────────────────────
  { slug: "med", name: "Med", category: "sweet", base: "g", kcal: 304, protein: 0.3, carbs: 82, fat: 0, sugar: 82, units: [{ label: "lyžica", grams: 21 }, { label: "lyžička", grams: 7 }], aliases: ["med"] },
  { slug: "cokolada-85", name: "Horká čokoláda 85 %", category: "sweet", base: "g", kcal: 592, protein: 10, carbs: 19, fat: 51, fiber: 11, units: [{ label: "kocka", grams: 5 }, { label: "riadok (~15 g)", grams: 15 }], aliases: ["cokolada", "horka cokolada"] },
  { slug: "cokolada-mliecna", name: "Mliečna čokoláda", category: "sweet", base: "g", kcal: 535, protein: 7.6, carbs: 59, fat: 30, sugar: 52, units: [{ label: "kocka", grams: 5 }], aliases: ["mliecna cokolada"] },
  { slug: "javorovy-sirup", name: "Javorový sirup", category: "sweet", base: "ml", kcal: 260, protein: 0, carbs: 67, fat: 0, sugar: 60, units: [{ label: "lyžica", grams: 20 }], aliases: ["javorovy sirup", "maple"] },
  { slug: "cukor", name: "Cukor", category: "sweet", base: "g", kcal: 400, protein: 0, carbs: 100, fat: 0, sugar: 100, units: [{ label: "lyžička", grams: 4 }, { label: "kocka", grams: 3 }], aliases: ["cukor"] },
  { slug: "nutella", name: "Nutella", category: "sweet", base: "g", kcal: 539, protein: 6, carbs: 57, fat: 31, sugar: 57, units: [{ label: "lyžica", grams: 20 }], aliases: ["nutella"] },

  // ── Nápoje ────────────────────────────────────────────
  { slug: "pomarancovy-dzus", name: "Pomarančový džús", category: "drink", base: "ml", kcal: 45, protein: 0.7, carbs: 10, fat: 0.2, sugar: 8, units: [{ label: "pohár (250 ml)", grams: 250 }], aliases: ["dzus", "juice"] },
  { slug: "kava-cierna", name: "Káva čierna (bez cukru)", category: "drink", base: "ml", kcal: 2, protein: 0.1, carbs: 0, fat: 0, units: [{ label: "šálka (200 ml)", grams: 200 }], aliases: ["kava", "espresso"] },
  { slug: "cola", name: "Coca-Cola", category: "drink", base: "ml", kcal: 42, protein: 0, carbs: 10.6, fat: 0, sugar: 10.6, units: [{ label: "plechovka (330 ml)", grams: 330 }], aliases: ["cola", "kola"] },
  { slug: "pivo-svetle", name: "Pivo svetlé 12°", category: "drink", base: "ml", kcal: 43, protein: 0.5, carbs: 3.3, fat: 0, units: [{ label: "veľké (0,5 l)", grams: 500 }], aliases: ["pivo"] },

  // ── Omáčky a koreniny ─────────────────────────────────
  { slug: "kecup", name: "Kečup", category: "sauce", base: "g", kcal: 102, protein: 1.3, carbs: 24, fat: 0.1, sugar: 22, units: [{ label: "lyžica", grams: 15 }], aliases: ["kecup", "ketchup"] },
  { slug: "horcica", name: "Horčica", category: "sauce", base: "g", kcal: 66, protein: 4, carbs: 5, fat: 3.3, units: [{ label: "lyžica", grams: 15 }], aliases: ["horcica"] },
  { slug: "sojova-omacka", name: "Sójová omáčka", category: "sauce", base: "ml", kcal: 53, protein: 8, carbs: 4.9, fat: 0.6, units: [{ label: "lyžica", grams: 16 }], aliases: ["sojova omacka", "soja"] },
  { slug: "majoneza", name: "Majonéza", category: "sauce", base: "g", kcal: 680, protein: 1, carbs: 1.5, fat: 75, units: [{ label: "lyžica", grams: 15 }], aliases: ["majoneza"] },
  { slug: "paradajkova-omacka", name: "Paradajková omáčka (passata)", category: "sauce", base: "g", kcal: 35, protein: 1.6, carbs: 6, fat: 0.3, aliases: ["passata", "paradajkova omacka", "sugo"] },

  // ── Doplnky výživy ────────────────────────────────────
  { slug: "srvatkovy-proteín", name: "Srvátkový proteín (prášok)", category: "supplement", base: "g", kcal: 390, protein: 78, carbs: 8, fat: 6, units: [{ label: "odmerka (~30 g)", grams: 30 }], aliases: ["proteín", "protein", "whey"] },
  { slug: "kreatin", name: "Kreatín monohydrát", category: "supplement", base: "g", kcal: 0, protein: 0, carbs: 0, fat: 0, units: [{ label: "odmerka (5 g)", grams: 5 }], aliases: ["kreatin", "creatine"] },

  // ── Hotové / typické jedlá ────────────────────────────
  { slug: "bryndzove-halusky", name: "Bryndzové halušky so slaninou", category: "prepared", base: "g", kcal: 178, protein: 6, carbs: 22, fat: 7.5, units: [{ label: "porcia (~400 g)", grams: 400 }], aliases: ["halusky", "bryndzove halusky"] },
  { slug: "gulas", name: "Guláš", category: "prepared", base: "g", kcal: 118, protein: 9, carbs: 6, fat: 6, units: [{ label: "porcia (~350 g)", grams: 350 }], aliases: ["gulas"] },
  { slug: "rizoto-kuracie", name: "Kuracie rizoto", category: "prepared", base: "g", kcal: 145, protein: 8, carbs: 20, fat: 3.5, units: [{ label: "porcia (~400 g)", grams: 400 }], aliases: ["rizoto"] },
  { slug: "palacinky", name: "Palacinky (sladké)", category: "prepared", base: "g", kcal: 227, protein: 6, carbs: 33, fat: 8, units: [{ label: "ks", grams: 60 }], aliases: ["palacinky", "palacinka"] },
  { slug: "pizza-margherita", name: "Pizza Margherita", category: "prepared", base: "g", kcal: 240, protein: 10, carbs: 30, fat: 9, units: [{ label: "celá (~350 g)", grams: 350 }, { label: "kúsok", grams: 90 }], aliases: ["pizza"] },
];

// ── Vyhľadávanie v katalógu (bez diakritiky, tolerantné) ──

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // odstráň diakritiku
    .toLowerCase()
    .trim();
}

export function findCatalogBySlug(slug: string): CatalogFood | null {
  return FOOD_CATALOG.find((f) => f.slug === slug) ?? null;
}

/** Vráti zoradené zhody – presný/prefix názvu prvý, potom slovo v názve, potom alias. */
export function searchCatalog(query: string, limit = 12): CatalogFood[] {
  const q = normalize(query);
  if (q.length < 2) return [];

  const scored: { f: CatalogFood; score: number }[] = [];
  for (const f of FOOD_CATALOG) {
    const name = normalize(f.name);
    const words = name.split(/[\s(/,]+/).filter(Boolean);
    const aliases = (f.aliases ?? []).map(normalize);

    let score = -1;
    if (name === q) score = 100;
    else if (name.startsWith(q)) score = 90;
    else if (words.some((w) => w.startsWith(q))) score = 80;
    else if (aliases.some((a) => a === q)) score = 75;
    else if (aliases.some((a) => a.startsWith(q))) score = 65;
    else if (name.includes(q)) score = 50;
    else if (aliases.some((a) => a.includes(q))) score = 40;

    if (score >= 0) scored.push({ f, score });
  }

  scored.sort((a, b) => b.score - a.score || a.f.name.localeCompare(b.f.name, "sk"));
  return scored.slice(0, limit).map((s) => s.f);
}
