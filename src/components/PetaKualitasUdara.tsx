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

export type SumberData = "OpenAQ" | "KLHK";

export interface KualitasUdaraItem {
  location_name: string;
  parameter: string;
  value: number;
  unit: string;
  lintang: number;
  bujur: number;
  waktu: string;
  sumber: SumberData;
  ispu_category?: string;
  ispu_val?: number;
}

interface LocationData {
  location_name: string;
  lintang: number;
  bujur: number;
  items: KualitasUdaraItem[];
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

function ispuCategoryColor(cat: string): string {
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
        items: [],
      };
      map.set(key, loc);
    }
    loc.items.push(item);
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
      <p className="font-medium mb-1">Keterangan warna</p>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: "#22c55e" }} />
          <span>Baik</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: "#eab308" }} />
          <span>Sedang</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: "#f97316" }} />
          <span>Tidak sehat</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: "#ef4444" }} />
          <span>Bahaya</span>
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-border">
        <p className="font-medium mb-1">Border</p>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full border-2 border-solid" style={{ borderColor: "#8B96A5" }} />
            <span>OpenAQ</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full border-2 border-dashed" style={{ borderColor: "#8B96A5" }} />
            <span>KLHK</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface Props {
  center?: [number, number];
  dataList?: KualitasUdaraItem[];
}

export default function PetaKualitasUdara({ center, dataList: externalDataList }: Props) {
  const [internalDataList, setInternalDataList] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [pesan, setPesan] = useState<string | null>(null);
  const hasCustomCenter = center !== undefined;

  useEffect(() => {
    if (externalDataList !== undefined) {
      setInternalDataList(groupByLocation(externalDataList));
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setPesan(null);

    async function fetchKualitasUdara() {
      if (hasCustomCenter && center) {
        try {
          const res = await fetch(
            `/api/kualitas-udara?lat=${center[0]}&lon=${center[1]}`,
          );
          if (!res.ok) {
            if (isMounted) {
              setPesan("Gagal memuat data kualitas udara dari server");
              setInternalDataList([]);
              setLoading(false);
            }
            return;
          }
          const json = await res.json();
          if (isMounted) {
            const items: KualitasUdaraItem[] = (json.data ?? []).map((item: {
              location_name: string;
              parameter: string;
              value: number;
              unit: string;
              lintang: number;
              bujur: number;
              waktu: string;
              sumber?: string;
            }): KualitasUdaraItem => ({
              location_name: item.location_name,
              parameter: item.parameter,
              value: item.value,
              unit: item.unit,
              lintang: item.lintang,
              bujur: item.bujur,
              waktu: item.waktu,
              sumber: (item.sumber as SumberData | undefined) ?? ("OpenAQ" as SumberData),
            }));
            setInternalDataList(groupByLocation(items));
            if (items.length === 0 && json.pesan) {
              setPesan(json.pesan);
            }
            setLoading(false);
          }
        } catch {
          if (isMounted) {
            setPesan("Gagal menghubungi server kualitas udara");
            setInternalDataList([]);
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
            "location_name, parameter, value, unit, lintang, bujur, waktu",
          )
          .order("waktu", { ascending: false });

        if (isMounted) {
          if (error) {
            setPesan("Gagal memuat data kualitas udara");
            setInternalDataList([]);
          } else {
            const items: KualitasUdaraItem[] = (data ?? []).map((item: {
              location_name: string;
              parameter: string;
              value: number;
              unit: string;
              lintang: number;
              bujur: number;
              waktu: string;
            }): KualitasUdaraItem => ({
              location_name: item.location_name,
              parameter: item.parameter,
              value: item.value,
              unit: item.unit,
              lintang: item.lintang,
              bujur: item.bujur,
              waktu: item.waktu,
              sumber: "OpenAQ" as SumberData,
            }));
            setInternalDataList(groupByLocation(items));
          }
          setLoading(false);
        }
      } catch {
        if (isMounted) {
          setPesan("Gagal menghubungi server kualitas udara");
          setInternalDataList([]);
          setLoading(false);
        }
      }
    }

    fetchKualitasUdara();

    return () => {
      isMounted = false;
    };
  }, [hasCustomCenter, center, externalDataList]);

  const dataList = externalDataList !== undefined ? groupByLocation(externalDataList) : internalDataList;

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
          const pm25Item = loc.items.find((i) => i.parameter.toLowerCase().includes("pm25") || i.parameter.toLowerCase().includes("pm2.5"));
          const primaryItem = pm25Item ?? loc.items[0];
          const isKlhk = primaryItem.sumber === "KLHK";
          const color = isKlhk
            ? ispuCategoryColor(primaryItem.ispu_category ?? "")
            : getMarkerColor(primaryItem.value);

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
                dashArray: isKlhk ? "4 4" : undefined,
              }}
            >
              <Popup>
                <div className="flex flex-col gap-1 min-w-[200px]">
                  <p className="font-medium text-sm border-b pb-1">{loc.location_name}</p>
                  {loc.items.map((item, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <span className="text-xs">{item.parameter}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-mono">
                          {item.value} {item.unit}
                        </span>
                        <span
                          className="text-[10px] px-1 rounded"
                          style={{
                            background: item.sumber === "KLHK" ? "#1e3a5f" : "#3d2e1f",
                            color: item.sumber === "KLHK" ? "#8ec5fc" : "#f5d78e",
                          }}
                        >
                          {item.sumber}
                        </span>
                      </div>
                    </div>
                  ))}
                  {isKlhk && primaryItem.ispu_category && (
                    <p className="text-xs pt-1 border-t mt-1">
                      ISPU: <span className="font-medium">{primaryItem.ispu_category}</span> ({primaryItem.ispu_val})
                    </p>
                  )}
                  {!isKlhk && (
                    <p className="text-xs pt-1 border-t mt-1">
                      Status: <span className="font-medium">{getMarkerLabel(primaryItem.value)}</span>
                    </p>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
        <AccessibleAirQualityMarkers dataList={dataList} />
      </MapContainer>

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
