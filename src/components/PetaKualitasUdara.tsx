"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
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

  // Skala kasar berdasarkan pedoman kualitas udara PM2.5 (µg/m3)
  if (normalizedParameter.includes("pm25") || normalizedParameter.includes("pm2.5")) {
    if (value > 55) return "#ef4444";
    if (value > 35) return "#f97316";
    if (value > 12) return "#eab308";
    return "#22c55e";
  }

  // Skala kasar berdasarkan pedoman kualitas udara PM10 (µg/m3)
  if (normalizedParameter.includes("pm10")) {
    if (value > 150) return "#ef4444";
    if (value > 100) return "#f97316";
    if (value > 50) return "#eab308";
    return "#22c55e";
  }

  return "#3b82f6";
}

export default function PetaKualitasUdara() {
  const [dataList, setDataList] = useState<KualitasUdara[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function fetchKualitasUdara() {
      const supabase = createSupabaseAnonClient();
      const { data, error } = await supabase
        .from("kualitas_udara")
        .select("location_name, parameter, value, unit, lintang, bujur, waktu")
        .order("waktu", { ascending: false });

      if (!error && data && isMounted) {
        setDataList(data);
      }
    }

    fetchKualitasUdara();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <MapContainer
      center={YOGYAKARTA_CENTER}
      zoom={8}
      scrollWheelZoom={true}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
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
              <p>Lokasi: {item.location_name}</p>
              <p>
                {item.parameter}: {item.value} {item.unit}
              </p>
              <p>Waktu: {new Date(item.waktu).toLocaleString("id-ID")}</p>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
