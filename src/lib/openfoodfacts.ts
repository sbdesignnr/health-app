// Open Food Facts integrácia – barcode (API v2) + textové hľadanie (Search-a-licious).
// Docs: https://openfoodfacts.github.io/openfoodfacts-server/api/

const OFF_BASE = "https://world.openfoodfacts.org";
const SEARCH_BASE = "https://search.openfoodfacts.org";
// OFF odporúča identifikovať appku vlastným User-Agentom.
const USER_AGENT = "HealthAssistant/0.1 (health-app)";
const TIMEOUT_MS = 8000;

// Znormalizovaná potravina – polia zarovnané na Food model (hodnoty na 100 g).
export type NormalizedFood = {
  barcode: string | null;
  name: string;
  brand: string | null;
  caloriesKcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
  sugarG: number | null;
  saltG: number | null;
  servingSizeG: number | null;
};

function num(v: unknown): number | null {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

// brands: barcode endpoint vracia string "a, b, c"; search vracia pole.
function firstBrand(brands: unknown): string | null {
  if (Array.isArray(brands)) return (brands[0] as string) ?? null;
  if (typeof brands === "string") return brands.split(",")[0]?.trim() || null;
  return null;
}

function kcalPer100g(n: Record<string, unknown>): number | null {
  const kcal = num(n["energy-kcal_100g"]);
  if (kcal != null) return kcal;
  // fallback: prepočet z kJ (1 kcal = 4.184 kJ)
  const kj = num(n["energy-kj_100g"]) ?? num(n["energy_100g"]);
  return kj != null ? Math.round((kj / 4.184) * 10) / 10 : null;
}

// Detekcia rozbitého kódovania (mojibake). OFF obsahuje komunitné dáta a niektoré
// regionálne záznamy majú názov uložený v zlom kódovaní (napr. cyrilika dekódovaná
// ako Latin-2). UTF-8 z API dekódujeme korektne – problém je v zdrojových dátach,
// preto radšej preferujeme čistejšie jazykové pole, než by sme robili riskantnú
// auto-opravu neznámeho kódovania.
function looksCorrupted(s: string): boolean {
  if (s.includes("�")) return true; // Unicode replacement character
  const markers = (s.match(/[ÐÑĐŃˇ˝]/g) ?? []).length;
  return markers >= 2;
}

function pickName(p: Record<string, unknown>): string {
  const candidates = [
    p.product_name_sk,
    p.product_name_cs,
    p.product_name,
    p.generic_name,
  ].filter((v): v is string => typeof v === "string" && v.trim().length > 0);

  // 1) prvý čistý (nerozbitý) názov
  const clean = candidates.find((c) => !looksCorrupted(c));
  if (clean) return clean.trim();

  // 2) všetko rozbité/prázdne → fallback na značku, inak generický názov
  const brand = firstBrand(p.brands);
  return brand ? `${brand} (neznámy názov)` : "Neznámy produkt";
}

function mapProduct(p: Record<string, unknown>, barcode: string | null): NormalizedFood {
  const n = (p.nutriments as Record<string, unknown>) ?? {};
  return {
    barcode,
    name: pickName(p),
    brand: firstBrand(p.brands),
    caloriesKcal: kcalPer100g(n),
    proteinG: num(n.proteins_100g),
    carbsG: num(n.carbohydrates_100g),
    fatG: num(n.fat_100g),
    fiberG: num(n.fiber_100g),
    sugarG: num(n.sugars_100g),
    saltG: num(n.salt_100g),
    servingSizeG: num(p.serving_quantity),
  };
}

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Vyhľadanie produktu podľa čiarového kódu (EAN).
export async function fetchProductByBarcode(barcode: string): Promise<NormalizedFood | null> {
  const fields =
    "code,product_name,product_name_sk,product_name_cs,generic_name,brands,nutriments,serving_quantity";
  const url = `${OFF_BASE}/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${fields}`;
  const data = (await fetchJson(url)) as { status?: number; product?: Record<string, unknown> } | null;
  if (!data || data.status !== 1 || !data.product) return null;
  return mapProduct(data.product, (data.product.code as string) ?? barcode);
}

// Textové vyhľadávanie cez Search-a-licious (full-text, vrátane SK/CZ produktov).
export async function searchProducts(query: string, pageSize = 20): Promise<NormalizedFood[]> {
  const url = `${SEARCH_BASE}/search?q=${encodeURIComponent(query)}&page_size=${pageSize}`;
  const data = (await fetchJson(url)) as { hits?: Record<string, unknown>[] } | null;
  const hits = Array.isArray(data?.hits) ? data!.hits : [];
  return hits.map((h) => mapProduct(h, (h.code as string) ?? null));
}

// Má produkt kompletné makrá (kcal + 3 hlavné makrá)?
export function isComplete(f: NormalizedFood): boolean {
  return (
    f.caloriesKcal != null && f.proteinG != null && f.carbsG != null && f.fatG != null
  );
}
