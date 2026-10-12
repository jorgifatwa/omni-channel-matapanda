import { NextResponse } from "next/server";
import {
  getSubscribersAsync,
  addSubscriber,
} from "@/lib/newsletter-store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("search")?.toLowerCase().trim();

  try {
    const subscribers = await getSubscribersAsync();

    let filtered = subscribers;
    if (query) {
      filtered = subscribers.filter((s) =>
        s.email.toLowerCase().includes(query)
      );
    }

    return NextResponse.json({
      subscribers: filtered,
      total: filtered.length,
      success: true,
    });
  } catch (error) {
    console.error("GET /api/admin/subscribers error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil daftar subscribers" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: "Alamat email wajib diisi." },
        { status: 400 }
      );
    }

    const result = await addSubscriber(email);
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        message: result.message,
        subscriber: result.subscriber,
        alreadySubscribed: result.alreadySubscribed,
        success: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/admin/subscribers error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server saat menambahkan subscriber." },
      { status: 500 }
    );
  }
}
