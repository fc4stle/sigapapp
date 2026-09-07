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

interface KualitasUdara {
  location_name: string;
  parameter: string;
  value: number;
  unit: string;
  lintang: number;
  bujur: number;
  waktu: string;
}

const YOGYAKARTA_CENTER: [number, number] = [-7.7956, 110.3695];

function getMarkerColor(parameter: string, value: number): string {
  const normalizedParameter = parameter.toLowerCase();

  if (
    normalizedParameter.includes("pm25") ||
    normalizedParameter.includes("pm2.5")
  ) {
    if (value > 55) return "#ef4444";
    if (value > 35) return "#f97316";
    if (value > 12) return "#eab308";
    return "#22c55e";
  }

  if (normalizedParameter.includes("pm10")) {
    if (value > 150) return "#ef4444";
    if (value > 100) return "#f97316";
    if (value > 50) return "#eab308";
    return "#22c55e";
  }

  return "#3b82f6";
}

function getMarkerLabel(parameter: string, value: number): string {
  const normalizedParameter = parameter.toLowerCase();
  if (
    normalizedParameter.includes("pm25") ||
    normalizedParameter.includes("pm2.5")
  ) {
    if (value > 55) return "Tidak sehat";
    if (value > 35) return "Sedang";
    if (value > 12) return "Baik";
    return "Sangat baik";
  }
  if (normalizedParameter.includes("pm10")) {
    if (value > 150) return "Tidak sehat";
    if (value > 100) return "Sedang";
    if (value > 50) return "Baik";
    return "Sangat baik";
  }
  return "N/A";
}

function FocusCenter({ dataList }: { dataList: KualitasUdara[] }) {
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
      style={{ position: 'absolute', bottom: '16px', left: '16px', zIndex: 1000 }}
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
  const [dataList, setDataList] = useState<KualitasUdara[]>([]);
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
            const items: KualitasUdara[] = json.data ?? [];
            setDataList(items);
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
            setDataList(data ?? []);
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
    <div className="relative h-full w-full">
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
        {dataList.map((item, index) => (
          <CircleMarker
            key={index}
            center={[item.lintang, item.bujur]}
            radius={8}
            pathOptions={{
              color: getMarkerColor(item.parameter, item.value),
              fillColor: getMarkerColor(item.parameter, item.value),
              fillOpacity: 0.7,
            }}
          >
            <Popup>
              <div className="flex flex-col gap-1">
                <p className="font-medium">{item.location_name}</p>
                <p>
                  {item.parameter}: {item.value} {item.unit}
                </p>
                <p>
                  Status: {getMarkerLabel(item.parameter, item.value)}
                </p>
                <p>Waktu: {new Date(item.waktu).toLocaleString("id-ID")}</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      {dataList.length > 0 && <Legend />}

      {!loading && pesan && (
        <div className="absolute rounded border border-border bg-background/90 p-3 text-sm text-warning" style={{ zIndex: 1000, bottom: 16, left: 16, right: 16 }}>
          {pesan}
        </div>
      )}
    </div>
  );
}
