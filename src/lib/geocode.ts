const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "SigapApp/1.0 (aplikasi tugas kuliah)";

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

export interface GeocodeResult {
  lat: number;
  lon: number;
  display_name: string;
}

export async function geocodeWilayah(q: string): Promise<GeocodeResult | null> {
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", `${q}, Indonesia`);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const results: NominatimResult[] = await response.json();
  const result = results[0];

  if (!result) {
    return null;
  }

  return {
    lat: Number.parseFloat(result.lat),
    lon: Number.parseFloat(result.lon),
    display_name: result.display_name,
  };
}
