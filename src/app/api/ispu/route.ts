import { NextRequest, NextResponse } from "next/server";
import {
  fetchIspuStations,
  filterActiveStations,
  convertIspuTimeToUtc,
  extractIspuParameters,
  ispuCategoryColor,
} from "@/lib/ispu-client";

export const dynamic = "force-dynamic";

const SEARCH_RADIUS_METERS = 25000;
const MAX_STATIONS = 5;

/**
 * Feature flag: ISPU_ENABLED harus "true" untuk mengaktifkan.
 * Default false saat development — bisa diaktifkan via env var.
 */
function isIspuEnabled(): boolean {
  return process.env.ISPU_ENABLED === "true";
}

interface IspuResultItem {
  location_name: string;
  parameter: string;
  value: number;
  unit: string;
  lintang: number;
  bujur: number;
  waktu: string; // ISO 8601 UTC
  sumber: "KLHK";
  ispu_category: string;
  ispu_val: number;
  distance_km: number;
}

export async function GET(request: NextRequest) {
  if (!isIspuEnabled()) {
    return NextResponse.json({
      data: [],
      pesan: "Sumber data ISPU belum diaktifkan",
      koordinat: null,
      ispu_active: false,
    });
  }

  const lat = request.nextUrl.searchParams.get("lat");
  const lon = request.nextUrl.searchParams.get("lon");

  if (!lat || !lon) {
    return NextResponse.json(
      { error: "Parameter 'lat' dan 'lon' wajib diisi" },
      { status: 400 },
    );
  }

  const latNum = Number.parseFloat(lat);
  const lonNum = Number.parseFloat(lon);

  if (Number.isNaN(latNum) || Number.isNaN(lonNum)) {
    return NextResponse.json(
      { error: "Parameter 'lat' dan 'lon' harus berupa angka" },
      { status: 400 },
    );
  }

  if (latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
    return NextResponse.json(
      { error: "Koordinat tidak valid" },
      { status: 400 },
    );
  }

  try {
    const allStations = await fetchIspuStations();
    const nearby = filterActiveStations(allStations, SEARCH_RADIUS_METERS, latNum, lonNum);
    const limited = nearby.slice(0, MAX_STATIONS);

    const items: IspuResultItem[] = [];

    for (const station of limited) {
      const params = extractIspuParameters(station);
      const waktuUtc = convertIspuTimeToUtc(station.waktu, station.time_z);

      for (const p of params) {
        items.push({
          location_name: station.nama,
          parameter: p.parameter,
          value: p.value,
          unit: p.unit,
          lintang: station.lat,
          bujur: station.lon,
          waktu: waktuUtc,
          sumber: "KLHK",
          ispu_category: station.cat,
          ispu_val: parseInt(station.val, 10),
          distance_km: Number((station._distance / 1000).toFixed(1)),
        });
      }
    }

    return NextResponse.json({
      data: items,
      koordinat: { lat: latNum, lon: lonNum },
      total_sensor: items.length,
      ispu_active: true,
      ispu_stations_found: limited.length,
    });
  } catch (error) {
    // Fallback: return empty, don't break the page
    const message = error instanceof Error ? error.message : "Gagal mengambil data ISPU";
    console.error(`[api/ispu] Error: ${message}`);
    return NextResponse.json({
      data: [],
      pesan: "Sumber data ISPU saat ini tidak tersedia",
      koordinat: { lat: latNum, lon: lonNum },
      ispu_active: true, // feature is on but endpoint failed
      ispu_error: message,
    });
  }
}
