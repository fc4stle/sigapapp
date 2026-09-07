/**
 * ISPU KLHK Client
 *
 * Endpoint: GET https://ispu.kemenlh.go.id/apimobile/v1/getStations
 *
 * ⚠️  CATATAN PENTING — BACA SEBELUM MENGEDIT:
 * ============================================================
 * Endpoint ini BUKAN API resmi/terdokumentasi dari KLHK.
 * Ditemukan melalui reverse-engineering network request dari
 * web app publik ispu.kemenlh.go.id/webv5/ (kode JS: main.daf7c0ad3ad4bfd4.js).
 *
 * Endpoint bisa berubah atau dihapus sewaktu-waktu tanpa pemberitahuan.
 * Selalu gunakan try-catch + timeout + fallback ke OpenAQ.
 *
 * Lihat: references/ispu-klhk.md untuk detail penemuan & struktur data.
 * ============================================================
 */

import "server-only";

const ISPU_BASE_URL = "https://ispu.kemenlh.go.id";
const ISPU_ENDPOINT = "/apimobile/v1/getStations";
const REQUEST_TIMEOUT_MS = 5000;

export type IspuCategory = "BAIK" | "TIDAK SEHAT" | "SANGAT TIDAK SEHAT" | "BERBAHAYA";

export interface IspuStation {
  id_stasiun: string;
  nama: string;
  lat: number;
  lon: number;
  alamat: string;
  kota: string;
  provinsi: string;
  waktu: string; // "2026-09-08 05:00:00" (lokal)
  time_z: string; // "WIB" | "WITA" | "WIT"
  time_offset: number; // 0 | 1 | 2
  is_maintenance: string; // "0" | "1"
  val: string; // nilai ISPU
  cat: IspuCategory; // kategori ISPU
  param: string; // parameter dominan (PM10, PM25, SO2, CO, O3, NO2, HC)
  kategori: {
    nilai_uid: string;
    nilai: string;
    keterangan: string;
    color: string;
    color_text: string;
    icon: string;
  };
  // Aktual values per parameter
  a_pm10: string | null;
  a_pm25: string | null;
  a_so2: string | null;
  a_co: string | null;
  a_o3: string | null;
  a_no2: string | null;
  a_hc: string | null;
  // Kategori per parameter (1-5)
  c_pm10: string | null;
  c_pm25: string | null;
  c_so2: string | null;
  c_co: string | null;
  c_o3: string | null;
  c_no2: string | null;
  c_hc: string | null;
}

export interface IspuApiResponse {
  rows: IspuStation[];
  status: { statusCode: number; statusDesc: string };
  total: number;
}

/**
 * Fetch semua stasiun ISPU dari endpoint KLHK.
 * Throw kalau gagal — caller harus catch & fallback.
 */
export async function fetchIspuStations(): Promise<IspuStation[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${ISPU_BASE_URL}${ISPU_ENDPOINT}`, {
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`ISPU API responded with status ${response.status}`);
    }

    const json: IspuApiResponse = await response.json();

    if (!json.rows || !Array.isArray(json.rows)) {
      throw new Error("ISPU API returned unexpected format");
    }

    // Parse string values to numbers where needed
    return json.rows.map((row) => ({
      ...row,
      lat: typeof row.lat === "string" ? parseFloat(row.lat) : row.lat,
      lon: typeof row.lon === "string" ? parseFloat(row.lon) : row.lon,
    }));
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`ISPU API request timed out after ${REQUEST_TIMEOUT_MS}ms`);
    }
    throw error;
  }
}

/**
 * Filter stasiun yang TIDAK maintenance dan berada dalam radius tertentu (meter).
 */
export function filterActiveStations(
  stations: IspuStation[],
  radiusMeters: number,
  originLat: number,
  originLon: number,
): Array<IspuStation & { _distance: number }> {
  return stations
    .filter((s) => s.is_maintenance === "0")
    .map((s) => ({
      ...s,
      _distance: haversineDistance(originLat, originLon, s.lat, s.lon),
    }))
    .filter((s) => s._distance <= radiusMeters)
    .sort((a, b) => a._distance - b._distance);
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Konversi waktu lokal ISPU ke ISO 8601 UTC.
 * ISPU menyimpan waktu sudah dalam WIB/WITA/WIT, konversi ke UTC untuk konsistensi.
 */
export function convertIspuTimeToUtc(waktu: string, timeZone: string): string {
  const offsetMap: Record<string, number> = { WIB: 7, WITA: 8, WIT: 9 };
  const hours = offsetMap[timeZone] ?? 7;

  const [datePart, timePart] = waktu.split(" ");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second] = timePart.split(":").map(Number);

  const localDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  localDate.setUTCHours(localDate.getUTCHours() - hours);

  return localDate.toISOString();
}

/**
 * Map kategori ISPU ke warna (sama skala dengan OpenAQ untuk konsistensi visual,
 * TANPA mengkonversi nilai — hanya mapping kategori ke warna).
 */
export function ispuCategoryColor(cat: IspuCategory): string {
  switch (cat) {
    case "BAIK":
      return "#22c55e";
    case "TIDAK SEHAT":
      return "#eab308";
    case "SANGAT TIDAK SEHAT":
      return "#f97316";
    case "BERBAHAYA":
      return "#ef4444";
    default:
      return "#8B96A5";
  }
}

/**
 * Extract parameter relevan dari stasiun ISPU untuk ditampilkan.
 * Return array of { parameter, value, unit } — tanpa HC.
 */
export function extractIspuParameters(station: IspuStation): Array<{ parameter: string; value: number; unit: string }> {
  const params: Array<{ parameter: string; value: number; unit: string }> = [];
  const unitMap: Record<string, string> = {
    pm10: "µg/m³",
    pm25: "µg/m³",
    so2: "µg/m³",
    co: "mg/m³",
    o3: "µg/m³",
    no2: "µg/m³",
  };

  const mappings: Array<{ key: string; value: string | null }> = [
    { key: "pm10", value: station.a_pm10 },
    { key: "pm25", value: station.a_pm25 },
    { key: "so2", value: station.a_so2 },
    { key: "co", value: station.a_co },
    { key: "o3", value: station.a_o3 },
    { key: "no2", value: station.a_no2 },
  ];

  for (const { key, value } of mappings) {
    if (value !== null && value !== undefined) {
      const num = parseFloat(value);
      if (!isNaN(num) && num >= 0) {
        params.push({ parameter: key.toUpperCase(), value: num, unit: unitMap[key] ?? "" });
      }
    }
  }

  return params;
}
