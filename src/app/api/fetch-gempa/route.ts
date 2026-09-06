import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const BMKG_AUTOGEMPA_URL = "https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json";

interface BmkgGempa {
  Tanggal: string;
  Jam: string;
  DateTime: string;
  Magnitude: string;
  Kedalaman: string;
  Wilayah: string;
  Potensi: string;
  Coordinates?: string;
  point?: { coordinates: string };
}

interface BmkgAutogempaResponse {
  Infogempa: {
    gempa: BmkgGempa;
  };
}

export async function GET(request: NextRequest) {
  const isVercelCron = request.headers.has("x-vercel-cron");
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  const hasValidBearer = authHeader === `Bearer ${cronSecret}`;
  if (!isVercelCron && authHeader && !hasValidBearer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let bmkgResponse: Response;
  try {
    bmkgResponse = await fetch(BMKG_AUTOGEMPA_URL, { cache: "no-store" });
  } catch {
    return NextResponse.json(
      { error: "Gagal menghubungi server BMKG" },
      { status: 502 }
    );
  }

  if (!bmkgResponse.ok) {
    return NextResponse.json(
      { error: `BMKG merespons dengan status ${bmkgResponse.status}` },
      { status: 502 }
    );
  }

  const payload: BmkgAutogempaResponse = await bmkgResponse.json();
  const gempa = payload.Infogempa?.gempa;

  if (!gempa) {
    return NextResponse.json(
      { error: "Format data BMKG tidak sesuai" },
      { status: 502 }
    );
  }

  const coordinates = gempa.point?.coordinates ?? gempa.Coordinates;
  const [lintangRaw, bujurRaw] = (coordinates ?? "").split(",");
  const lintang = Number.parseFloat(lintangRaw);
  const bujur = Number.parseFloat(bujurRaw);
  const magnitude = Number.parseFloat(gempa.Magnitude);

  if ([lintang, bujur, magnitude].some((value) => Number.isNaN(value))) {
    return NextResponse.json(
      { error: "Gagal mem-parsing koordinat atau magnitude dari data BMKG" },
      { status: 502 }
    );
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("gempa")
    .upsert(
      {
        tanggal: gempa.Tanggal,
        jam: gempa.Jam,
        date_time: gempa.DateTime,
        magnitude,
        kedalaman: gempa.Kedalaman,
        wilayah: gempa.Wilayah,
        potensi: gempa.Potensi,
        lintang,
        bujur,
      },
      { onConflict: "date_time" }
    )
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
