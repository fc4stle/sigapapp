import { NextRequest, NextResponse } from "next/server";
import { geocodeWilayah } from "@/lib/geocode";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json(
      { error: "Parameter 'q' wajib diisi" },
      { status: 400 }
    );
  }

  let result;
  try {
    result = await geocodeWilayah(q);
  } catch {
    return NextResponse.json(
      { error: "Gagal menghubungi server geocoding" },
      { status: 502 }
    );
  }

  if (!result) {
    return NextResponse.json(
      { error: "Wilayah tidak ditemukan" },
      { status: 404 }
    );
  }

  return NextResponse.json(result);
}
