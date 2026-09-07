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
const FOCUS_ZOOM = 8;

function getMarkerColor(magnitude: number): string {
  if (magnitude > 5) return "#ef4444";
  if (magnitude >= 4) return "#f97316";
  return "#eab308";
}

function FocusCenter({ gempaList }: { gempaList: Gempa[] }) {
  const map = useMap();

  useEffect(() => {
    if (gempaList.length === 0) return;

    const latest = gempaList[0];
    map.setView([latest.lintang, latest.bujur], FOCUS_ZOOM, {
      animate: true,
      duration: 1,
    });
  }, [gempaList, map]);

  return null;
}

const WILAYAH_ZOOM = 10;

interface RipplePosition {
  x: number;
  y: number;
  mag: number;
  key: string;
}

function RippleMarkers({ gempaList }: { gempaList: Gempa[] }) {
  const map = useMap();
  const [positions, setPositions] = useState<RipplePosition[]>([]);

  useEffect(() => {
    const update = () => {
      const pos = gempaList
        .filter((g) => g.magnitude >= 5)
        .map((g) => {
          const point = map.latLngToContainerPoint([g.lintang, g.bujur]);
          return {
            x: point.x,
            y: point.y,
            mag: g.magnitude,
            key: `${g.lintang}_${g.bujur}`,
          };
        });
      setPositions(pos);
    };
    update();
    map.on("move zoom", update);
    return () => {
      map.off("move zoom", update);
    };
  }, [gempaList, map]);

  return (
    <>
      {positions.map((p) => (
        <div
          key={p.key}
          className="absolute pointer-events-none"
          style={{ left: p.x - 20, top: p.y - 20, width: 40, height: 40, zIndex: 650 }}
        >
          <div className="w-full h-full rounded-full border-2 border-red-500 ripple-anim" />
        </div>
      ))}
    </>
  );
}

export default function PetaGempa({
  center,
}: {
  center?: [number, number];
}) {
  const [gempaList, setGempaList] = useState<Gempa[]>([]);
  const hasCustomCenter = center !== undefined;

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
      center={center ?? YOGYAKARTA_CENTER}
      zoom={hasCustomCenter ? WILAYAH_ZOOM : 8}
      scrollWheelZoom={true}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <div
        className="absolute inset-0 pointer-events-none grid-map-bg"
        style={{ zIndex: 400 }}
      />
      {!hasCustomCenter && <FocusCenter gempaList={gempaList} />}
      <RippleMarkers gempaList={gempaList} />
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
