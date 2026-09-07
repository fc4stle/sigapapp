import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const OPENAQ_BASE_URL = "https://api.openaq.org/v3";
const SEARCH_RADIUS_METERS = 25000;
const LOCATION_LIMIT = 10;

// Sentinel values yang menandakan data tidak valid dari berbagai sistem sensor
const SENTINEL_THRESHOLD = -900;

function isValidMeasurement(value: number): boolean {
  return value >= SENTINEL_THRESHOLD;
}

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

interface KualitasUdaraItem {
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
  const lat = request.nextUrl.searchParams.get("lat");
  const lon = request.nextUrl.searchParams.get("lon");

  if (!lat || !lon) {
    return NextResponse.json(
      { error: "Parameter 'lat' dan 'lon' wajib diisi" },
      { status: 400 }
    );
  }

  const latNum = Number.parseFloat(lat);
  const lonNum = Number.parseFloat(lon);

  if (Number.isNaN(latNum) || Number.isNaN(lonNum)) {
    return NextResponse.json(
      { error: "Parameter 'lat' dan 'lon' harus berupa angka" },
      { status: 400 }
    );
  }

  if (latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
    return NextResponse.json(
      { error: "Koordinat tidak valid (lat: -90 hingga 90, lon: -180 hingga 180)" },
      { status: 400 }
    );
  }

  const apiKey = process.env.OPENAQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing environment variable: OPENAQ_API_KEY" },
      { status: 500 }
    );
  }

  const coordinates = `${latNum},${lonNum}`;

  // Step 1: Cari lokasi dalam radius
  const locationsUrl = `${OPENAQ_BASE_URL}/locations?coordinates=${coordinates}&radius=${SEARCH_RADIUS_METERS}&limit=${LOCATION_LIMIT}`;

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
  const allLocations = locationsPayload.results ?? [];

  if (allLocations.length === 0) {
    return NextResponse.json({
      data: [],
      pesan: "Tidak ada sensor kualitas udara dalam radius 25km dari wilayah ini",
      koordinat: { lat: latNum, lon: lonNum },
    });
  }

  // Sort by distance (ascending) and take only the nearest location
  const locations = [...allLocations].sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0)).slice(0, 1);

  // Step 2: Ambil measurement terbaru dari setiap lokasi
  const items: KualitasUdaraItem[] = [];

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

    const latestPayload: OpenAqLatestResponse = await latestResponse.json();

    for (const result of latestPayload.results ?? []) {
      const sensor = sensorById.get(result.sensorsId);
      if (!sensor) {
        continue;
      }

      // Filter sentinel values (data tidak valid)
      if (!isValidMeasurement(result.value)) {
        console.log(
          `[kualitas-udara] SKIP sentinel value ${result.value} from ${location.name} / ${sensor.parameter.displayName}`
        );
        continue;
      }

      const coordinates = result.coordinates ?? location.coordinates;
      if (!coordinates) {
        continue;
      }

      items.push({
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

  if (items.length === 0) {
    return NextResponse.json({
      data: [],
      pesan: "Sensor ditemukan tapi tidak ada data pengukuran terbaru",
      koordinat: { lat: latNum, lon: lonNum },
    });
  }

  return NextResponse.json({
    data: items,
    koordinat: { lat: latNum, lon: lonNum },
    total_sensor: items.length,
    distance_km: locations[0].distance ? Number((locations[0].distance / 1000).toFixed(1)) : null,
    wilayah_terdekat: locations[0]?.name ?? null,
  });
}
