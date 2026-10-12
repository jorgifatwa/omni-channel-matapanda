import { NextResponse } from "next/server";
import {
  calculateRajaOngkirRates,
  resolveRajaOngkirCityId,
  type ShippingRateOption,
} from "@/lib/rajaongkir";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      destinationCountry = "Indonesia",
      destinationCountryCode = "ID",
      destinationProvince = "Jakarta",
      destinationCity = "Jakarta",
      weightGrams = 500,
    } = body;

    const isDomestic =
      destinationCountryCode.toUpperCase() === "ID" ||
      destinationCountry.toLowerCase().includes("indonesia");

    if (isDomestic) {
      const originCityId = process.env.RAJAONGKIR_ORIGIN_CITY_ID || "153"; // 153 = Jakarta Selatan (ZODIAC Origin)
      const destinationCityId = resolveRajaOngkirCityId(
        destinationCity,
        destinationProvince
      );

      // 1. Try Live RajaOngkir Starter API if configured
      const rajaOngkirKey = process.env.RAJAONGKIR_API_KEY;
      if (
        rajaOngkirKey &&
        rajaOngkirKey !== "your-rajaongkir-api-key" &&
        rajaOngkirKey !== "demo-rajaongkir-key"
      ) {
        try {
          const liveRates = await calculateRajaOngkirRates(
            originCityId,
            destinationCityId,
            weightGrams,
            "jne"
          );

          if (liveRates && liveRates.length > 0) {
            return NextResponse.json({
              courier: "JNE",
              provider: "rajaongkir_starter",
              destination: destinationCity,
              destinationCityId,
              originCityId,
              country: "Indonesia",
              weightGrams,
              rates: liveRates,
            });
          }
        } catch (roError) {
          console.warn(
            "RajaOngkir live API call failed, falling back to local rate table:",
            roError
          );
        }
      }

      // 2. Offline / Fallback Local Calculation for Domestic Indonesia
      const weightKg = Math.max(1, Math.ceil(weightGrams / 1000));
      const city = destinationCity.toLowerCase();

      let regRate = 12000;
      let yesRate = 24000;
      let okeRate = 10000;

      if (city.includes("bandung") || city.includes("bogor") || city.includes("bekasi") || city.includes("depok") || city.includes("tangerang")) {
        regRate = 14000;
        yesRate = 26000;
        okeRate = 11000;
      } else if (
        city.includes("surabaya") ||
        city.includes("semarang") ||
        city.includes("yogyakarta") ||
        city.includes("solo") ||
        city.includes("malang")
      ) {
        regRate = 19000;
        yesRate = 35000;
        okeRate = 16000;
      } else if (city.includes("bali") || city.includes("denpasar")) {
        regRate = 22000;
        yesRate = 42000;
        okeRate = 18000;
      } else if (city.includes("medan") || city.includes("makassar") || city.includes("palembang") || city.includes("batam")) {
        regRate = 32000;
        yesRate = 58000;
        okeRate = 27000;
      }

      const fallbackRates: ShippingRateOption[] = [
        {
          service: "REG",
          name: "JNE Reguler (REG)",
          cost: regRate * weightKg,
          currency: "IDR",
          estimatedDays: "2-3 Hari",
        },
        {
          service: "YES",
          name: "JNE Yakin Esok Sampai (YES)",
          cost: yesRate * weightKg,
          currency: "IDR",
          estimatedDays: "1 Hari (Besok Sampai)",
        },
        {
          service: "OKE",
          name: "JNE Ongkos Kirim Ekonomis (OKE)",
          cost: okeRate * weightKg,
          currency: "IDR",
          estimatedDays: "3-5 Hari",
        },
      ];

      return NextResponse.json({
        courier: "JNE",
        provider: "local_estimation",
        destination: destinationCity,
        country: "Indonesia",
        weightGrams,
        rates: fallbackRates,
      });
    }

    // International -> Calculate DHL Express Worldwide Rates
    const weightKg = Math.max(0.5, weightGrams / 1000);
    const country = destinationCountry.toLowerCase();

    let dhlCostIDR = 260000;
    let estimatedDays = "2-4 Business Days";

    if (country.includes("singapore") || country.includes("malaysia")) {
      dhlCostIDR = 220000 + Math.round(weightKg * 60000);
      estimatedDays = "1-2 Business Days";
    } else if (country.includes("japan") || country.includes("korea")) {
      dhlCostIDR = 340000 + Math.round(weightKg * 90000);
      estimatedDays = "2-3 Business Days";
    } else if (country.includes("united states") || country.includes("usa")) {
      dhlCostIDR = 480000 + Math.round(weightKg * 140000);
      estimatedDays = "3-5 Business Days";
    } else if (
      country.includes("united kingdom") ||
      country.includes("germany") ||
      country.includes("france")
    ) {
      dhlCostIDR = 450000 + Math.round(weightKg * 130000);
      estimatedDays = "3-5 Business Days";
    } else {
      dhlCostIDR = 520000 + Math.round(weightKg * 150000);
      estimatedDays = "4-7 Business Days";
    }

    return NextResponse.json({
      courier: "DHL",
      provider: "dhl_express",
      destination: destinationCity,
      country: destinationCountry,
      weightGrams,
      rates: [
        {
          service: "EXPRESS_WORLDWIDE",
          name: "DHL Express Worldwide (Air Priority)",
          cost: dhlCostIDR,
          currency: "IDR",
          estimatedDays,
        },
      ],
    });
  } catch (error) {
    console.error("Shipping cost calculation error:", error);
    return NextResponse.json(
      { error: "Gagal menghitung tarif ongkos kirim" },
      { status: 500 }
    );
  }
}
