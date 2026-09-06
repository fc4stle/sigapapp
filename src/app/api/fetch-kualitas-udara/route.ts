import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const OPENAQ_BASE_URL = "https://api.openaq.org/v3";
const YOGYAKARTA_COORDINATES = "-7.7956,110.3695";
const SEARCH_RADIUS_METERS = 25000;
const LOCATION_LIMIT = 10;

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

  const locationsPayload: OpenAqLocationsResponse = await locationsResponse.json();
  const locations = locationsPayload.results ?? [];

  if (locations.length === 0) {
    return NextResponse.json(
      { error: "Tidak ada lokasi kualitas udara ditemukan dari OpenAQ" },
      { status: 502 }
    );
  }

  const rows: KualitasUdaraRow[] = [];

  for (const location of locations) {
    const sensorById = new Map(location.sensors.map((sensor) => [sensor.id, sensor]));

    let latestResponse: Response;
    try {
      latestResponse = await fetch(`${OPENAQ_BASE_URL}/locations/${location.id}/latest`, {
        headers: { "X-API-Key": apiKey },
        cache: "no-store",
      });
    } catch {
      continue;
    }

    if (!latestResponse.ok) {
      continue;
    }

    const latestPayload: OpenAqLatestResponse = await latestResponse.json();

    for (const result of latestPayload.results ?? []) {
      const sensor = sensorById.get(result.sensorsId);
      if (!sensor) {
        continue;
      }

      const coordinates = result.coordinates ?? location.coordinates;
      if (!coordinates) {
        continue;
      }

      rows.push({
        location_id: String(location.id),
        location_name: location.name,
        parameter: sensor.parameter.displayName ?? sensor.parameter.name,
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
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
