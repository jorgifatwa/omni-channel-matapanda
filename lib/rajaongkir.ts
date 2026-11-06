/**
 * RajaOngkir (Komerce) API Integration Helper
 * Docs: https://rajaongkir.com/docs/shipping-cost/getting_started/endpoint
 *
 * Supports multiple domestic couriers (JNE, J&T, SiCepat, AnterAja, POS, ...).
 * Every call consumes API quota, so destination lookups and cost results are
 * cached in memory.
 */

const BASE_URL = "https://rajaongkir.komerce.id/api/v1";
const REQUEST_TIMEOUT_MS = 6000;

/** Courier codes accepted by RajaOngkir that this store can save to the database. */
export const SUPPORTED_COURIERS = {
  jne: "JNE",
  jnt: "J&T",
  sicepat: "SiCepat",
  anteraja: "AnterAja",
  pos: "POS Indonesia",
  tiki: "TIKI",
  ninja: "Ninja Xpress",
  lion: "Lion Parcel",
  sap: "SAP Express",
  ide: "ID Express",
  wahana: "Wahana",
} as const;

export type CourierCode = keyof typeof SUPPORTED_COURIERS;

const DEFAULT_COURIERS: CourierCode[] = ["jne", "jnt", "sicepat", "anteraja", "pos"];

export interface ShippingRateOption {
  /** Unique key for this option, e.g. "JNT_EZ" */
  id: string;
  /** Uppercase courier code saved on the order, e.g. "JNE", "JNT", "SICEPAT" */
  courier: string;
  /** Human-readable courier name, e.g. "J&T" */
  courierName: string;
  service: string;
  name: string;
  cost: number;
  currency: "IDR";
  estimatedDays: string;
  description?: string;
}

export interface RajaOngkirDestination {
  id: number;
  label: string;
  province_name?: string;
  city_name?: string;
  district_name?: string;
  subdistrict_name?: string;
  zip_code?: string;
}

// ---------------------------------------------------------------------------
// Config & cache helpers
// ---------------------------------------------------------------------------

function getApiKey(): string {
  const apiKey = process.env.RAJAONGKIR_API_KEY;
  if (
    !apiKey ||
    apiKey === "your-rajaongkir-api-key" ||
    apiKey === "demo-rajaongkir-key"
  ) {
    throw new Error("RAJAONGKIR_API_KEY not configured");
  }
  return apiKey;
}

export function isRajaOngkirConfigured(): boolean {
  try {
    getApiKey();
    return true;
  } catch {
    return false;
  }
}

/** Couriers to query, from RAJAONGKIR_COURIERS (e.g. "jne,jnt,sicepat"). */
export function getConfiguredCouriers(): CourierCode[] {
  const raw = process.env.RAJAONGKIR_COURIERS;
  if (!raw) return DEFAULT_COURIERS;
  const parsed = raw
    .split(/[,:\s]+/)
    .map((c) => c.trim().toLowerCase())
    .filter((c): c is CourierCode => c in SUPPORTED_COURIERS);
  return parsed.length > 0 ? Array.from(new Set(parsed)) : DEFAULT_COURIERS;
}

type CacheEntry<T> = { value: T; expiresAt: number };
const cache = new Map<string, CacheEntry<unknown>>();
const DESTINATION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const COST_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const MAX_CACHE_ENTRIES = 2000;

function cacheGet<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return entry.value as T;
}

function cacheSet<T>(key: string, value: T, ttlMs: number) {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

class RajaOngkirError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function rajaOngkirFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { key: getApiKey(), ...(init.headers || {}) },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    cache: "no-store",
  });

  const json = await response.json().catch(() => null);
  if (!response.ok || !json || (json.meta?.code && json.meta.code !== 200)) {
    const message = json?.meta?.message || `HTTP ${response.status}`;
    throw new RajaOngkirError(`RajaOngkir ${path}: ${message}`, response.status);
  }
  return json.data as T;
}

// ---------------------------------------------------------------------------
// Destinations
// ---------------------------------------------------------------------------

/** Searches RajaOngkir domestic destinations by keyword (city, district or postal code). */
export async function searchDomesticDestinations(
  keyword: string,
  limit = 10
): Promise<RajaOngkirDestination[]> {
  const search = keyword.trim().toLowerCase();
  if (search.length < 3) return [];

  const cacheKey = `dest:${search}:${limit}`;
  const cached = cacheGet<RajaOngkirDestination[]>(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({ search, limit: String(limit), offset: "0" });
  let results: RajaOngkirDestination[] = [];
  try {
    results =
      (await rajaOngkirFetch<RajaOngkirDestination[] | null>(
        `/destination/domestic-destination?${params.toString()}`
      )) || [];
  } catch (err) {
    // 404 = no destination matched the keyword
    if (!(err instanceof RajaOngkirError && err.status === 404)) throw err;
  }

  cacheSet(cacheKey, results, DESTINATION_TTL_MS);
  return results;
}

/**
 * Resolves the RajaOngkir destination ID for a customer's address.
 * Tries the postal code first (most precise), then the city name.
 */
export async function resolveDestinationId(
  cityName: string,
  postalCode?: string
): Promise<number | null> {
  const zip = postalCode?.trim();
  if (zip && /^\d{5}$/.test(zip)) {
    const byZip = await searchDomesticDestinations(zip, 5);
    if (byZip.length > 0) return byZip[0].id;
  }

  const byCity = await searchDomesticDestinations(cityName, 5);
  if (byCity.length === 0) return null;

  const normalized = cityName.toLowerCase().trim();
  const exactCity = byCity.find((d) =>
    d.city_name?.toLowerCase().includes(normalized)
  );
  return (exactCity || byCity[0]).id;
}

/**
 * Store origin ID. Uses RAJAONGKIR_ORIGIN_ID when set, otherwise looks up
 * RAJAONGKIR_ORIGIN_SEARCH (default "kiaracondong") once and caches it.
 */
export async function getOriginId(): Promise<number> {
  const configured = Number(process.env.RAJAONGKIR_ORIGIN_ID);
  if (Number.isInteger(configured) && configured > 0) return configured;

  const keyword = process.env.RAJAONGKIR_ORIGIN_SEARCH || "kiaracondong";
  const results = await searchDomesticDestinations(keyword, 5);
  if (results.length === 0) {
    throw new Error(
      `RajaOngkir origin "${keyword}" not found. Set RAJAONGKIR_ORIGIN_ID in .env.`
    );
  }
  return results[0].id;
}

// ---------------------------------------------------------------------------
// Costs
// ---------------------------------------------------------------------------

interface RajaOngkirCostItem {
  name: string;
  code: string;
  service: string;
  description?: string;
  cost: number;
  etd?: string;
}

function formatEtd(etd?: string): string {
  if (!etd) return "-";
  const clean = etd.replace(/hari|days?/gi, "").trim();
  return clean ? `${clean} Hari` : "-";
}

function toRateOption(item: RajaOngkirCostItem): ShippingRateOption | null {
  const code = item.code?.toLowerCase() as CourierCode;
  if (!(code in SUPPORTED_COURIERS) || !(item.cost > 0)) return null;

  const courier = code.toUpperCase();
  const courierName = SUPPORTED_COURIERS[code];
  return {
    id: `${courier}_${item.service}`,
    courier,
    courierName,
    service: item.service,
    name: `${courierName} ${item.service}`,
    description: item.description,
    cost: item.cost,
    currency: "IDR",
    estimatedDays: formatEtd(item.etd),
  };
}

async function fetchCosts(
  originId: number,
  destinationId: number,
  weightGrams: number,
  couriers: CourierCode[]
): Promise<RajaOngkirCostItem[]> {
  const body = new URLSearchParams({
    origin: String(originId),
    destination: String(destinationId),
    weight: String(weightGrams),
    courier: couriers.join(":"),
    price: "lowest",
  });

  try {
    return (
      (await rajaOngkirFetch<RajaOngkirCostItem[] | null>("/calculate/domestic-cost", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      })) || []
    );
  } catch (err) {
    // 400 = no cost found for this route
    if (err instanceof RajaOngkirError && err.status === 400) return [];
    throw err;
  }
}

/**
 * Calculates shipping costs for every configured courier.
 * Couriers are requested in one call; if RajaOngkir rejects the combined
 * request (e.g. a courier is not on your plan), each courier is retried alone
 * and the ones that fail are skipped.
 */
export async function calculateRajaOngkirRates(
  originId: number,
  destinationId: number,
  weightGrams: number,
  couriers: CourierCode[] = getConfiguredCouriers()
): Promise<ShippingRateOption[]> {
  const weight = Math.max(1, Math.round(weightGrams));
  const cacheKey = `cost:${originId}:${destinationId}:${weight}:${couriers.join(":")}`;
  const cached = cacheGet<ShippingRateOption[]>(cacheKey);
  if (cached) return cached;

  let items: RajaOngkirCostItem[];
  try {
    items = await fetchCosts(originId, destinationId, weight, couriers);
  } catch (err) {
    if (couriers.length <= 1) throw err;
    console.warn("[RajaOngkir] Combined courier request failed, retrying per courier:", err);
    const settled = await Promise.allSettled(
      couriers.map((c) => fetchCosts(originId, destinationId, weight, [c]))
    );
    items = settled.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
    if (items.length === 0) throw err;
  }

  const rates = items
    .map(toRateOption)
    .filter((r): r is ShippingRateOption => r !== null)
    .sort((a, b) => a.cost - b.cost);

  // Drop duplicate courier+service pairs
  const unique = Array.from(new Map(rates.map((r) => [r.id, r])).values());

  if (unique.length > 0) cacheSet(cacheKey, unique, COST_TTL_MS);
  return unique;
}
