"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { createSupabaseAnonClient } from "@/lib/supabase-anon";

interface Gempa {
  magnitude: number;
  kedalaman: string;
  wilayah: string;
  tanggal: string;
  jam: string;
  lintang: number;
  bujur: number;
}

const YOGYAKARTA_CENTER: [number, number] = [-7.7956, 110.3695];

function getMarkerColor(magnitude: number): string {
  if (magnitude > 5) return "#ef4444";
  if (magnitude >= 4) return "#f97316";
  return "#eab308";
}

export default function PetaGempa() {
  const [gempaList, setGempaList] = useState<Gempa[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function fetchGempa() {
      const supabase = createSupabaseAnonClient();
      const { data, error } = await supabase
        .from("gempa")
        .select("magnitude, kedalaman, wilayah, tanggal, jam, lintang, bujur")
        .order("date_time", { ascending: false });

      if (!error && data && isMounted) {
        setGempaList(data);
      }
    }

    fetchGempa();

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
      {gempaList.map((gempa, index) => (
        <CircleMarker
          key={index}
          center={[gempa.lintang, gempa.bujur]}
          radius={gempa.magnitude * 2}
          pathOptions={{
            color: getMarkerColor(gempa.magnitude),
            fillColor: getMarkerColor(gempa.magnitude),
            fillOpacity: 0.7,
          }}
        >
          <Popup>
            <div className="flex flex-col gap-1">
              <p>Magnitude: {gempa.magnitude}</p>
              <p>Kedalaman: {gempa.kedalaman}</p>
              <p>Wilayah: {gempa.wilayah}</p>
              <p>
                Waktu: {gempa.tanggal}, {gempa.jam}
              </p>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
