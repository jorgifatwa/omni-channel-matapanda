import { NextResponse } from "next/server";
import { quoteDomesticShipping, weighCartLines } from "@/lib/shipping-quote";

/**
 * Domestic shipping quote for checkout.
 * Body: { destinationCity, destinationPostalCode, items: [{ productId, quantity }] }
 * The parcel weight is computed from the product weights in the database
 * (plus packaging); a client-sent weight is ignored.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { destinationCity = "Jakarta", destinationPostalCode = "", items = [] } = body ?? {};

    const weightGrams = await weighCartLines(items);
    const quote = await quoteDomesticShipping(
      String(destinationCity),
      String(destinationPostalCode),
      weightGrams
    );

    return NextResponse.json({
      provider: quote.provider,
      destination: destinationCity,
      destinationId: quote.destinationId,
      originId: quote.originId,
      country: "Indonesia",
      weightGrams,
      rates: quote.rates,
    });
  } catch (error) {
    console.error("Shipping cost calculation error:", error);
    return NextResponse.json(
      { error: "Gagal menghitung tarif ongkos kirim" },
      { status: 500 }
    );
  }
}
