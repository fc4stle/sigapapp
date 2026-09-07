import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { sendTelegramMessage } from "@/lib/telegram-notify";

const OPENAQ_BASE_URL = "https://api.openaq.org/v3";
const SEARCH_RADIUS_METERS = 25000;
const LOCATION_LIMIT = 10;
const YOGYAKARTA_COORDINATES = "-7.7956,110.3695";
const SIGAP_URL = "https://www.sigapindonesia.web.id";

// Sentinel values yang menandakan data tidak valid dari berbagai sistem sensor
const SENTINEL_THRESHOLD = -900;

interface OpenAqParameter {
  id: number;
  name: string;
  units: string;
  displayName?: string;
}

interface OpenAqSensor {
  id: number;
  name: string;
  parameter: OpenAqParameter;
}

interface OpenAqCoordinates {
  latitude: number;
  longitude: number;
}

interface OpenAqLocation {
  id: number;
  name: string;
  coordinates: OpenAqCoordinates;
  sensors: OpenAqSensor[];
  distance?: number;
}

interface OpenAqLocationsResponse {
  results: OpenAqLocation[];
}

interface OpenAqLatestResult {
  sensorsId: number;
  value: number;
  datetime: { utc: string; local: string };
  coordinates: OpenAqCoordinates;
}

interface OpenAqLatestResponse {
  results: OpenAqLatestResult[];
}

interface KualitasUdaraRow {
  location_id: string;
  location_name: string;
  parameter: string;
  value: number;
  unit: string;
  lintang: number;
  bujur: number;
  waktu: string;
}

interface KualitasUdaraUpsertedRow extends KualitasUdaraRow {
  id: string;
  notified_at: string | null;
}

interface KualitasUdaraSubscriber {
  telegram_chat_id: string;
  ambang_aqi: number;
}

function isValidMeasurement(value: number): boolean {
  return value >= SENTINEL_THRESHOLD;
}

function isPm25OrPm10(parameter: string): boolean {
  const normalized = parameter.toLowerCase().replace(/[^a-z0-9]/g, "");
  return normalized === "pm25" || normalized === "pm10";
}

export async function GET(request: NextRequest) {
  const isVercelCron = request.headers.has("x-vercel-cron");
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  const hasValidBearer = authHeader === `Bearer ${cronSecret}`;
  if (!isVercelCron && authHeader && !hasValidBearer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.OPENAQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing environment variable: OPENAQ_API_KEY" },
      { status: 500 }
    );
  }

  const locationsUrl = `${OPENAQ_BASE_URL}/locations?coordinates=${YOGYAKARTA_COORDINATES}&radius=${SEARCH_RADIUS_METERS}&limit=${LOCATION_LIMIT}`;

  let locationsResponse: Response;
  try {
    locationsResponse = await fetch(locationsUrl, {
      headers: { "X-API-Key": apiKey },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { error: "Gagal menghubungi server OpenAQ" },
      { status: 502 }
    );
  }

  if (!locationsResponse.ok) {
    return NextResponse.json(
      { error: `OpenAQ merespons dengan status ${locationsResponse.status}` },
      { status: 502 }
    );
  }

  const locationsPayload: OpenAqLocationsResponse =
    await locationsResponse.json();
  const locations = locationsPayload.results ?? [];

  if (locations.length === 0) {
    return NextResponse.json(
      { error: "Tidak ada lokasi kualitas udara ditemukan dari OpenAQ" },
      { status: 502 }
    );
  }

  const rows: KualitasUdaraRow[] = [];

  for (const location of locations) {
    const sensorById = new Map(
      location.sensors.map((sensor) => [sensor.id, sensor])
    );

    let latestResponse: Response;
    try {
      latestResponse = await fetch(
        `${OPENAQ_BASE_URL}/locations/${location.id}/latest`,
        {
          headers: { "X-API-Key": apiKey },
          cache: "no-store",
        }
      );
    } catch {
      continue;
    }

    if (!latestResponse.ok) {
      continue;
    }

    const latestPayload: OpenAqLatestResponse =
      await latestResponse.json();

    for (const result of latestPayload.results ?? []) {
      const sensor = sensorById.get(result.sensorsId);
      if (!sensor) {
        continue;
      }

      // Filter sentinel values (data tidak valid)
      if (!isValidMeasurement(result.value)) {
        console.log(
          `[fetch-kualitas-udara] SKIP sentinel value ${result.value} from ${location.name} / ${sensor.parameter.displayName}`
        );
        continue;
      }

      const coordinates = result.coordinates ?? location.coordinates;
      if (!coordinates) {
        continue;
      }

      rows.push({
        location_id: String(location.id),
        location_name: location.name,
        parameter:
          sensor.parameter.displayName ?? sensor.parameter.name,
        value: result.value,
        unit: sensor.parameter.units,
        lintang: coordinates.latitude,
        bujur: coordinates.longitude,
        waktu: result.datetime.utc,
      });
    }
  }

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "Tidak ada data pengukuran kualitas udara yang tersedia" },
      { status: 502 }
    );
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("kualitas_udara")
    .upsert(rows, { onConflict: "location_id,parameter" })
    .select()
    .returns<KualitasUdaraUpsertedRow[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const unnotifiedRows = (data ?? []).filter(
    (row) => !row.notified_at && isPm25OrPm10(row.parameter)
  );

  console.log(
    "[fetch-kualitas-udara] unnotifiedRows:",
    JSON.stringify(unnotifiedRows)
  );

  if (unnotifiedRows.length > 0) {
    const { data: subscribers, error: subscriberError } = await supabase
      .from("subscriber")
      .select("telegram_chat_id, ambang_aqi")
      .eq("aktif", true)
      .returns<KualitasUdaraSubscriber[]>();

    console.log(
      "[fetch-kualitas-udara] subscriberError:",
      subscriberError
    );
    console.log(
      "[fetch-kualitas-udara] subscribers:",
      JSON.stringify(subscribers)
    );

    if (subscriberError) {
      console.error(
        "Gagal mengambil subscriber:",
        subscriberError.message
      );
    } else {
      for (const row of unnotifiedRows) {
        for (const subscriber of subscribers ?? []) {
          console.log(
            `[fetch-kualitas-udara] cek ${subscriber.telegram_chat_id}: value=${row.value} >= ambang=${subscriber.ambang_aqi}? ${row.value >= subscriber.ambang_aqi}`
          );
          if (row.value >= subscriber.ambang_aqi) {
            const sent = await sendTelegramMessage(
              subscriber.telegram_chat_id,
              `🌫️ <b>Peringatan Kualitas Udara!</b>\n\nLokasi: ${row.location_name}\nParameter: ${row.parameter}\nValue: ${row.value} ${row.unit}\nWaktu: ${row.waktu}\n\n🔗 ${SIGAP_URL}`
            );
            console.log(
              `[fetch-kualitas-udara] kirim ke ${subscriber.telegram_chat_id}: ${sent ? "SUKSES" : "GAGAL"}`
            );
          }
        }
      }

      console.log(
        "[fetch-kualitas-udara] update notified_at untuk ids:",
        unnotifiedRows.map((r) => r.id)
      );
      const { error: notifiedError } = await supabase
        .from("kualitas_udara")
        .update({ notified_at: new Date().toISOString() })
        .in(
          "id",
          unnotifiedRows.map((row) => row.id)
        );

      if (notifiedError) {
        console.error(
          "Gagal memperbarui notified_at pada kualitas_udara:",
          notifiedError.message
        );
      } else {
        console.log(
          "[fetch-kualitas-udara] notified_at BERHASIL di-update"
        );
      }
    }
  } else {
    console.log(
      "[fetch-kualitas-udara] SKIP notifikasi — semua data sudah pernah di-notifikasi atau tidak ada PM2.5/PM10"
    );
  }

  return NextResponse.json({ data });
}
