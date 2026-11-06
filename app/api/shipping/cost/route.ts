import { NextResponse } from "next/server";
import {
  calculateRajaOngkirRates,
  getOriginId,
  isRajaOngkirConfigured,
  resolveDestinationId,
  type ShippingRateOption,
} from "@/lib/rajaongkir";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // The store only ships within Indonesia (no international / DHL option).
    const {
      destinationCity = "Jakarta",
      destinationPostalCode = "",
      weightGrams = 500,
    } = body;

    {
      // 1. Live RajaOngkir (Komerce) API: JNE, J&T, SiCepat, AnterAja, POS, ...
      if (isRajaOngkirConfigured()) {
        try {
          const [originId, destinationId] = await Promise.all([
            getOriginId(),
            resolveDestinationId(String(destinationCity), String(destinationPostalCode)),
          ]);

          if (destinationId) {
            const liveRates = await calculateRajaOngkirRates(
              originId,
              destinationId,
              Number(weightGrams) || 500
            );

            if (liveRates.length > 0) {
              return NextResponse.json({
                provider: "rajaongkir",
                destination: destinationCity,
                destinationId,
                originId,
                country: "Indonesia",
                weightGrams,
                rates: liveRates,
              });
            }
          } else {
            console.warn(`[RajaOngkir] Destination not found for "${destinationCity}"`);
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
          id: "JNE_REG",
          courier: "JNE",
          courierName: "JNE",
          service: "REG",
          name: "JNE Reguler (REG)",
          cost: regRate * weightKg,
          currency: "IDR",
          estimatedDays: "2-3 Hari",
        },
        {
          id: "JNE_YES",
          courier: "JNE",
          courierName: "JNE",
          service: "YES",
          name: "JNE Yakin Esok Sampai (YES)",
          cost: yesRate * weightKg,
          currency: "IDR",
          estimatedDays: "1 Hari (Besok Sampai)",
        },
        {
          id: "JNE_OKE",
          courier: "JNE",
          courierName: "JNE",
          service: "OKE",
          name: "JNE Ongkos Kirim Ekonomis (OKE)",
          cost: okeRate * weightKg,
          currency: "IDR",
          estimatedDays: "3-5 Hari",
        },
      ];

      return NextResponse.json({
        provider: "local_estimation",
        destination: destinationCity,
        country: "Indonesia",
        weightGrams,
        rates: fallbackRates,
      });
    }

  } catch (error) {
    console.error("Shipping cost calculation error:", error);
    return NextResponse.json(
      { error: "Gagal menghitung tarif ongkos kirim" },
      { status: 500 }
    );
  }
}
