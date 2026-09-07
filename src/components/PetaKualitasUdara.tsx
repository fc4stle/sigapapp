"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { createSupabaseAnonClient } from "@/lib/supabase-anon";
import AccessibleAirQualityMarkers from "./AccessibleAirQualityMarkers";

interface KualitasUdaraItem {
  location_name: string;
  parameter: string;
  value: number;
  unit: string;
  lintang: number;
  bujur: number;
  waktu: string;
}

interface LocationData {
  location_name: string;
  lintang: number;
  bujur: number;
  pm25: KualitasUdaraItem | null;
  pm10: KualitasUdaraItem | null;
  others: KualitasUdaraItem[];
}

const YOGYAKARTA_CENTER: [number, number] = [-7.7956, 110.3695];

function getMarkerColor(value: number): string {
  if (value > 55) return "#ef4444";
  if (value > 35) return "#f97316";
  if (value > 12) return "#eab308";
  return "#22c55e";
}

function getMarkerLabel(value: number): string {
  if (value > 55) return "Bahaya";
  if (value > 35) return "Tidak sehat";
  if (value > 12) return "Sedang";
  return "Baik";
}

function groupByLocation(items: KualitasUdaraItem[]): LocationData[] {
  const map = new Map<string, LocationData>();

  for (const item of items) {
    const key = `${item.lintang}_${item.bujur}`;
    let loc = map.get(key);
    if (!loc) {
      loc = {
        location_name: item.location_name,
        lintang: item.lintang,
        bujur: item.bujur,
        pm25: null,
        pm10: null,
        others: [],
      };
      map.set(key, loc);
    }

    const param = item.parameter.toLowerCase();
    if (param.includes("pm25") || param.includes("pm2.5")) {
      loc.pm25 = item;
    } else if (param.includes("pm10")) {
      loc.pm10 = item;
    } else {
      loc.others.push(item);
    }
  }

  return Array.from(map.values());
}

function FocusCenter({ dataList }: { dataList: LocationData[] }) {
  const map = useMap();

  useEffect(() => {
    if (dataList.length === 0) return;
    const latest = dataList[0];
    map.setView([latest.lintang, latest.bujur], 10, {
      animate: true,
      duration: 1,
    });
  }, [dataList, map]);

  return null;
}

const WILAYAH_ZOOM = 10;

function Legend() {
  return (
    <div
      style={{ position: "absolute", bottom: "16px", left: "16px", zIndex: 1000 }}
      className="rounded border border-border bg-background/90 p-2 text-xs pointer-events-none"
    >
      <p className="font-medium mb-1">Keterangan warna (PM2.5)</p>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: "#22c55e" }} />
          <span>Baik (≤12)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: "#eab308" }} />
          <span>Sedang (12-35)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: "#f97316" }} />
          <span>Tidak sehat (35-55)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: "#ef4444" }} />
          <span>Bahaya (&gt;55)</span>
        </div>
      </div>
    </div>
  );
}

export default function PetaKualitasUdara({
  center,
}: {
  center?: [number, number];
}) {
  const [dataList, setDataList] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [pesan, setPesan] = useState<string | null>(null);
  const hasCustomCenter = center !== undefined;

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setPesan(null);

    async function fetchKualitasUdara() {
      if (hasCustomCenter && center) {
        try {
          const res = await fetch(
            `/api/kualitas-udara?lat=${center[0]}&lon=${center[1]}`
          );
          if (!res.ok) {
            if (isMounted) {
              setPesan("Gagal memuat data kualitas udara dari server");
              setDataList([]);
              setLoading(false);
            }
            return;
          }
          const json = await res.json();
          if (isMounted) {
            const items: KualitasUdaraItem[] = json.data ?? [];
            setDataList(groupByLocation(items));
            if (items.length === 0 && json.pesan) {
              setPesan(json.pesan);
            }
            setLoading(false);
          }
        } catch {
          if (isMounted) {
            setPesan("Gagal menghubungi server kualitas udara");
            setDataList([]);
            setLoading(false);
          }
        }
        return;
      }

      try {
        const supabase = createSupabaseAnonClient();
        const { data, error } = await supabase
          .from("kualitas_udara")
          .select(
            "location_name, parameter, value, unit, lintang, bujur, waktu"
          )
          .order("waktu", { ascending: false });

        if (isMounted) {
          if (error) {
            setPesan("Gagal memuat data kualitas udara");
            setDataList([]);
          } else {
            setDataList(groupByLocation(data ?? []));
          }
          setLoading(false);
        }
      } catch {
        if (isMounted) {
          setPesan("Gagal menghubungi server kualitas udara");
          setDataList([]);
          setLoading(false);
        }
      }
    }

    fetchKualitasUdara();

    return () => {
      isMounted = false;
    };
  }, [hasCustomCenter, center]);

  return (
    <div className="relative h-full w-full" role="application" aria-label="Peta lokasi kualitas udara">
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80">
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <span className="text-sm text-muted">Memuat data kualitas udara...</span>
          </div>
        </div>
      )}

      <MapContainer
        center={center ?? YOGYAKARTA_CENTER}
        zoom={hasCustomCenter ? WILAYAH_ZOOM : 8}
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {!hasCustomCenter && <FocusCenter dataList={dataList} />}
        {dataList.map((loc, index) => {
          const pm25Value = loc.pm25?.value ?? 0;
          const color = getMarkerColor(pm25Value);
          return (
            <CircleMarker
              key={index}
              center={[loc.lintang, loc.bujur]}
              radius={10}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: 0.8,
                weight: 2,
              }}
            >
              <Popup>
                <div className="flex flex-col gap-1 min-w-[180px]">
                  <p className="font-medium text-sm border-b pb-1">{loc.location_name}</p>
                  {loc.pm25 && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs">PM2.5</span>
                      <span className="text-xs font-mono">
                        {loc.pm25.value} {loc.pm25.unit}
                      </span>
                    </div>
                  )}
                  {loc.pm10 && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs">PM10</span>
                      <span className="text-xs font-mono">
                        {loc.pm10.value} {loc.pm10.unit}
                      </span>
                    </div>
                  )}
                  {loc.others.map((o, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <span className="text-xs">{o.parameter}</span>
                      <span className="text-xs font-mono">
                        {o.value} {o.unit}
                      </span>
                    </div>
                  ))}
                  <p className="text-xs pt-1 border-t mt-1">
                    Status: <span className="font-medium">{getMarkerLabel(pm25Value)}</span>
                  </p>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
      <AccessibleAirQualityMarkers dataList={dataList} />

      {dataList.length > 0 && <Legend />}

      {!loading && pesan && (
        <div
          className="absolute rounded border border-border bg-background/90 p-3 text-sm text-warning"
          style={{ zIndex: 1000, bottom: 16, left: 16, right: 16 }}
        >
          {pesan}
        </div>
      )}
    </div>
  );
}
