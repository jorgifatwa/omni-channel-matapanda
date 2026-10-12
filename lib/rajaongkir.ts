/**
 * RajaOngkir Starter API Integration Helper
 * Provides JNE, TIKI, and POS Indonesia domestic shipping calculations.
 */

export interface ShippingRateOption {
  service: string;
  name: string;
  cost: number;
  currency: "IDR";
  estimatedDays: string;
  description?: string;
}

// Common RajaOngkir Starter City ID mapping dictionary
const CITY_NAME_TO_ID: Record<string, string> = {
  // DKI Jakarta
  "jakarta": "152", // Default Jakarta Pusat
  "jakarta pusat": "152",
  "jakarta barat": "151",
  "jakarta selatan": "153",
  "jakarta timur": "154",
  "jakarta utara": "155",
  "kepulauan seribu": "188",

  // Banten
  "tangerang": "456",
  "tangerang selatan": "457",
  "tangsel": "457",
  "serang": "403",
  "cilegon": "106",
  "lebak": "224",
  "pandeglang": "331",

  // West Java (Jawa Barat)
  "bandung": "23",
  "bandung barat": "24",
  "bekasi": "55",
  "bogor": "78",
  "depok": "115",
  "cimahi": "107",
  "cirebon": "109",
  "sukabumi": "431",
  "tasikmalaya": "469",
  "garut": "128",
  "karawang": "173",
  "purwakarta": "369",
  "subang": "426",
  "sumedang": "440",

  // Central Java (Jawa Tengah)
  "semarang": "399",
  "surakarta": "445",
  "solo": "445",
  "magelang": "249",
  "pekalongan": "343",
  "salatiga": "386",
  "tegal": "472",
  "banyumas": "41",
  "purwokerto": "41",
  "kudus": "209",
  "pati": "341",
  "klaten": "196",

  // DI Yogyakarta
  "yogyakarta": "501",
  "jogja": "501",
  "sleman": "419",
  "bantul": "39",
  "gunungkidul": "135",
  "kulon progo": "210",

  // East Java (Jawa Timur)
  "surabaya": "444",
  "malang": "256",
  "sidoarjo": "409",
  "gresik": "133",
  "kediri": "179",
  "madiun": "245",
  "batu": "51",
  "blitar": "74",
  "jember": "160",
  "banyuwangi": "42",
  "pasuruan": "338",
  "probolinggo": "363",

  // Bali & Nusa Tenggara
  "denpasar": "114",
  "badung": "17",
  "kuta": "17",
  "seminyak": "17",
  "gianyar": "129",
  "ubud": "129",
  "mataram": "270",
  "kupang": "213",

  // Sumatra
  "medan": "278",
  "palembang": "327",
  "pekanbaru": "348",
  "batam": "48",
  "padang": "318",
  "bandar lampung": "21",
  "jambi": "156",
  "bengkulu": "62",
  "banda aceh": "19",

  // Kalimantan & Sulawesi
  "pontianak": "361",
  "balikpapan": "18",
  "samarinda": "390",
  "banjarmasin": "27",
  "makassar": "254",
  "manado": "260",
  "palu": "329",
  "kendari": "182",
};

/**
 * Resolves a city name to RajaOngkir City ID
 */
export function resolveRajaOngkirCityId(
  cityName: string,
  provinceName?: string
): string {
  const normalized = cityName.toLowerCase().trim();

  // 1. Direct match in dictionary
  if (CITY_NAME_TO_ID[normalized]) {
    return CITY_NAME_TO_ID[normalized];
  }

  // 2. Partial search in dictionary keys
  for (const [key, id] of Object.entries(CITY_NAME_TO_ID)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return id;
    }
  }

  // 3. Fallback based on province
  if (provinceName) {
    const provNorm = provinceName.toLowerCase();
    if (provNorm.includes("jakarta")) return "152";
    if (provNorm.includes("banten")) return "456";
    if (provNorm.includes("west java") || provNorm.includes("jawa barat")) return "23";
    if (provNorm.includes("central java") || provNorm.includes("jawa tengah")) return "399";
    if (provNorm.includes("yogyakarta") || provNorm.includes("jogja")) return "501";
    if (provNorm.includes("east java") || provNorm.includes("jawa timur")) return "444";
    if (provNorm.includes("bali")) return "114";
  }

  // Default: Jakarta Selatan (Origin ID)
  return "153";
}

/**
 * Calls RajaOngkir Starter API to calculate shipping costs
 */
export async function calculateRajaOngkirRates(
  originCityId: string,
  destinationCityId: string,
  weightGrams: number,
  courier: string = "jne"
): Promise<ShippingRateOption[]> {
  const apiKey = process.env.RAJAONGKIR_API_KEY;

  if (
    !apiKey ||
    apiKey === "your-rajaongkir-api-key" ||
    apiKey === "demo-rajaongkir-key"
  ) {
    throw new Error("RAJAONGKIR_API_KEY not configured");
  }

  const sanitizedWeight = Math.max(1, weightGrams);

  const bodyParams = new URLSearchParams({
    origin: originCityId,
    destination: destinationCityId,
    weight: String(sanitizedWeight),
    courier: courier.toLowerCase(),
  });

  const response = await fetch("https://api.rajaongkir.com/starter/cost", {
    method: "POST",
    headers: {
      key: apiKey,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: bodyParams.toString(),
    signal: AbortSignal.timeout(2500),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`RajaOngkir API HTTP error ${response.status}: ${errorText}`);
  }

  const data = await response.json();

  if (data?.rajaongkir?.status?.code !== 200) {
    throw new Error(
      data?.rajaongkir?.status?.description || "RajaOngkir calculation failed"
    );
  }

  const results = data?.rajaongkir?.results?.[0];
  if (!results || !results.costs || results.costs.length === 0) {
    return [];
  }

  return results.costs.map((c: {
    service: string;
    description: string;
    cost: Array<{ value: number; etd: string; note: string }>;
  }) => {
    const costData = c.cost?.[0] || { value: 0, etd: "2-3" };
    const cleanEtd = costData.etd
      ? `${costData.etd.replace(/hari|days/gi, "").trim()} Hari`
      : "2-3 Hari";

    let serviceFullName = `JNE ${c.service}`;
    if (c.service === "REG") serviceFullName = "JNE Reguler (REG)";
    if (c.service === "YES") serviceFullName = "JNE Yakin Esok Sampai (YES)";
    if (c.service === "OKE") serviceFullName = "JNE Ongkos Kirim Ekonomis (OKE)";

    return {
      service: c.service,
      name: serviceFullName,
      description: c.description,
      cost: costData.value,
      currency: "IDR" as const,
      estimatedDays: cleanEtd,
    };
  });
}
