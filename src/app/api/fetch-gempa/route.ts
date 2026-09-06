import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { sendTelegramMessage } from "@/lib/telegram-notify";

export const dynamic = "force-dynamic";

const BMKG_AUTOGEMPA_URL = "https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json";
const SIGAP_URL = "https://sigapapp.vercel.app";

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

interface GempaRow {
  id: string;
  notified_at: string | null;
}

interface GempaSubscriber {
  telegram_chat_id: string;
  ambang_gempa_magnitude: number;
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
    .maybeSingle<GempaRow>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log("[fetch-gempa] data:", JSON.stringify(data));
  console.log("[fetch-gempa] notified_at:", data?.notified_at);

  if (data && !data.notified_at) {
    const { data: subscribers, error: subscriberError } = await supabase
      .from("subscriber")
      .select("telegram_chat_id, ambang_gempa_magnitude")
      .eq("aktif", true)
      .returns<GempaSubscriber[]>();

    console.log("[fetch-gempa] subscriberError:", subscriberError);
    console.log("[fetch-gempa] subscribers:", JSON.stringify(subscribers));

    if (subscriberError) {
      console.error("Gagal mengambil subscriber:", subscriberError.message);
    } else {
      for (const subscriber of subscribers ?? []) {
        console.log(`[fetch-gempa] cek ${subscriber.telegram_chat_id}: magnitude=${magnitude} >= ambang=${subscriber.ambang_gempa_magnitude}? ${magnitude >= subscriber.ambang_gempa_magnitude}`);
        if (magnitude >= subscriber.ambang_gempa_magnitude) {
          const sent = await sendTelegramMessage(
            subscriber.telegram_chat_id,
            `⚠️ <b>Gempa Terdeteksi!</b>\n\nMagnitude: ${magnitude}\nWilayah: ${gempa.Wilayah}\nWaktu: ${gempa.Tanggal} ${gempa.Jam}\n\n🔗 ${SIGAP_URL}`
          );
          console.log(`[fetch-gempa] kirim ke ${subscriber.telegram_chat_id}: ${sent ? "SUKSES" : "GAGAL"}`);
        }
      }

      console.log("[fetch-gempa] update notified_at untuk id:", data.id);
      const { error: notifiedError } = await supabase
        .from("gempa")
        .update({ notified_at: new Date().toISOString() })
        .eq("id", data.id);

      if (notifiedError) {
        console.error("Gagal memperbarui notified_at pada gempa:", notifiedError.message);
      } else {
        console.log("[fetch-gempa] notified_at BERHASIL di-update");
      }
    }
  } else {
    console.log("[fetch-gempa] SKIP notifikasi — data sudah pernah di-notifikasi atau data null");
  }

  return NextResponse.json({ data });
}
