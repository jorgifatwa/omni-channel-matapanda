import { NextResponse } from "next/server";
import { addSubscriber } from "@/lib/newsletter-store";
import { TOO_MANY_MESSAGE, clientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  if (!(await rateLimit("newsletter-ip", clientIp(req), 10, 3600))) {
    return NextResponse.json({ error: TOO_MANY_MESSAGE }, { status: 429 });
  }
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, message: "Email wajib diisi" },
        { status: 400 }
      );
    }

    const result = await addSubscriber(email);
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[NewsletterAPI] Error:", error);
    const message = "Gagal menyimpan langganan newsletter. Silakan coba lagi nanti.";
    return NextResponse.json(
      { success: false, message, error: message },
      { status: 503 }
    );
  }
}
